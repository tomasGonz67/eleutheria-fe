// Mock data for random chat/private chat endpoints

export type ChatSessionStatus = 'pending' | 'waiting' | 'matched' | 'ended' | 'cancelled' | 'rejected';

export interface MockChatSession {
  id: number;
  user1_id: number;
  user1_username: string;
  user2_id: number | null;
  user2_username: string | null;
  status: ChatSessionStatus;
  created_at: string;
  ended_at: string | null;
  is_random: boolean;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  sender_id: number;
  sender_username: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export interface ChatSessionResponse {
  session: MockChatSession;
  partner?: {
    id: number;
    username: string;
  };
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
}

export interface ChatSessionsListResponse {
  sessions: MockChatSession[];
}

export function createMockChatSession(overrides: Partial<MockChatSession> = {}): MockChatSession {
  const id = overrides.id ?? Math.floor(Math.random() * 10000);
  return {
    id,
    user1_id: overrides.user1_id ?? 1,
    user1_username: overrides.user1_username ?? 'User1',
    user2_id: overrides.user2_id ?? null,
    user2_username: overrides.user2_username ?? null,
    status: overrides.status ?? 'waiting',
    created_at: overrides.created_at ?? new Date().toISOString(),
    ended_at: overrides.ended_at ?? null,
    is_random: overrides.is_random ?? true,
  };
}

export function createMockChatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  const id = overrides.id ?? Math.floor(Math.random() * 10000);
  return {
    id,
    session_id: overrides.session_id ?? 1,
    sender_id: overrides.sender_id ?? 1,
    sender_username: overrides.sender_username ?? 'User1',
    content: overrides.content ?? `Message ${id}`,
    created_at: overrides.created_at ?? new Date().toISOString(),
    read_at: overrides.read_at ?? null,
  };
}

// Chat state management for tests
export class ChatState {
  private sessions: Map<number, MockChatSession> = new Map();
  private messages: Map<number, ChatMessage[]> = new Map();
  private waitingQueue: number[] = []; // Session IDs of users waiting for random match
  private nextSessionId = 100;
  private nextMessageId = 100;

  constructor() {
    this.reset();
  }

  reset() {
    this.sessions.clear();
    this.messages.clear();
    this.waitingQueue = [];
    this.nextSessionId = 100;
    this.nextMessageId = 100;
  }

  // Get all sessions for a user
  getUserSessions(userId: number): MockChatSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.user1_id === userId || s.user2_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getSession(sessionId: number): MockChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Start random chat - either match with waiting user or join queue
  startRandomChat(userId: number, username: string): { session: MockChatSession; matched: boolean } {
    // Check if there's someone waiting
    if (this.waitingQueue.length > 0) {
      const waitingSessionId = this.waitingQueue.shift()!;
      const waitingSession = this.sessions.get(waitingSessionId);

      if (waitingSession && waitingSession.user1_id !== userId) {
        // Match found! Update the waiting session
        waitingSession.user2_id = userId;
        waitingSession.user2_username = username;
        waitingSession.status = 'matched';
        return { session: waitingSession, matched: true };
      }
    }

    // No match, create new session and join queue
    const session = createMockChatSession({
      id: this.nextSessionId++,
      user1_id: userId,
      user1_username: username,
      status: 'waiting',
      is_random: true,
    });

    this.sessions.set(session.id, session);
    this.waitingQueue.push(session.id);

    return { session, matched: false };
  }

  // Start planned (direct) chat with another user
  startPlannedChat(userId: number, username: string, targetUserId: number, targetUsername: string): MockChatSession {
    const session = createMockChatSession({
      id: this.nextSessionId++,
      user1_id: userId,
      user1_username: username,
      user2_id: targetUserId,
      user2_username: targetUsername,
      status: 'pending', // Needs acceptance
      is_random: false,
    });

    this.sessions.set(session.id, session);
    return session;
  }

  // Accept a pending chat request
  acceptChat(sessionId: number): MockChatSession | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'pending') return null;

    session.status = 'matched';
    return session;
  }

  // Reject a pending chat request
  rejectChat(sessionId: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'pending') return false;

    session.status = 'rejected';
    return true;
  }

  // Cancel waiting for random match
  cancelChat(sessionId: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'waiting') return false;

    // Remove from waiting queue
    this.waitingQueue = this.waitingQueue.filter(id => id !== sessionId);
    session.status = 'cancelled';
    return true;
  }

  // End an active chat
  endChat(sessionId: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'matched') return false;

    session.status = 'ended';
    session.ended_at = new Date().toISOString();
    return true;
  }

  // Get messages for a session
  getMessages(sessionId: number): ChatMessage[] {
    return this.messages.get(sessionId) || [];
  }

  // Add a message to a session
  addMessage(sessionId: number, senderId: number, senderUsername: string, content: string): ChatMessage {
    const message = createMockChatMessage({
      id: this.nextMessageId++,
      session_id: sessionId,
      sender_id: senderId,
      sender_username: senderUsername,
      content,
    });

    const existing = this.messages.get(sessionId) || [];
    existing.push(message);
    this.messages.set(sessionId, existing);

    return message;
  }

  // Mark messages as read
  markRead(sessionId: number, userId: number): void {
    const messages = this.messages.get(sessionId) || [];
    messages.forEach(msg => {
      if (msg.sender_id !== userId && !msg.read_at) {
        msg.read_at = new Date().toISOString();
      }
    });
  }

  // Simulate matching for tests
  forceMatch(sessionId: number, partnerId: number, partnerUsername: string): MockChatSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Remove from waiting queue
    this.waitingQueue = this.waitingQueue.filter(id => id !== sessionId);

    session.user2_id = partnerId;
    session.user2_username = partnerUsername;
    session.status = 'matched';

    return session;
  }

  // Get partner info for a session
  getPartner(sessionId: number, userId: number): { id: number; username: string } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (session.user1_id === userId && session.user2_id) {
      return { id: session.user2_id, username: session.user2_username! };
    }
    if (session.user2_id === userId) {
      return { id: session.user1_id, username: session.user1_username };
    }

    return null;
  }
}
