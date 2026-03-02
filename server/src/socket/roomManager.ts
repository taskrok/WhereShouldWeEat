import type { Room, RoomUser } from '../types.js';
import { generateRoomCode, releaseRoomCode } from '../utils/roomCode.js';

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

export function createRoom(socketId: string, lat: number, lng: number): Room {
  const code = generateRoomCode();
  const room: Room = {
    code,
    users: {
      [socketId]: { socketId, role: 'creator', location: { lat, lng } },
    },
    filters: { [socketId]: null },
    restaurants: [],
    swipes: { [socketId]: {} },
    status: 'waiting',
    matchedRestaurant: null,
    location: { lat, lng },
    lastActivity: Date.now(),
  };
  rooms.set(code, room);
  socketToRoom.set(socketId, code);
  return room;
}

export function joinRoom(socketId: string, code: string, lat?: number, lng?: number): Room | null {
  const normalizedCode = code.toUpperCase().trim();
  const room = rooms.get(normalizedCode);
  if (!room) return null;
  if (Object.keys(room.users).length >= 2) return null;

  const joinerLocation = (lat != null && lng != null) ? { lat, lng } : room.location!;
  room.users[socketId] = { socketId, role: 'joiner', location: joinerLocation };
  room.filters[socketId] = null;
  room.swipes[socketId] = {};
  room.status = 'filtering';
  room.lastActivity = Date.now();
  socketToRoom.set(socketId, normalizedCode);

  // Update room location to midpoint between both partners
  const users = Object.values(room.users);
  if (users.length === 2) {
    const locA = users[0].location;
    const locB = users[1].location;
    room.location = {
      lat: (locA.lat + locB.lat) / 2,
      lng: (locA.lng + locB.lng) / 2,
    };
    console.log(`Room ${normalizedCode}: midpoint = ${room.location.lat.toFixed(4)}, ${room.location.lng.toFixed(4)}`);
  }

  return room;
}

export function getRoom(code: string): Room | null {
  return rooms.get(code.toUpperCase().trim()) || null;
}

export function getRoomBySocket(socketId: string): Room | null {
  const code = socketToRoom.get(socketId);
  if (!code) return null;
  return rooms.get(code) || null;
}

export function removeUserFromRoom(socketId: string): { room: Room; otherSocketId: string | null } | null {
  const code = socketToRoom.get(socketId);
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) return null;

  const otherSocketId = Object.keys(room.users).find(id => id !== socketId) || null;

  delete room.users[socketId];
  delete room.filters[socketId];
  delete room.swipes[socketId];
  socketToRoom.delete(socketId);

  // If room is empty, clean it up
  if (Object.keys(room.users).length === 0) {
    rooms.delete(code);
    releaseRoomCode(code);
    return null;
  }

  room.lastActivity = Date.now();
  return { room, otherSocketId };
}

// Clean up stale rooms every 5 minutes
setInterval(() => {
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > THIRTY_MINUTES) {
      for (const socketId of Object.keys(room.users)) {
        socketToRoom.delete(socketId);
      }
      rooms.delete(code);
      releaseRoomCode(code);
    }
  }
}, 5 * 60 * 1000);
