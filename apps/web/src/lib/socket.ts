import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    // In browser, connect to current host with path /ws
    const wsUrl = typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'https:' : 'http:'}//${window.location.host}`
      : (process.env.NEXT_PUBLIC_WS_URL || 'http://api:3001');

    socket = io(wsUrl, {
      path: '/ws/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function joinRoom(room: string) {
  getSocket().emit('join', { room });
}

export function leaveRoom(room: string) {
  getSocket().emit('leave', { room });
}
