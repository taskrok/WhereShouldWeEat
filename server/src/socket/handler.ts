import type { Server, Socket } from 'socket.io';
import { createRoom, joinRoom, getRoomBySocket, removeUserFromRoom } from './roomManager.js';
import { recordSwipe, checkAllSwiped, checkBothDone, getAllMatches } from './matchDetector.js';
import { initBracket, getCurrentMatchup, recordBracketVote, bothVoted, resolveMatchup, advanceToNext } from './bracketManager.js';
import { mergeFilters } from '../utils/filterMerge.js';
import { searchRestaurants } from '../services/googlePlaces.js';
import type { UserFilters } from '../types.js';

function emitResults(io: Server, room: any): void {
  // Guard: only emit once
  if (room.status !== 'swiping') return;
  room.status = 'matched';

  const matches = getAllMatches(room);
  if (matches.length === 0) {
    io.to(room.code).emit('swipe:no_match', {});
    console.log(`Room ${room.code}: No matches found`);
  } else if (matches.length === 1) {
    io.to(room.code).emit('swipe:results', { matches });
    console.log(`Room ${room.code}: 1 match — skipping bracket`);
  } else {
    // 2+ matches — show all matches first, let partners decide if they want a bracket
    room.matchList = matches;
    io.to(room.code).emit('swipe:results', { matches });
    console.log(`Room ${room.code}: ${matches.length} matches — showing list`);
  }
}

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Connected: ${socket.id}`);

    socket.on('room:create', ({ lat, lng }: { lat: number; lng: number }) => {
      const room = createRoom(socket.id, lat, lng);
      socket.join(room.code);
      socket.emit('room:created', { code: room.code });
      console.log(`Room ${room.code} created by ${socket.id}`);
    });

    socket.on('room:join', ({ code, lat, lng }: { code: string; lat: number; lng: number }) => {
      const room = joinRoom(socket.id, code, lat, lng);
      if (!room) {
        socket.emit('room:error', { message: 'Room not found or already full' });
        return;
      }
      socket.join(room.code);
      socket.emit('room:joined', { code: room.code });
      socket.to(room.code).emit('room:partner_joined', {});
      console.log(`${socket.id} joined room ${room.code}`);
    });

    socket.on('filters:submit', async ({ filters }: { filters: UserFilters }) => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;

      room.filters[socket.id] = filters;
      room.lastActivity = Date.now();

      const filterEntries = Object.values(room.filters);
      const bothSubmitted = filterEntries.length === 2 && filterEntries.every(f => f !== null);

      if (!bothSubmitted) {
        socket.to(room.code).emit('filters:partner_ready', {});
        return;
      }

      const [filtersA, filtersB] = Object.values(room.filters) as UserFilters[];
      const merged = mergeFilters(filtersA, filtersB);

      console.log(`Room ${room.code}: Partner A filters:`, JSON.stringify(filtersA));
      console.log(`Room ${room.code}: Partner B filters:`, JSON.stringify(filtersB));
      console.log(`Room ${room.code}: Merged:`, JSON.stringify(merged));

      try {
        const { restaurants, limitedResults } = await searchRestaurants(
          room.location!.lat,
          room.location!.lng,
          merged
        );

        if (restaurants.length === 0) {
          io.to(room.code).emit('filters:no_results', {
            message: 'No restaurants found matching both your preferences. Try broadening your filters!',
          });
          for (const id of Object.keys(room.filters)) {
            room.filters[id] = null;
          }
          room.status = 'filtering';
          return;
        }

        room.restaurants = restaurants;
        room.status = 'swiping';
        io.to(room.code).emit('filters:both_ready', { restaurants, limitedResults });
        console.log(`Room ${room.code}: ${restaurants.length} restaurants found${limitedResults ? ' (limited — many places closed)' : ''}`);
      } catch (err) {
        console.error('Failed to fetch restaurants:', err);
        io.to(room.code).emit('room:error', { message: 'Failed to fetch restaurants. Please try again.' });
      }
    });

    socket.on('swipe', ({ placeId, direction }: { placeId: string; direction: 'left' | 'right' }) => {
      const room = getRoomBySocket(socket.id);
      if (!room || room.status !== 'swiping') return;

      recordSwipe(room, socket.id, placeId, direction === 'right');

      if (checkAllSwiped(room, socket.id)) {
        if (!room.doneUsers) room.doneUsers = new Set();
        room.doneUsers.add(socket.id);
        socket.to(room.code).emit('swipe:partner_waiting', {});
      }

      if (checkBothDone(room)) {
        emitResults(io, room);
      }
    });

    socket.on('swipe:done', () => {
      const room = getRoomBySocket(socket.id);
      if (!room || room.status !== 'swiping') return;

      if (!room.doneUsers) room.doneUsers = new Set();
      room.doneUsers.add(socket.id);
      socket.to(room.code).emit('swipe:partner_waiting', {});

      if (checkBothDone(room)) {
        emitResults(io, room);
      }
    });

    // --- Bracket voting ---
    socket.on('bracket:vote', ({ placeId }: { placeId: string }) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.bracket) return;

      recordBracketVote(room.bracket, socket.id, placeId);
      room.lastActivity = Date.now();

      const userIds = Object.keys(room.users);

      if (!bothVoted(room.bracket, userIds)) {
        socket.to(room.code).emit('bracket:partner_voted', {});
        console.log(`Room ${room.code}: ${socket.id} voted in bracket`);
        return;
      }

      // Both voted — resolve
      const result = resolveMatchup(room.bracket, userIds);
      console.log(`Room ${room.code}: Bracket matchup resolved — agreed=${result.agreed}, coinFlip=${result.coinFlip}, bothAdvance=${result.bothAdvance}`);

      const advance = advanceToNext(room.bracket);

      if (advance.done) {
        // Bracket complete — emit final winner as results
        io.to(room.code).emit('bracket:result', {
          winner: result.winner,
          agreed: result.agreed,
          coinFlip: result.coinFlip,
          bothAdvance: result.bothAdvance,
          done: true,
        });
        // After a delay, send the final winner through the results flow
        setTimeout(() => {
          io.to(room.code).emit('swipe:results', { matches: [advance.winner!] });
        }, 3000);
        console.log(`Room ${room.code}: Bracket winner — ${advance.winner!.name}`);
      } else {
        io.to(room.code).emit('bracket:result', {
          winner: result.winner,
          agreed: result.agreed,
          coinFlip: result.coinFlip,
          bothAdvance: result.bothAdvance,
          done: false,
          nextMatchup: advance.nextMatchup,
          round: advance.round,
          remaining: advance.remaining,
          newRound: advance.newRound,
        });
      }
    });

    // Either partner can trigger the bracket from the results list
    socket.on('bracket:request', () => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.matchList || room.matchList.length < 2) return;
      if (room.bracket) return; // Already started

      const bracket = initBracket(room.matchList);
      room.bracket = bracket;
      const matchup = getCurrentMatchup(bracket)!;
      io.to(room.code).emit('bracket:start', {
        matchup: { a: matchup.a, b: matchup.b },
        round: bracket.round,
        remaining: bracket.pool.length,
        totalMatches: room.matchList.length,
      });
      console.log(`Room ${room.code}: Bracket started by ${socket.id}`);
    });

    socket.on('room:restart', () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;

      for (const id of Object.keys(room.filters)) {
        room.filters[id] = null;
      }
      room.restaurants = [];
      for (const id of Object.keys(room.swipes)) {
        room.swipes[id] = {};
      }
      room.status = 'filtering';
      room.matchedRestaurant = null;
      room.doneUsers = undefined;
      room.bracket = undefined;
      room.matchList = undefined;
      room.lastActivity = Date.now();

      io.to(room.code).emit('room:restarted', {});
      console.log(`Room ${room.code}: restarted`);
    });

    socket.on('room:leave', () => {
      handleDisconnect(socket);
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket);
      console.log(`Disconnected: ${socket.id}`);
    });
  });
}

function handleDisconnect(socket: Socket): void {
  const result = removeUserFromRoom(socket.id);
  if (result) {
    socket.to(result.room.code).emit('room:partner_left', {});
  }
}
