# Eleutheria Frontend

Next.js (Pages Router) frontend for Eleutheria — an anonymous, session-based community platform with forums, chatrooms, random 1-on-1 chat, and direct messages.

Pairs with the [`eleutheria-be`](../eleutheria-be) backend.

## Quick Start

### Prerequisites

- Docker + Docker Compose (recommended), **or** Node.js 20+ if running standalone

### Run with Docker (recommended)

From the repo root (where `docker-compose.yml` lives):

```bash
docker-compose up --build
```

The frontend will be available at [http://localhost:3001](http://localhost:3001) and proxied through Traefik.

### Run standalone

```bash
npm install
npm run dev
```

Then open [http://localhost:3001](http://localhost:3001).

## Environment Variables

| Variable | Purpose | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL the **browser** uses for API calls and Socket.io. Baked in at build time by Next.js. | `http://localhost:3000` (dev), `http://68.183.50.71` (staging) |
| `SERVER_API_URL` | Backend URL used during SSR (`getServerSideProps`). Lets the FE container talk to the BE container directly inside Docker. Falls back to `NEXT_PUBLIC_API_URL`. | `http://backend:3000` |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io endpoint (production only). Falls back to `NEXT_PUBLIC_API_URL`. | `https://api.eleutheria.lol` |

## Project Structure

```
pages/
  index.tsx              # Home / session entry
  feed.tsx               # Global feed
  forums.tsx             # Forum list
  forums/[id].tsx        # Forum detail (posts)
  forums/[id]/comments/[postId].tsx  # Post + comments
  chatrooms.tsx          # Chatroom list
  chatrooms/[id].tsx     # Chatroom detail (messages)
  chat/random.tsx        # Random 1-on-1 chat
  private-chats.tsx      # Direct chat sessions list
  private-chats/[id].tsx # Direct chat detail
  deleted.tsx            # Friendly "this content has been deleted" screen
  _app.tsx               # Global shell (Header, Footer, FloatingChats, NotificationBanner)

components/              # Header, Feed, ChatInput, ChatMessageList, UserActionMenu, etc.
lib/
  api.ts                 # Axios client + global 401 / 429 / rate-limit handling
  socket.ts              # Socket.io client setup
  services/              # Typed wrappers for API calls (chat, chatrooms, forums, notifications, session)
  hooks/                 # useSocketEvents and friends
store/chatStore.ts       # Zustand store (socket state, planned chats, message requests, settings)
```

## Architecture Notes

- **Authentication** is cookie-based and anonymous — no signup. Sessions are created from the home page.
- **Real-time** updates flow through Socket.io. The store (`chatStore`) tracks `isConnected`, planned chats, and unified user-settings (e.g. `myHideDiscriminator`, `myAcceptingMessageRequests`) so toggles in `Header` and `UserActionMenu` stay in sync without a refresh.
- **SSR** is used for forum and post pages (better SEO + first-paint). When the BE returns 404 for a missing forum/post, `getServerSideProps` redirects to `/deleted?type=forum|post|comment`.
- **Global 401 banner** is wired up in `lib/api.ts` — only fires for write methods (POST/PUT/DELETE/PATCH) so unauthenticated browsing doesn't nag the user.

## Useful Commands

```bash
npm run dev      # Next.js dev server
npm run build    # Production build
npm run start    # Run the production build
npm run lint     # ESLint
```

## Testing

End-to-end tests use Playwright. The dev server (and the backend) need to be running before you invoke them.

```bash
npm run test:e2e          # run all E2E tests headless
npm run test:e2e:ui       # interactive UI mode
npm run test:e2e:debug    # step-debug a single test
npm run test:e2e:report   # open the HTML report from the last run
```

## Deployment

Production / staging is deployed via the staging guide at `../deploy.md`. The image is built with `docker buildx build --platform linux/amd64` (since DigitalOcean droplets are x86_64 but local dev is usually ARM) and `--build-arg NEXT_PUBLIC_API_URL` baked in.
