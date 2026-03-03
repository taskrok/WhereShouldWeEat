import { useState, useEffect, useCallback } from 'react';
import socket from '../socket';

type RoomPhase = 'home' | 'lobby' | 'filters' | 'waiting' | 'swiping' | 'bracket' | 'results' | 'no_match' | 'no_results';

export function useRoom(onRestartedCallback?: () => void) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [phase, setPhase] = useState<RoomPhase>('home');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [playerCount, setPlayerCount] = useState(1);
  const [isCreator, setIsCreator] = useState(false);

  const createRoom = useCallback((lat: number, lng: number) => {
    setError(null);
    setIsCreator(true);
    socket.emit('room:create', { lat, lng });
  }, []);

  const joinRoom = useCallback((code: string, lat: number, lng: number) => {
    setError(null);
    setIsCreator(false);
    socket.emit('room:join', { code: code.toUpperCase().trim(), lat, lng });
  }, []);

  const leaveRoom = useCallback(() => {
    socket.emit('room:leave');
    setRoomCode(null);
    setPhase('home');
    setError(null);
    setPlayerCount(1);
    setIsCreator(false);
  }, []);

  const restartRoom = useCallback(() => {
    socket.emit('room:restart');
  }, []);

  const startGame = useCallback(() => {
    socket.emit('room:start');
  }, []);

  useEffect(() => {
    const onCreated = ({ code }: { code: string }) => {
      setRoomCode(code);
      setPlayerCount(1);
      setPhase('lobby');
    };

    const onJoined = ({ code }: { code: string }) => {
      setRoomCode(code);
      setPhase('lobby');
    };

    const onPlayerJoined = ({ playerCount: count }: { playerCount: number }) => {
      setPlayerCount(count);
    };

    const onGameStarted = () => {
      setPhase('filters');
    };

    const onError = ({ message }: { message: string }) => {
      setError(message);
    };

    const onPlayerLeft = ({ playerCount: count }: { playerCount: number }) => {
      setPlayerCount(count);
      if (count < 2) {
        // Will receive room:reset_to_lobby if game was active
        // If already in lobby, just update count
      }
    };

    const onPromoted = () => {
      setIsCreator(true);
    };

    const onDisbanded = () => {
      setRoomCode(null);
      setPhase('home');
      setPlayerCount(1);
      setIsCreator(false);
      setError('The host left the room.');
      onRestartedCallback?.();
    };

    const onResetToLobby = () => {
      setPhase('lobby');
      setError(null);
      onRestartedCallback?.();
    };

    const onRestarted = () => {
      setPhase('filters');
      setError(null);
      onRestartedCallback?.();
    };

    const onReconnected = ({ code, status, playerCount: count, isCreator: creator }: {
      code: string; status: string; playerCount: number; isCreator: boolean;
      restaurants: any[]; limitedResults: boolean;
    }) => {
      setRoomCode(code);
      setPlayerCount(count);
      setIsCreator(creator);
      setError(null);

      // Map server status to client phase
      if (status === 'lobby') setPhase('lobby');
      else if (status === 'filtering') setPhase('filters');
      else if (status === 'swiping') {
        setPhase('swiping');
      }
      else if (status === 'matched') setPhase('results');
      else setPhase('lobby');
    };

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('room:reconnected', onReconnected);
    socket.on('room:created', onCreated);
    socket.on('room:joined', onJoined);
    socket.on('room:player_joined', onPlayerJoined);
    socket.on('room:game_started', onGameStarted);
    socket.on('room:error', onError);
    socket.on('room:player_left', onPlayerLeft);
    socket.on('room:promoted', onPromoted);
    socket.on('room:disbanded', onDisbanded);
    socket.on('room:reset_to_lobby', onResetToLobby);
    socket.on('room:restarted', onRestarted);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('room:reconnected', onReconnected);
      socket.off('room:created', onCreated);
      socket.off('room:joined', onJoined);
      socket.off('room:player_joined', onPlayerJoined);
      socket.off('room:game_started', onGameStarted);
      socket.off('room:error', onError);
      socket.off('room:player_left', onPlayerLeft);
      socket.off('room:promoted', onPromoted);
      socket.off('room:disbanded', onDisbanded);
      socket.off('room:reset_to_lobby', onResetToLobby);
      socket.off('room:restarted', onRestarted);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [onRestartedCallback]);

  return { roomCode, phase, setPhase, error, setError, connected, createRoom, joinRoom, leaveRoom, restartRoom, startGame, playerCount, isCreator };
}
