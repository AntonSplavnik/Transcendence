# ft_transcendence - Pong Game Platform

A modern web-based Pong game platform with real-time multiplayer, tournaments, and server-side game logic built with microservices architecture.

## 🏗️ Architecture

This project uses a **microservices architecture** with the following services:

- **Gateway** (Port 3000) - API Gateway that routes requests to services
- **Auth Service** (Port 3001) - User authentication and JWT management
- **Game Service** (Port 3002) - Server-side game engine and tournament management
- **Frontend** (Port 8080) - TypeScript SPA for the user interface

## 📁 Project Structure

```
transcendence/
├── docker-compose.yml          # Docker orchestration
├── services/
│   ├── gateway/               # API Gateway
│   │   ├── src/
│   │   │   ├── routes/       # Route handlers
│   │   │   └── index.js      # Main server file
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── auth/                  # Authentication service
│   │   ├── src/
│   │   │   ├── database/     # Database setup
│   │   │   └── index.js      # Auth endpoints
│   │   ├── package.json
│   │   └── Dockerfile
│   └── game/                  # Game engine service
│       ├── src/
│       │   ├── engine/       # Pong game logic
│       │   ├── database/     # Game data storage
│       │   └── index.js      # Game endpoints
│       ├── package.json
│       └── Dockerfile
├── frontend/                  # TypeScript frontend
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── pages/           # Page components
│   │   ├── router/          # SPA routing
│   │   ├── styles/          # CSS styles
│   │   └── main.ts          # Entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── Dockerfile
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Transcendence
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env and change JWT_SECRET!
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:8080
   - API Gateway: http://localhost:3000
   - Auth Service: http://localhost:3001
   - Game Service: http://localhost:3002

### Development

Each service can be developed independently:

```bash
# Gateway
cd services/gateway
npm install
npm run dev

# Auth
cd services/auth
npm install
npm run dev

# Game
cd services/game
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## 🎮 Features

### Implemented
- ✅ User registration and authentication
- ✅ JWT-based authorization
- ✅ Server-side Pong game engine
- ✅ Tournament creation and management
- ✅ Real-time game state updates
- ✅ Single-page application frontend
- ✅ Microservices architecture

### Coming Soon
- 🚧 WebSocket for real-time multiplayer
- 🚧 Remote players (network play)
- 🚧 AI opponent
- 🚧 Match history
- 🚧 Leaderboards
- 🚧 2FA authentication
- 🚧 Live chat

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user
```json
{
  "username": "player1",
  "email": "player1@example.com",
  "password": "SecurePass123",
  "displayName": "Player One"
}
```

#### POST `/api/auth/login`
Login and get JWT token
```json
{
  "username": "player1",
  "password": "SecurePass123"
}
```

#### GET `/api/auth/me`
Get current user info (requires token)

### Game Endpoints

#### POST `/api/game/tournament/create`
Create a new tournament
```json
{
  "name": "Friday Night Pong",
  "maxPlayers": 8
}
```

#### POST `/api/game/tournament/join`
Join a tournament
```json
{
  "tournamentId": 1,
  "playerAlias": "ProPlayer"
}
```

#### GET `/api/game/tournament/:id`
Get tournament details

## 🛠️ Technology Stack

### Backend
- **Node.js** with **Fastify** framework
- **SQLite** for data persistence
- **bcrypt** for password hashing
- **JWT** for authentication
- **WebSocket** for real-time communication

### Frontend
- **TypeScript** for type safety
- **Vite** for fast development
- **HTML5 Canvas** for game rendering
- **Vanilla JS** (no frameworks - project requirement)

### DevOps
- **Docker** for containerization
- **Docker Compose** for orchestration

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Tournaments Table
```sql
CREATE TABLE tournaments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'waiting',
  max_players INTEGER DEFAULT 8,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Matches Table
```sql
CREATE TABLE matches (
  id INTEGER PRIMARY KEY,
  tournament_id INTEGER NOT NULL,
  player1_alias TEXT NOT NULL,
  player2_alias TEXT NOT NULL,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  winner_alias TEXT,
  status TEXT DEFAULT 'pending'
)
```

## 🎯 Project Requirements (42 School)

This project fulfills the following modules:
- ✅ **Mandatory Part** - Basic Pong game with tournaments
- ✅ **Backend Framework** - Using Fastify with Node.js
- ✅ **Database** - Using SQLite
- ✅ **Microservices** - Architecture with separate services
- ✅ **Server-Side Pong** - Game logic runs on server with API
- ✅ **Standard User Management** - Auth, profiles, registration

## 🔒 Security

- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens for stateless authentication
- Input validation on all endpoints
- HTTPS ready (configure nginx for production)
- SQL injection protection (prepared statements)

## 🐛 Troubleshooting

### Database not found
```bash
# Recreate volumes
docker-compose down -v
docker-compose up --build
```

### Port already in use
```bash
# Change ports in docker-compose.yml
# Or kill the process using the port
lsof -ti:3000 | xargs kill
```

### Frontend can't reach backend
- Check that all services are running: `docker-compose ps`
- Verify API_URL in frontend/.env
- Check Docker network: `docker network inspect transcendence_network`

## 📝 Next Steps

- [ ] Test the basic setup by starting Docker Compose
- [ ] Implement WebSocket for real-time gameplay
- [ ] Add AI opponent
- [ ] Create match history page
- [ ] Add user profile editing
- [ ] Implement 2FA
- [ ] Add live chat feature
- [ ] Create leaderboards

## 👥 Team

This project is part of the 42 School curriculum.
