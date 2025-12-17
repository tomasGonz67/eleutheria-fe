import { create } from 'zustand';

interface PlannedChat {
  id: number;
  inviteCode: string;
  partnerUsername?: string;
  isMinimized: boolean;
  unreadCount: number;
}

interface ChatStore {
  // Planned chats state
  plannedChats: PlannedChat[];

  // Actions
  addPlannedChat: (chat: PlannedChat) => void;
  removePlannedChat: (id: number) => void;
  toggleMinimize: (id: number) => void;
  setUnreadCount: (id: number, count: number) => void;
  clearUnread: (id: number) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  plannedChats: [],

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
