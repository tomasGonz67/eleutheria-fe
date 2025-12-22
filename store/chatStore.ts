import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { getSocket, connectSocket, disconnectSocket, joinSession, leaveSession } from '@/lib/socket';

interface PlannedChat {
  id: number;
  inviteCode: string;
  partnerUsername?: string;
  isMinimized: boolean;
  unreadCount: number;
}

interface Message {
  id: number;
  content: string;
  username: string;
  is_me: boolean;
  sender_session_token?: string;
  created_at: string;
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

  // Socket.io actions
  initializeSocket: () => {
    const socket = getSocket();
    connectSocket();

    set({ socket, isConnected: true });
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
}));
