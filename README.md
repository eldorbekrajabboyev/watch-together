# SyncWatch

Watch local video files together in real-time with friends. Similar to Teleparty, but your files never leave your device.

## Features

- **Local Files** - Select video files from your computer. Nothing is uploaded to the server.
- **Real-time Sync** - Play, pause, seek, volume, and playback speed are synchronized across all participants.
- **Voice Chat** - WebRTC-powered voice chat with noise suppression and echo cancellation.
- **Text Chat** - Real-time messaging with emoji reactions, replies, and typing indicators.
- **Movie Matching** - SHA-256 hash verification ensures everyone is watching the same file.
- **Custom Player** - Modern video player with keyboard shortcuts, subtitles, and picture-in-picture.
- **Room System** - Create or join rooms with unique codes. Password-protected rooms supported.
- **Admin Dashboard** - Monitor active rooms, users, and activity.

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS
- Zustand (state management)
- Socket.IO Client
- WebRTC

### Backend
- Node.js + Express
- Socket.IO
- PostgreSQL + Prisma ORM
- JWT authentication

### Infrastructure
- Docker + Docker Compose

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or use Docker)
- npm or yarn

### Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/syncwatch.git
cd syncwatch
```

2. Install dependencies:
```bash
cd server && npm install
cd ../client && npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Initialize the database:
```bash
cd server
npx prisma db push
npx prisma generate
npm run db:seed
```

5. Start development servers:
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

6. Open http://localhost:5173

### Docker

```bash
# Start everything
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Environment Variables

### Server (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| DATABASE_URL | postgresql://... | PostgreSQL connection string |
| JWT_SECRET | - | Secret for JWT signing |
| CORS_ORIGIN | http://localhost:5173 | Allowed CORS origin |
| DB_USER | syncwatch | Database user |
| DB_PASSWORD | syncwatch_secret | Database password |
| DB_NAME | syncwatch | Database name |
| DB_PORT | 5432 | Database port |

### Client

| Variable | Default | Description |
|----------|---------|-------------|
| VITE_PORT | 5173 | Dev server port |

## Project Structure

```
syncwatch/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── layouts/         # Page layouts
│   │   ├── pages/           # Page components
│   │   ├── services/        # API and socket services
│   │   ├── store/           # Zustand stores
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utility functions
│   └── Dockerfile
├── server/                  # Express backend
│   ├── src/
│   │   ├── config/          # Environment and database config
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/       # Auth, validation, rate limiting
│   │   ├── models/          # Prisma client
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Business logic
│   │   └── socket/          # Socket.IO event handlers
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update profile

### Rooms
- `POST /api/rooms/create` - Create room
- `POST /api/rooms/join` - Join room
- `GET /api/rooms/:code` - Get room info
- `GET /api/rooms/active` - List active rooms
- `PUT /api/rooms/:code/settings` - Update settings
- `POST /api/rooms/:code/leave` - Leave room
- `DELETE /api/rooms/:code` - Close room

### Chat
- `GET /api/chat/:roomId/messages` - Get messages
- `PUT /api/chat/:roomId/messages/:messageId` - Edit message
- `DELETE /api/chat/:roomId/messages/:messageId` - Delete message

### Admin
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/rooms` - All rooms
- `GET /api/admin/users` - All users
- `GET /api/admin/logs` - Activity logs

## Socket Events

### Room
- `room:join` / `room:leave`
- `room:ready`
- `room:start`
- `room:settings-update`
- `room:movie-info`

### Sync
- `sync:play` / `sync:pause`
- `sync:seek`
- `sync:time-update`
- `sync:playback-rate`
- `sync:volume`
- `sync:fullscreen`
- `sync:subtitle-change` / `sync:audio-track-change`

### Voice
- `voice:join` / `voice:leave`
- `voice:mute`
- `voice:speaking`
- `voice:offer` / `voice:answer` / `voice:ice-candidate`

### Chat
- `chat:message`
- `chat:typing` / `chat:stop-typing`
- `chat:edit` / `chat:delete`
- `chat:reaction`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| ← | Seek backward 10s |
| → | Seek forward 10s |
| ↑ | Volume up |
| ↓ | Volume down |
| F | Toggle fullscreen |
| M | Toggle mute |
| [ | Decrease playback speed |
| ] | Increase playback speed |

## Supported Formats

- MP4
- MKV
- AVI
- MOV
- WebM

## License

MIT
