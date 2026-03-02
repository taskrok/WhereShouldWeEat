import type { Server, Socket } from 'socket.io';
import { createRoom, joinRoom, getRoomBySocket, removeUserFromRoom } from './roomManager.js';
import { recordSwipe, checkAllSwiped, checkBothDone, getAllMatches } from './matchDetector.js';
import { mergeFilters } from '../utils/filterMerge.js';
import { searchRestaurants } from '../services/googlePlaces.js';
import type { UserFilters } from '../types.js';

function emitResults(io: Server, room: any): void {
  // Guard: only emit once
  if (room.status !== 'swiping') return;
  room.status = 'matched';

  const matches = getAllMatches(room);
  if (matches.length > 0) {
    io.to(room.code).emit('swipe:results', { matches });
    console.log(`Room ${room.code}: ${matches.length} match(es)!`);
  } else {
    io.to(room.code).emit('swipe:no_match', {});
    console.log(`Room ${room.code}: No matches found`);
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
      const room = joinRoom(socket.id, code);
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

      try {
        const restaurants = await searchRestaurants(
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
        io.to(room.code).emit('filters:both_ready', { restaurants });
        console.log(`Room ${room.code}: ${restaurants.length} restaurants found`);
      } catch (err) {
        console.error('Failed to fetch restaurants:', err);
        io.to(room.code).emit('room:error', { message: 'Failed to fetch restaurants. Please try again.' });
      }
    });

    socket.on('swipe', ({ placeId, direction }: { placeId: string; direction: 'left' | 'right' }) => {
      const room = getRoomBySocket(socket.id);
      if (!room || room.status !== 'swiping') return;

      recordSwipe(room, socket.id, placeId, direction === 'right');
      console.log(`Room ${room.code}: ${socket.id} swiped ${direction} on ${placeId} (${Object.keys(room.swipes[socket.id] || {}).length}/${room.restaurants.length})`);

      // Check if THIS user is done after every swipe
      if (checkAllSwiped(room, socket.id)) {
        // Mark this user as done
        if (!room.doneUsers) room.doneUsers = new Set();
        room.doneUsers.add(socket.id);
        socket.to(room.code).emit('swipe:partner_waiting', {});
        console.log(`Room ${room.code}: ${socket.id} finished swiping (via swipe count)`);
      }

      // Check if both are done (via swipe counts OR done flags)
      if (checkBothDone(room)) {
        console.log(`Room ${room.code}: Both done — emitting results`);
        emitResults(io, room);
      }
    });

    socket.on('swipe:done', () => {
      const room = getRoomBySocket(socket.id);
      if (!room || room.status !== 'swiping') return;

      // Mark this user as explicitly done
      if (!room.doneUsers) room.doneUsers = new Set();
      room.doneUsers.add(socket.id);
      socket.to(room.code).emit('swipe:partner_waiting', {});
      console.log(`Room ${room.code}: ${socket.id} sent swipe:done (explicit)`);

      // Check if both are done
      if (checkBothDone(room)) {
        console.log(`Room ${room.code}: Both done — emitting results`);
        emitResults(io, room);
      }
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
