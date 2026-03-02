import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

function getSessionId(): string {
  let id = sessionStorage.getItem('wswe_session_id');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('wswe_session_id', id);
  }
  return id;
}

const socket: Socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  auth: { sessionId: getSessionId() },
});

export default socket;
