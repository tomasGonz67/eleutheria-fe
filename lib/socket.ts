import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Check if socket is connected and ready to use
 */
export function isSocketConnected(): boolean {
  return socket !== null && socket.connected;
}

/**
 * Ensure socket is connected before performing operations
 * Throws error if not connected
 */
function ensureConnected(): void {
  if (!isSocketConnected()) {
    throw new Error('Socket.IO connection not established. Please refresh the page and try again.');
  }
}

/**
 * Get or create Socket.io connection
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true, // Send cookies with connection
      autoConnect: false, // Don't connect automatically
      reconnection: true, // Enable reconnection
      reconnectionDelay: 1000, // Wait 1s before reconnecting
      reconnectionDelayMax: 5000, // Max 5s between attempts
      reconnectionAttempts: 5, // Try 5 times
      timeout: 10000, // Connection timeout: 10s
    });

    // Basic connection handlers
    socket.on('connect', () => {
      // Socket connected
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Server disconnected us - try to reconnect manually
        socket?.connect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      // Socket reconnected
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      // Socket reconnection attempt
    });

    socket.on('reconnect_error', (error) => {
      // Socket reconnection error
    });

    socket.on('reconnect_failed', () => {
      // Socket reconnection failed
    });

    socket.on('connect_error', (error) => {
      // Socket connection error
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
  ensureConnected();
  const socket = getSocket();
  socket.emit('join_session', { session_id: sessionId });
}

/**
 * Leave a chat session room
 */
export function leaveSession(sessionId: number): void {
  ensureConnected();
  const socket = getSocket();
  socket.emit('leave_session', { session_id: sessionId });
}

/**
 * Join a chatroom
 */
export function joinChatroom(chatroomId: number): void {
  ensureConnected();
  const socket = getSocket();
  socket.emit('join_chatroom', { chatroom_id: chatroomId });
}

/**
 * Leave a chatroom
 */
export function leaveChatroom(chatroomId: number): void {
  ensureConnected();
  const socket = getSocket();
  socket.emit('leave_chatroom', { chatroom_id: chatroomId });
}
