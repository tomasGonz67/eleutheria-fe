import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { getSocket, connectSocket, disconnectSocket, joinSession, leaveSession } from '@/lib/socket';

interface PlannedChat {
  id: number;
  inviteCode: string;
  partnerUsername?: string;
  isMinimized: boolean;
  unreadCount: number;
  status?: 'active' | 'ended';
}

interface Message {
  id: number;
  content: string;
  username: string;
  is_me: boolean;
  sender_session_token?: string;
  created_at: string;
  isSystem?: boolean; // For system messages like "User left"
}

interface MessageRequest {
  session_id: number;
  requester_username: string;
  requester_session_token: string;
  created_at: string;
}

interface Notification {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

interface ChatStore {
  // Socket.io
  socket: Socket | null;
  isConnected: boolean;

  // Random chat state
  randomChatStatus: 'idle' | 'waiting' | 'matched' | 'ended';
  randomChatSessionId: number | null;
  randomChatPartner: string;
  randomChatMessages: Message[];

  // Planned chats state
  plannedChats: PlannedChat[];

  // Message requests state
  messageRequests: MessageRequest[];

  // Notifications state
  notification: Notification | null;

  // Socket.io actions
  initializeSocket: () => void;
  cleanupSocket: () => void;
  joinChatSession: (sessionId: number) => void;
  leaveChatSession: (sessionId: number) => void;

  // Random chat actions
  setRandomChatStatus: (status: 'idle' | 'waiting' | 'matched' | 'ended') => void;
  setRandomChatSessionId: (id: number | null) => void;
  setRandomChatPartner: (username: string) => void;
  addRandomChatMessage: (message: Message) => void;
  clearRandomChat: () => void;

  // Planned chat actions
  addPlannedChat: (chat: PlannedChat) => void;
  removePlannedChat: (id: number) => void;
  toggleMinimize: (id: number) => void;
  setUnreadCount: (id: number, count: number) => void;
  clearUnread: (id: number) => void;

  // Message request actions
  addMessageRequest: (request: MessageRequest) => void;
  removeMessageRequest: (sessionId: number) => void;

  // Notification actions
  showNotification: (type: 'error' | 'success' | 'info', message: string, autoDismiss?: boolean, autoDismissDelay?: number) => void;
  dismissNotification: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Socket.io initial state
  socket: null,
  isConnected: false,

  // Random chat initial state
  randomChatStatus: 'idle',
  randomChatSessionId: null,
  randomChatPartner: '',
  randomChatMessages: [],

  // Planned chats initial state
  plannedChats: [],

  // Message requests initial state
  messageRequests: [],

  // Notifications initial state
  notification: null,

  // Socket.io actions
  initializeSocket: () => {
    const socket = getSocket();

    // Set up connection state listeners
    socket.on('connect', () => {
      console.log('✅ Socket connected - updating store state');
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected - updating store state');
      set({ isConnected: false });
    });

    socket.on('reconnect', () => {
      console.log('🔄 Socket reconnected - updating store state');
      set({ isConnected: true });
    });

    connectSocket();

    set({ socket, isConnected: socket.connected });
  },

  cleanupSocket: () => {
    disconnectSocket();
    set({ socket: null, isConnected: false });
  },

  joinChatSession: (sessionId: number) => {
    joinSession(sessionId);
  },

  leaveChatSession: (sessionId: number) => {
    leaveSession(sessionId);
  },

  // Random chat actions
  setRandomChatStatus: (status) => set({ randomChatStatus: status }),

  setRandomChatSessionId: (id) => set({ randomChatSessionId: id }),

  setRandomChatPartner: (username) => set({ randomChatPartner: username }),

  addRandomChatMessage: (message) =>
    set((state) => ({
      randomChatMessages: [...state.randomChatMessages, message],
    })),

  clearRandomChat: () =>
    set({
      randomChatStatus: 'idle',
      randomChatSessionId: null,
      randomChatPartner: '',
      randomChatMessages: [],
    }),

  // Planned chat actions

  addPlannedChat: (chat) =>
    set((state) => ({
      plannedChats: [...state.plannedChats, chat],
    })),

  removePlannedChat: (id) =>
    set((state) => ({
      plannedChats: state.plannedChats.filter((chat) => chat.id !== id),
    })),

  toggleMinimize: (id) =>
    set((state) => {
      console.log('Toggling chat with ID:', id);
      console.log('Current chats:', state.plannedChats.map(c => ({ id: c.id, isMinimized: c.isMinimized })));
      return {
        plannedChats: state.plannedChats.map((chat) =>
          chat.id === id ? { ...chat, isMinimized: !chat.isMinimized } : chat
        ),
      };
    }),

  setUnreadCount: (id, count) =>
    set((state) => ({
      plannedChats: state.plannedChats.map((chat) =>
        chat.id === id ? { ...chat, unreadCount: count } : chat
      ),
    })),

  clearUnread: (id) =>
    set((state) => ({
      plannedChats: state.plannedChats.map((chat) =>
        chat.id === id ? { ...chat, unreadCount: 0 } : chat
      ),
    })),

  // Message request actions
  addMessageRequest: (request) =>
    set((state) => ({
      messageRequests: [...state.messageRequests, request],
    })),

  removeMessageRequest: (sessionId) =>
    set((state) => ({
      messageRequests: state.messageRequests.filter((req) => req.session_id !== sessionId),
    })),

  // Notification actions
  showNotification: (type, message, autoDismiss = false, autoDismissDelay = 5000) =>
    set({
      notification: {
        id: Date.now().toString(),
        type,
        message,
        autoDismiss,
        autoDismissDelay,
      },
    }),

  dismissNotification: () =>
    set({ notification: null }),
}));
