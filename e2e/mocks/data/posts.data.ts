// Mock data for posts endpoints

export interface MockPost {
  id: number;
  forum_id: number;
  parent_id: number | null;
  content: string;
  created_by: number;
  created_by_username: string;
  created_at: string;
  updated_at: string;
  reply_count: number;
}

export interface PostsListResponse {
  posts: MockPost[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PostResponse {
  post: MockPost;
}

export function createMockPost(overrides: Partial<MockPost> = {}): MockPost {
  const id = overrides.id ?? Math.floor(Math.random() * 10000);
  return {
    id,
    forum_id: overrides.forum_id ?? 1,
    parent_id: overrides.parent_id ?? null,
    content: overrides.content ?? `This is post ${id} content`,
    created_by: overrides.created_by ?? 1,
    created_by_username: overrides.created_by_username ?? 'TestUser',
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    reply_count: overrides.reply_count ?? 0,
  };
}

// Default posts for testing
export const defaultPosts: MockPost[] = [
  createMockPost({ id: 1, forum_id: 1, content: 'Welcome to the forum!', created_by: 1, created_by_username: 'TestUser', reply_count: 3 }),
  createMockPost({ id: 2, forum_id: 1, content: 'Thanks for having me here', created_by: 2, created_by_username: 'User2', reply_count: 1 }),
  createMockPost({ id: 3, forum_id: 1, parent_id: 1, content: 'Great to be here!', created_by: 2, created_by_username: 'User2', reply_count: 0 }),
  createMockPost({ id: 4, forum_id: 1, parent_id: 1, content: 'Hello everyone', created_by: 3, created_by_username: 'User3', reply_count: 1 }),
  createMockPost({ id: 5, forum_id: 1, parent_id: 4, content: 'Welcome User3!', created_by: 1, created_by_username: 'TestUser', reply_count: 0 }),
  createMockPost({ id: 6, forum_id: 2, content: 'What tech stack do you use?', created_by: 2, created_by_username: 'TechGuru', reply_count: 2 }),
  createMockPost({ id: 7, forum_id: 2, parent_id: 6, content: 'I use React and Node', created_by: 1, created_by_username: 'TestUser', reply_count: 0 }),
];

// Posts state management for tests
export class PostsState {
  private posts: Map<number, MockPost> = new Map();
  private nextId = 100;

  constructor() {
    this.reset();
  }

  reset() {
    this.posts.clear();
    this.nextId = 100;
    defaultPosts.forEach(post => this.posts.set(post.id, { ...post }));
  }

  getByForum(forumId: number, page: number = 1, limit: number = 10, parentId?: number): PostsListResponse {
    const filtered = Array.from(this.posts.values())
      .filter(p => p.forum_id === forumId && p.parent_id === (parentId ?? null))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const start = (page - 1) * limit;
    const posts = filtered.slice(start, start + limit);

    return {
      posts,
      total: filtered.length,
      page,
      limit,
      total_pages: Math.ceil(filtered.length / limit),
    };
  }

  getReplies(forumId: number, parentId: number): PostsListResponse {
    return this.getByForum(forumId, 1, 100, parentId);
  }

  getById(id: number): MockPost | undefined {
    return this.posts.get(id);
  }

  search(forumId: number, query: string, page: number = 1, limit: number = 10): PostsListResponse {
    const lowerQuery = query.toLowerCase();
    const filtered = Array.from(this.posts.values())
      .filter(p => p.forum_id === forumId && p.content.toLowerCase().includes(lowerQuery))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const start = (page - 1) * limit;
    const posts = filtered.slice(start, start + limit);

    return {
      posts,
      total: filtered.length,
      page,
      limit,
      total_pages: Math.ceil(filtered.length / limit),
    };
  }

  create(forumId: number, content: string, userId: number, username: string, parentId?: number): MockPost {
    const post = createMockPost({
      id: this.nextId++,
      forum_id: forumId,
      parent_id: parentId ?? null,
      content,
      created_by: userId,
      created_by_username: username,
    });

    this.posts.set(post.id, post);

    // Update parent's reply count if this is a reply
    if (parentId) {
      const parent = this.posts.get(parentId);
      if (parent) {
        parent.reply_count++;
      }
    }

    return post;
  }

  update(id: number, content: string): MockPost | null {
    const post = this.posts.get(id);
    if (!post) return null;

    post.content = content;
    post.updated_at = new Date().toISOString();

    return post;
  }

  delete(id: number): boolean {
    const post = this.posts.get(id);
    if (!post) return false;

    // Update parent's reply count
    if (post.parent_id) {
      const parent = this.posts.get(post.parent_id);
      if (parent) {
        parent.reply_count--;
      }
    }

    return this.posts.delete(id);
  }

  setPosts(posts: MockPost[]) {
    this.posts.clear();
    posts.forEach(p => this.posts.set(p.id, p));
  }
}
