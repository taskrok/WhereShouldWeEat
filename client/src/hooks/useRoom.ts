import { useState, useEffect, useCallback } from 'react';
import socket from '../socket';

type RoomPhase = 'home' | 'lobby' | 'filters' | 'waiting' | 'swiping' | 'bracket' | 'results' | 'no_match' | 'no_results';

export function useRoom(onRestartedCallback?: () => void) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [phase, setPhase] = useState<RoomPhase>('home');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(socket.connected);

  const createRoom = useCallback((lat: number, lng: number) => {
    setError(null);
    socket.emit('room:create', { lat, lng });
  }, []);

  const joinRoom = useCallback((code: string, lat: number, lng: number) => {
    setError(null);
    socket.emit('room:join', { code: code.toUpperCase().trim(), lat, lng });
  }, []);

  const leaveRoom = useCallback(() => {
    socket.emit('room:leave');
    setRoomCode(null);
    setPhase('home');
    setError(null);
  }, []);

  const restartRoom = useCallback(() => {
    socket.emit('room:restart');
  }, []);

  useEffect(() => {
    const onCreated = ({ code }: { code: string }) => {
      setRoomCode(code);
      setPhase('lobby');
    };

    const onJoined = ({ code }: { code: string }) => {
      setRoomCode(code);
      setPhase('filters');
    };

    const onPartnerJoined = () => {
      setPhase('filters');
    };

    const onError = ({ message }: { message: string }) => {
      setError(message);
    };

    const onPartnerLeft = () => {
      setError('Your partner left the room');
      setPhase('home');
      setRoomCode(null);
      onRestartedCallback?.();
    };

    const onRestarted = () => {
      setPhase('filters');
      setError(null);
      onRestartedCallback?.();
    };

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('room:created', onCreated);
    socket.on('room:joined', onJoined);
    socket.on('room:partner_joined', onPartnerJoined);
    socket.on('room:error', onError);
    socket.on('room:partner_left', onPartnerLeft);
    socket.on('room:restarted', onRestarted);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('room:created', onCreated);
      socket.off('room:joined', onJoined);
      socket.off('room:partner_joined', onPartnerJoined);
      socket.off('room:error', onError);
      socket.off('room:partner_left', onPartnerLeft);
      socket.off('room:restarted', onRestarted);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [onRestartedCallback]);

  return { roomCode, phase, setPhase, error, setError, connected, createRoom, joinRoom, leaveRoom, restartRoom };
}
