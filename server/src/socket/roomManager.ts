import type { Room, RoomUser } from '../types.js';
import { generateRoomCode, releaseRoomCode } from '../utils/roomCode.js';

const GRACE_PERIOD_MS = 30_000; // 30 seconds to reconnect

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

// Session tracking for reconnection grace period
const sessionToSocket = new Map<string, string>();       // sessionId → current socketId
const socketToSession = new Map<string, string>();       // socketId → sessionId
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>(); // sessionId → timer

export function registerSession(sessionId: string, socketId: string): void {
  // If this session already has a socket mapping, clean up the old one
  const oldSocketId = sessionToSocket.get(sessionId);
  if (oldSocketId && oldSocketId !== socketId) {
    socketToSession.delete(oldSocketId);
  }
  sessionToSocket.set(sessionId, socketId);
  socketToSession.set(socketId, sessionId);
}

export function getSessionBySocket(socketId: string): string | undefined {
  return socketToSession.get(socketId);
}

/**
 * Try to reconnect a session to a room. Returns the room if successful.
 * Swaps the old socket ID for the new one in all data structures.
 */
export function tryReconnect(sessionId: string, newSocketId: string): Room | null {
  // Cancel any pending disconnect timer
  const timer = disconnectTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(sessionId);
  }

  const oldSocketId = sessionToSocket.get(sessionId);
  if (!oldSocketId || oldSocketId === newSocketId) return null;

  const code = socketToRoom.get(oldSocketId);
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) return null;

  // Swap socket ID in room.users
  const user = room.users[oldSocketId];
  if (!user) return null;

  delete room.users[oldSocketId];
  user.socketId = newSocketId;
  room.users[newSocketId] = user;

  // Swap in filters
  if (oldSocketId in room.filters) {
    room.filters[newSocketId] = room.filters[oldSocketId];
    delete room.filters[oldSocketId];
  }

  // Swap in swipes
  if (oldSocketId in room.swipes) {
    room.swipes[newSocketId] = room.swipes[oldSocketId];
    delete room.swipes[oldSocketId];
  }

  // Swap in doneUsers
  if (room.doneUsers?.has(oldSocketId)) {
    room.doneUsers.delete(oldSocketId);
    room.doneUsers.add(newSocketId);
  }

  // Swap in bracket votes
  if (room.bracket && oldSocketId in room.bracket.votes) {
    room.bracket.votes[newSocketId] = room.bracket.votes[oldSocketId];
    delete room.bracket.votes[oldSocketId];
  }

  // Update maps
  socketToRoom.delete(oldSocketId);
  socketToRoom.set(newSocketId, code);
  registerSession(sessionId, newSocketId);

  room.lastActivity = Date.now();
  console.log(`Session ${sessionId}: reconnected (${oldSocketId} → ${newSocketId}) in room ${code}`);
  return room;
}

/**
 * Start a grace period for a disconnected socket.
 * Returns true if grace period started (caller should NOT emit leave events yet).
 * Returns false if user was not in a room.
 */
export function startGracePeriod(socketId: string, onExpire: () => void): boolean {
  const code = socketToRoom.get(socketId);
  if (!code) return false;

  const sessionId = socketToSession.get(socketId);
  if (!sessionId) {
    // No session — remove immediately (shouldn't happen normally)
    return false;
  }

  // Start timer — if they don't reconnect in time, actually remove them
  const timer = setTimeout(() => {
    disconnectTimers.delete(sessionId);
    console.log(`Session ${sessionId}: grace period expired, removing from room`);
    onExpire();
  }, GRACE_PERIOD_MS);

  disconnectTimers.set(sessionId, timer);
  console.log(`Session ${sessionId}: grace period started (${GRACE_PERIOD_MS / 1000}s)`);
  return true;
}

