// Mock data for forums endpoints

export interface MockForum {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_by_username: string;
  created_at: string;
  updated_at: string;
  post_count: number;
}

export interface ForumsListResponse {
  forums: MockForum[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ForumResponse {
  forum: MockForum;
}

export function createMockForum(overrides: Partial<MockForum> = {}): MockForum {
  const id = overrides.id ?? Math.floor(Math.random() * 10000);
  return {
    id,
    name: overrides.name ?? `Forum ${id}`,
    description: overrides.description ?? `Description for forum ${id}`,
    created_by: overrides.created_by ?? 1,
    created_by_username: overrides.created_by_username ?? 'TestUser',
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    post_count: overrides.post_count ?? 0,
  };
}

// Default forums for testing
export const defaultForums: MockForum[] = [
  createMockForum({ id: 1, name: 'General Discussion', description: 'Talk about anything', created_by: 1, created_by_username: 'TestUser', post_count: 15 }),
  createMockForum({ id: 2, name: 'Technology', description: 'Tech talk and gadgets', created_by: 2, created_by_username: 'TechGuru', post_count: 42 }),
  createMockForum({ id: 3, name: 'Philosophy', description: 'Deep thoughts and debates', created_by: 1, created_by_username: 'TestUser', post_count: 8 }),
  createMockForum({ id: 4, name: 'Art & Design', description: 'Creative discussions', created_by: 3, created_by_username: 'Artist123', post_count: 23 }),
  createMockForum({ id: 5, name: 'Music', description: 'All genres welcome', created_by: 4, created_by_username: 'MusicLover', post_count: 31 }),
];

// Forums state management for tests
export class ForumsState {
  private forums: Map<number, MockForum> = new Map();
  private nextId = 100;

  constructor() {
    this.reset();
  }

  reset() {
    this.forums.clear();
    this.nextId = 100;
    defaultForums.forEach(forum => this.forums.set(forum.id, { ...forum }));
  }

  getAll(): MockForum[] {
    return Array.from(this.forums.values()).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getById(id: number): MockForum | undefined {
    return this.forums.get(id);
  }

  getPaginated(page: number, limit: number): ForumsListResponse {
    const all = this.getAll();
    const start = (page - 1) * limit;
    const forums = all.slice(start, start + limit);
    return {
      forums,
      total: all.length,
      page,
      limit,
      total_pages: Math.ceil(all.length / limit),
    };
  }

  search(query: string, page: number = 1, limit: number = 10): ForumsListResponse {
    const lowerQuery = query.toLowerCase();
    const filtered = this.getAll().filter(
      f => f.name.toLowerCase().includes(lowerQuery) ||
           f.description.toLowerCase().includes(lowerQuery)
    );
    const start = (page - 1) * limit;
    const forums = filtered.slice(start, start + limit);
    return {
      forums,
      total: filtered.length,
      page,
      limit,
      total_pages: Math.ceil(filtered.length / limit),
    };
  }

  create(name: string, description: string, userId: number, username: string): MockForum {
    const forum = createMockForum({
      id: this.nextId++,
      name,
      description,
      created_by: userId,
      created_by_username: username,
    });
    this.forums.set(forum.id, forum);
    return forum;
  }

  update(id: number, updates: { name?: string; description?: string }): MockForum | null {
    const forum = this.forums.get(id);
    if (!forum) return null;

    if (updates.name) forum.name = updates.name;
    if (updates.description) forum.description = updates.description;
    forum.updated_at = new Date().toISOString();

    return forum;
  }

  delete(id: number): boolean {
    return this.forums.delete(id);
  }

  setForums(forums: MockForum[]) {
    this.forums.clear();
    forums.forEach(f => this.forums.set(f.id, f));
  }
}
