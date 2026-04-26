import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5001';

export function useSocket(token) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token]);

  const emit  = useCallback((event, data) => socketRef.current?.emit(event, data), []);
  const on    = useCallback((event, cb)   => { socketRef.current?.on(event, cb); }, []);
  const off   = useCallback((event, cb)   => { socketRef.current?.off(event, cb); }, []);

  return { socket: socketRef, emit, on, off };
}