export function createRoom(socketId: string, lat: number, lng: number): Room {
  const code = generateRoomCode();
  const room: Room = {
    code,
    users: {
      [socketId]: { socketId, role: 'creator', location: { lat, lng } },
    },
    filters: {},
    restaurants: [],
    swipes: {},
    status: 'lobby',
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
  if (Object.keys(room.users).length >= 15) return null;
  if (room.status !== 'lobby') return null;

  const joinerLocation = (lat != null && lng != null) ? { lat, lng } : room.location!;
  room.users[socketId] = { socketId, role: 'player', location: joinerLocation };
  room.lastActivity = Date.now();
  socketToRoom.set(socketId, normalizedCode);

  // Recalculate centroid from all users
  recalculateCentroid(room);

  return room;
}

export function startGame(socketId: string): Room | null {
  const code = socketToRoom.get(socketId);
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) return null;

  // Only the creator can start
  if (room.users[socketId]?.role !== 'creator') return null;
  if (room.status !== 'lobby') return null;
  if (Object.keys(room.users).length < 2) return null;

  room.status = 'filtering';
  // Initialize filters and swipes for every current user
  for (const id of Object.keys(room.users)) {
    room.filters[id] = null;
    room.swipes[id] = {};
  }
  room.lastActivity = Date.now();
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

export function removeUserFromRoom(socketId: string): { room: Room; remainingIds: string[]; wasResetToLobby: boolean; wasCreator: boolean; wasLobby: boolean } | null {
  const code = socketToRoom.get(socketId);
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) return null;

  const wasCreator = room.users[socketId]?.role === 'creator';
  const wasLobby = room.status === 'lobby';

  // Remove from users only — keep filters/swipes/doneUsers intact
  delete room.users[socketId];
  socketToRoom.delete(socketId);

  // Clean up session maps
  const sessionId = socketToSession.get(socketId);
  if (sessionId) {
    sessionToSocket.delete(sessionId);
    socketToSession.delete(socketId);
    const timer = disconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      disconnectTimers.delete(sessionId);
    }
  }

  const remainingIds = Object.keys(room.users);

  // If room is empty, clean it up
  if (remainingIds.length === 0) {
    rooms.delete(code);
    releaseRoomCode(code);
    return null;
  }

  // Promote another player to creator if the creator left
  if (wasCreator && remainingIds.length > 0) {
    room.users[remainingIds[0]].role = 'creator';
  }

  // If fewer than 2 remain during active game, reset to lobby
  let wasResetToLobby = false;
  if (remainingIds.length < 2 && room.status !== 'lobby') {
    room.status = 'lobby';
    room.restaurants = [];
    room.matchedRestaurant = null;
    room.doneUsers = undefined;
    room.bracket = undefined;
    room.matchList = undefined;
    room.filters = {};
    room.swipes = {};
    wasResetToLobby = true;
  }

  // Recalculate centroid from remaining users
  recalculateCentroid(room);

  room.lastActivity = Date.now();
  return { room, remainingIds, wasResetToLobby, wasCreator, wasLobby };
}

export function disbandRoom(room: Room): void {
  for (const socketId of Object.keys(room.users)) {
    socketToRoom.delete(socketId);
    const sid = socketToSession.get(socketId);
    if (sid) {
      sessionToSocket.delete(sid);
      socketToSession.delete(socketId);
      const timer = disconnectTimers.get(sid);
      if (timer) {
        clearTimeout(timer);
        disconnectTimers.delete(sid);
      }
    }
  }
  rooms.delete(room.code);
  releaseRoomCode(room.code);
}

function recalculateCentroid(room: Room): void {
  const users = Object.values(room.users);
  if (users.length === 0) return;
  const latSum = users.reduce((sum, u) => sum + u.location.lat, 0);
  const lngSum = users.reduce((sum, u) => sum + u.location.lng, 0);
  room.location = {
    lat: latSum / users.length,
    lng: lngSum / users.length,
  };
}

// Clean up stale rooms every 5 minutes
setInterval(() => {
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > THIRTY_MINUTES) {
      for (const socketId of Object.keys(room.users)) {
        socketToRoom.delete(socketId);
        const sid = socketToSession.get(socketId);
        if (sid) {
          sessionToSocket.delete(sid);
          socketToSession.delete(socketId);
        }
      }
      rooms.delete(code);
      releaseRoomCode(code);
    }
  }
}, 5 * 60 * 1000);
