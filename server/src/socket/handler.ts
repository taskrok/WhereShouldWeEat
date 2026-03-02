import type { Server, Socket } from 'socket.io';
import { createRoom, joinRoom, getRoomBySocket, removeUserFromRoom, startGame, registerSession, tryReconnect, startGracePeriod } from './roomManager.js';
import { recordSwipe, checkAllSwiped, checkAllDone, getAllMatches, getSwipeProgress } from './matchDetector.js';
import { initBracket, getCurrentMatchup, recordBracketVote, allVoted, resolveMatchup, advanceToNext, getBracketVoteProgress } from './bracketManager.js';
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
    // 2+ matches — show all matches first, let group decide if they want a bracket
    room.matchList = matches;
    io.to(room.code).emit('swipe:results', { matches });
    console.log(`Room ${room.code}: ${matches.length} matches — showing list`);
  }
}

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const sessionId = socket.handshake.auth?.sessionId as string | undefined;
    console.log(`Connected: ${socket.id} (session: ${sessionId ?? 'none'})`);

    // Register session and attempt reconnection
    if (sessionId) {
      registerSession(sessionId, socket.id);

      const room = tryReconnect(sessionId, socket.id);
      if (room) {
        socket.join(room.code);
        // Tell the client they're back in their room
        socket.emit('room:reconnected', {
          code: room.code,
          status: room.status,
          playerCount: Object.keys(room.users).length,
          isCreator: room.users[socket.id]?.role === 'creator',
          restaurants: room.restaurants,
          limitedResults: false,
        });
      }
    }

    socket.on('room:create', ({ lat, lng }: { lat: number; lng: number }) => {
      const room = createRoom(socket.id, lat, lng);
      socket.join(room.code);
      socket.emit('room:created', { code: room.code });
      console.log(`Room ${room.code} created by ${socket.id}`);
    });

    socket.on('room:join', ({ code, lat, lng }: { code: string; lat: number; lng: number }) => {
      const room = joinRoom(socket.id, code, lat, lng);
      if (!room) {
        socket.emit('room:error', { message: 'Room not found, full, or already started' });
        return;
      }
      socket.join(room.code);
      const playerCount = Object.keys(room.users).length;
      socket.emit('room:joined', { code: room.code });
      io.to(room.code).emit('room:player_joined', { playerCount });
      console.log(`${socket.id} joined room ${room.code} (${playerCount} players)`);
    });

    socket.on('room:start', () => {
      const room = startGame(socket.id);
      if (!room) return;
      const playerCount = Object.keys(room.users).length;
      io.to(room.code).emit('room:game_started', { playerCount });
      console.log(`Room ${room.code}: game started with ${playerCount} players`);
    });

    socket.on('filters:submit', async ({ filters }: { filters: UserFilters }) => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;

      room.filters[socket.id] = filters;
      room.lastActivity = Date.now();

      // Check if all current users have submitted
      const currentUserIds = Object.keys(room.users);
      const allSubmitted = currentUserIds.every(id => room.filters[id] != null);

      if (!allSubmitted) {
        const done = currentUserIds.filter(id => room.filters[id] != null).length;
        io.to(room.code).emit('filters:progress', { done, total: currentUserIds.length });
        return;
      }

      // All submitted — merge filters
      const allFilters = currentUserIds
        .map(id => room.filters[id])
        .filter((f): f is UserFilters => f !== null);
      const merged = mergeFilters(allFilters);

      console.log(`Room ${room.code}: ${allFilters.length} filter sets merged:`, JSON.stringify(merged));

      try {
        const { restaurants, limitedResults } = await searchRestaurants(
          room.location!.lat,
          room.location!.lng,
          merged
        );

        if (restaurants.length === 0) {
          io.to(room.code).emit('filters:no_results', {
            message: "No restaurants found matching the group's preferences. Try broadening your filters!",
          });
          for (const id of Object.keys(room.filters)) {
            room.filters[id] = null;
          }
          room.status = 'filtering';
          return;
        }

        room.restaurants = restaurants;
        room.status = 'swiping';
        io.to(room.code).emit('filters:all_ready', { restaurants, limitedResults });
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
        const progress = getSwipeProgress(room);
        io.to(room.code).emit('swipe:progress', progress);
      }

      if (checkAllDone(room)) {
        emitResults(io, room);
      }
    });

    socket.on('swipe:done', () => {
      const room = getRoomBySocket(socket.id);
      if (!room || room.status !== 'swiping') return;

      if (!room.doneUsers) room.doneUsers = new Set();
      room.doneUsers.add(socket.id);
      const progress = getSwipeProgress(room);
      io.to(room.code).emit('swipe:progress', progress);

      if (checkAllDone(room)) {
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

      if (!allVoted(room.bracket, userIds)) {
        const progress = getBracketVoteProgress(room.bracket, userIds);
        io.to(room.code).emit('bracket:vote_progress', progress);
        console.log(`Room ${room.code}: ${socket.id} voted in bracket (${progress.done}/${progress.total})`);
        return;
      }

      // All voted — resolve
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

    // Any player can trigger the bracket from the results list
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

      // Reset filters/swipes for current users
      const currentUserIds = Object.keys(room.users);
      room.filters = {};
      room.swipes = {};
      for (const id of currentUserIds) {
        room.filters[id] = null;
        room.swipes[id] = {};
      }
      room.restaurants = [];
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
      // Explicit leave — no grace period
      actuallyRemoveUser(io, socket);
    });

    socket.on('disconnect', () => {
      console.log(`Disconnected: ${socket.id}`);
      // Start grace period — don't remove yet
      const started = startGracePeriod(socket.id, () => {
        // Grace period expired — actually remove
        actuallyRemoveUser(io, socket);
      });
      if (!started) {
        // No room to grace — nothing to do
      }
    });
  });
}

function actuallyRemoveUser(io: Server, socket: Socket): void {
  const result = removeUserFromRoom(socket.id);
  if (!result) return;

  const { room, remainingIds, wasResetToLobby } = result;
  const playerCount = remainingIds.length;

  // Notify remaining players
  io.to(room.code).emit('room:player_left', { playerCount });

  // If a new creator was promoted, notify them
  if (remainingIds.length > 0) {
    const newCreatorId = remainingIds.find(id => room.users[id]?.role === 'creator');
    if (newCreatorId) {
      io.to(newCreatorId).emit('room:promoted', {});
    }
  }

  // If reset to lobby due to < 2 players during active game
  if (wasResetToLobby) {
    io.to(room.code).emit('room:reset_to_lobby', {});
  }
}
