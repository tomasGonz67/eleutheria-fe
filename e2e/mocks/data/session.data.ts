// Mock data for session/user endpoints

export interface MockUser {
  id: number;
  username: string;
  session_token: string;
  created_at: string;
}

export interface SessionResponse {
  user: MockUser;
}

// Greek-themed usernames for random generation
const GREEK_PREFIXES = ['Ancient', 'Wise', 'Noble', 'Brave', 'Swift', 'Golden'];
const GREEK_NAMES = ['Athena', 'Zeus', 'Apollo', 'Hermes', 'Artemis', 'Poseidon', 'Hera', 'Dionysus'];

export function generateGreekUsername(): string {
  const prefix = GREEK_PREFIXES[Math.floor(Math.random() * GREEK_PREFIXES.length)];
  const name = GREEK_NAMES[Math.floor(Math.random() * GREEK_NAMES.length)];
  const suffix = Math.floor(Math.random() * 1000);
  return `${prefix}${name}${suffix}`;
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const id = overrides.id ?? Math.floor(Math.random() * 10000);
  return {
    id,
    username: overrides.username ?? generateGreekUsername(),
    session_token: overrides.session_token ?? `mock-session-token-${id}`,
    created_at: overrides.created_at ?? new Date().toISOString(),
  };
}

// Default users for testing
export const defaultUsers = {
  testUser: createMockUser({ id: 1, username: 'TestUser', session_token: 'test-token-1' }),
  persistentUser: createMockUser({ id: 2, username: 'PersistentUser', session_token: 'test-token-2' }),
  chatUser1: createMockUser({ id: 3, username: 'ChatUser1', session_token: 'test-token-3' }),
  chatUser2: createMockUser({ id: 4, username: 'ChatUser2', session_token: 'test-token-4' }),
};

// Session state management for tests
export class SessionState {
  private currentUser: MockUser | null = null;
  private users: Map<string, MockUser> = new Map();

  reset() {
    this.currentUser = null;
    this.users.clear();
  }

  createSession(username?: string): MockUser {
    const user = createMockUser({ username: username || undefined });
    this.users.set(user.session_token, user);
    this.currentUser = user;
    return user;
  }

  getCurrentUser(): MockUser | null {
    return this.currentUser;
  }

  setCurrentUser(user: MockUser) {
    this.currentUser = user;
    this.users.set(user.session_token, user);
  }

  getUserByToken(token: string): MockUser | undefined {
    return this.users.get(token);
  }

  updateUsername(newUsername: string): MockUser | null {
    if (this.currentUser) {
      this.currentUser.username = newUsername;
    }
    return this.currentUser;
  }
}
