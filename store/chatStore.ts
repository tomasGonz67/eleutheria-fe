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
  sender_discriminator?: string;
  created_at: string;
  isSystem?: boolean; // For system messages like "User left"
}

interface MessageRequest {
  session_id: number;
  requester_username: string;
  requester_discriminator: string;
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
  incrementUnread: (id: number) => void;
  clearUnread: (id: number) => void;

  // Track unread for chats that aren't in plannedChats (not opened as floaters)
  chatUnreadCounts: Record<number, number>;
  incrementChatUnread: (id: number) => void;
  clearChatUnread: (id: number) => void;

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

  // Chat unread counts (for chats not opened as floaters)
  chatUnreadCounts: {},

  // Message requests initial state
  messageRequests: [],

  // Notifications initial state
  notification: null,

  // Socket.io actions
  initializeSocket: () => {
    const socket = getSocket();

    // Set up connection state listeners
    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('reconnect', () => {
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

  incrementUnread: (id) =>
    set((state) => ({
      plannedChats: state.plannedChats.map((chat) =>
        chat.id === id ? { ...chat, unreadCount: chat.unreadCount + 1 } : chat
      ),
    })),

  clearUnread: (id) =>
    set((state) => ({
      plannedChats: state.plannedChats.map((chat) =>
        chat.id === id ? { ...chat, unreadCount: 0 } : chat
      ),
    })),

  // Chat unread actions (for non-floater chats)
  incrementChatUnread: (id) =>
    set((state) => ({
      chatUnreadCounts: {
        ...state.chatUnreadCounts,
        [id]: (state.chatUnreadCounts[id] || 0) + 1,
      },
    })),

  clearChatUnread: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.chatUnreadCounts;
      return { chatUnreadCounts: rest };
    }),

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
