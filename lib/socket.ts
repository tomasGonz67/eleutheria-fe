import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.0.1.65:3000';

let socket: Socket | null = null;

/**
 * Get or create Socket.io connection
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true, // Send cookies with connection
      autoConnect: false, // Don't connect automatically
    });

    // Basic connection handlers
    socket.on('connect', () => {
      console.log('Socket.io connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket.io disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error.message);
    });
  }

  return socket;
}

/**
 * Connect to Socket.io server
 */
export function connectSocket(): void {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
}

/**
 * Disconnect from Socket.io server
 */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

/**
 * Join a chat session room
 */
export function joinSession(sessionId: number): void {
  const socket = getSocket();
  socket.emit('join_session', { session_id: sessionId });
}

/**
 * Leave a chat session room
 */
export function leaveSession(sessionId: number): void {
  const socket = getSocket();
  socket.emit('leave_session', { session_id: sessionId });
}
