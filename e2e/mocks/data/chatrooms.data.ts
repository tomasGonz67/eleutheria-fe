// Mock data for chatrooms endpoints

export interface MockChatroom {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_by_username: string;
  created_at: string;
  updated_at: string;
  member_count: number;
}

export interface ChatroomMessage {
  id: number;
  chatroom_id: number;
  user_id: number;
  username: string;
  content: string;
  created_at: string;
}

export interface ChatroomsListResponse {
  chatrooms: MockChatroom[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ChatroomResponse {
  chatroom: MockChatroom;
}

export interface ChatroomMessagesResponse {
  messages: ChatroomMessage[];
}

export function createMockChatroom(overrides: Partial<MockChatroom> = {}): MockChatroom {
  const id = overrides.id ?? Math.floor(Math.random() * 10000);
  return {
    id,
    name: overrides.name ?? `Chatroom ${id}`,
    description: overrides.description ?? `Description for chatroom ${id}`,
    created_by: overrides.created_by ?? 1,
    created_by_username: overrides.created_by_username ?? 'TestUser',
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    member_count: overrides.member_count ?? 1,
  };
}

export function createMockChatroomMessage(overrides: Partial<ChatroomMessage> = {}): ChatroomMessage {
  const id = overrides.id ?? Math.floor(Math.random() * 10000);
  return {
    id,
    chatroom_id: overrides.chatroom_id ?? 1,
    user_id: overrides.user_id ?? 1,
    username: overrides.username ?? 'TestUser',
    content: overrides.content ?? `Message ${id}`,
    created_at: overrides.created_at ?? new Date().toISOString(),
  };
}

// Default chatrooms for testing
export const defaultChatrooms: MockChatroom[] = [
  createMockChatroom({ id: 1, name: 'General Chat', description: 'Chat about anything', created_by: 1, created_by_username: 'TestUser', member_count: 24 }),
  createMockChatroom({ id: 2, name: 'Tech Talk', description: 'Technology discussions', created_by: 2, created_by_username: 'TechGuru', member_count: 18 }),
  createMockChatroom({ id: 3, name: 'Philosophy Corner', description: 'Deep conversations', created_by: 1, created_by_username: 'TestUser', member_count: 7 }),
  createMockChatroom({ id: 4, name: 'Music Room', description: 'Share your favorite tracks', created_by: 3, created_by_username: 'MusicLover', member_count: 15 }),
];

// Default chatroom messages
export const defaultChatroomMessages: ChatroomMessage[] = [
  createMockChatroomMessage({ id: 1, chatroom_id: 1, user_id: 1, username: 'TestUser', content: 'Hello everyone!' }),
  createMockChatroomMessage({ id: 2, chatroom_id: 1, user_id: 2, username: 'User2', content: 'Hi there!' }),
  createMockChatroomMessage({ id: 3, chatroom_id: 1, user_id: 3, username: 'User3', content: 'Good morning!' }),
];

// Chatrooms state management for tests
export class ChatroomsState {
  private chatrooms: Map<number, MockChatroom> = new Map();
  private messages: Map<number, ChatroomMessage[]> = new Map();
  private nextId = 100;
  private nextMessageId = 100;

  constructor() {
    this.reset();
  }

  reset() {
    this.chatrooms.clear();
    this.messages.clear();
    this.nextId = 100;
    this.nextMessageId = 100;
    defaultChatrooms.forEach(chatroom => this.chatrooms.set(chatroom.id, { ...chatroom }));

    // Group default messages by chatroom
    defaultChatroomMessages.forEach(msg => {
      const existing = this.messages.get(msg.chatroom_id) || [];
      existing.push({ ...msg });
      this.messages.set(msg.chatroom_id, existing);
    });
  }

  getAll(): MockChatroom[] {
    return Array.from(this.chatrooms.values()).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getById(id: number): MockChatroom | undefined {
    return this.chatrooms.get(id);
  }

  getPaginated(page: number, limit: number): ChatroomsListResponse {
    const all = this.getAll();
    const start = (page - 1) * limit;
    const chatrooms = all.slice(start, start + limit);
    return {
      chatrooms,
      total: all.length,
      page,
      limit,
      total_pages: Math.ceil(all.length / limit),
    };
  }

  search(query: string, page: number = 1, limit: number = 10): ChatroomsListResponse {
    const lowerQuery = query.toLowerCase();
    const filtered = this.getAll().filter(
      c => c.name.toLowerCase().includes(lowerQuery) ||
           c.description.toLowerCase().includes(lowerQuery)
    );
    const start = (page - 1) * limit;
    const chatrooms = filtered.slice(start, start + limit);
    return {
      chatrooms,
      total: filtered.length,
      page,
      limit,
      total_pages: Math.ceil(filtered.length / limit),
    };
  }

  create(name: string, description: string, userId: number, username: string): MockChatroom {
    const chatroom = createMockChatroom({
      id: this.nextId++,
      name,
      description,
      created_by: userId,
      created_by_username: username,
    });
    this.chatrooms.set(chatroom.id, chatroom);
    return chatroom;
  }

  update(id: number, updates: { name?: string; description?: string }): MockChatroom | null {
    const chatroom = this.chatrooms.get(id);
    if (!chatroom) return null;

    if (updates.name) chatroom.name = updates.name;
    if (updates.description) chatroom.description = updates.description;
    chatroom.updated_at = new Date().toISOString();

    return chatroom;
  }

  delete(id: number): boolean {
    this.messages.delete(id);
    return this.chatrooms.delete(id);
  }

  getMessages(chatroomId: number): ChatroomMessage[] {
    return this.messages.get(chatroomId) || [];
  }

  addMessage(chatroomId: number, userId: number, username: string, content: string): ChatroomMessage {
    const message = createMockChatroomMessage({
      id: this.nextMessageId++,
      chatroom_id: chatroomId,
      user_id: userId,
      username,
      content,
    });

    const existing = this.messages.get(chatroomId) || [];
    existing.push(message);
    this.messages.set(chatroomId, existing);

    return message;
  }

  setChatrooms(chatrooms: MockChatroom[]) {
    this.chatrooms.clear();
    chatrooms.forEach(c => this.chatrooms.set(c.id, c));
  }
}
