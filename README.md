# ♟️ ChessPlay — Real-Time Multiplayer Chess

<<<<<<< HEAD
[![Live Demo](https://img.shields.io/badge/Live-Demo-green?style=for-the-badge)](https://chessplay.onrender.com)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)

A full-stack real-time chess platform with multiplayer rooms and AI opponents.
A real-time multiplayer chess platform built with Node.js, Socket.IO, and MongoDB.
# ♟️ ChessPlay — Real-Time Multiplayer Chess Platform

A production-ready, full-stack multiplayer chess application built with **Node.js**, **Express**, **Socket.IO**, and **MongoDB**.  
ChessPlay delivers real-time gameplay, AI-powered opponents, private rooms, live chat, player statistics, and spectator support — all inside a smooth and responsive interface.

Designed for both casual and competitive players, the platform focuses on fast synchronization, scalable room management, and a clean user experience.

---

# 🚀 Key Highlights

- Real-time multiplayer chess with instant move synchronization
- AI opponent powered by Minimax + Alpha-Beta pruning
- Secure authentication system using bcrypt hashing
- Persistent user profiles and match history
- Live room-based chat with typing indicators
- Spectator mode for ongoing matches
- Automatic disconnect and abandonment handling
- Rematch system for seamless replay experience
- Fully responsive UI using Vanilla JavaScript + EJS

---

# 🌟 Features

## 🔐 Authentication System
- User signup and login
- Secure password hashing with bcrypt
- Persistent account management
- Session-based gameplay tracking

---

## ♟️ Real-Time Multiplayer
- Create private rooms instantly
- Join games using a unique 6-character room code
- Live move synchronization using Socket.IO
- Automatic player color assignment
- Support for White / Black / Random selection

---

## 🤖 AI Opponent
Challenge an AI opponent with multiple difficulty levels:

| Difficulty | Description |
|---|---|
| Easy | Mostly random moves |
| Medium | Minimax depth-based evaluation |
| Hard | Advanced positional evaluation + pruning |

The AI includes:
- Alpha-Beta pruning
- Material evaluation
- Piece-square tables
- Mobility scoring
- Checkmate detection

---

## 💬 In-Game Chat
- Real-time room chat
- Typing indicators
- System notifications
- Multiplayer communication without page refresh

---

## 📊 Player Statistics
Each user profile stores:
- Total games played
- Wins / Losses / Draws
- Win percentage
- Match history
- AI and multiplayer match records

---

## 👁️ Spectator Mode
When both player slots are occupied:
- Additional users automatically join as spectators
- Spectators can watch live board updates in real time

---

## ⚡ Disconnect & Abandon Logic
If a player leaves:
- Opponent automatically receives the win
- Match result is stored in MongoDB
- Stats update instantly

---

# 🛠️ Tech Stack

## Backend
- Node.js
- Express.js
- Socket.IO
- MongoDB
- Mongoose
- bcrypt
- chess.js

## Frontend
- EJS
- Vanilla JavaScript
- Vanilla CSS
- Socket.IO Client

---

# 📁 Project Structure

```bash
ChessPlay/
│
├── app.js
├── package.json
├── .env
├── .gitignore
│
├── models/
│   ├── User.js
│   └── Game.js
│
├── views/
│   └── index.ejs
│
└── public/
    ├── css/
    └── js/
=======
<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![EJS](https://img.shields.io/badge/EJS-B4CA65?style=for-the-badge&logo=ejs&logoColor=black)

**A full-stack, real-time chess application with multiplayer rooms, AI opponents, user authentication, and persistent stats.**

*Developed by Aniruddh Parmar*

</div>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Socket.IO Events](#-socketio-events)
- [Database Models](#-database-models)
- [AI Engine](#-ai-engine)
- [Deployment](#-deployment)
- [Author](#-author)

---

## 🌟 Overview

**ChessPlay** is a production-ready, real-time chess platform built from the ground up with Node.js. It supports:

- **Player vs Player** — Create private rooms with a shareable 6-character code and play with friends.
- **Player vs AI** — Face off against an intelligent AI opponent with 3 difficulty settings.
- **Persistent Accounts** — Register, log in, and track your wins, losses, and draws across all sessions.
- **In-Game Chat** — Real-time chat with typing indicators between players in a room.
- **Spectator Mode** — Watch live games when both player slots are filled.
- **Disconnect Handling** — If a player disconnects or abandons the game, the opponent is automatically awarded the win and stats are updated.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Authentication** | Secure signup & login with bcrypt-hashed passwords |
| 🎮 **Private Rooms** | Create/join rooms using a 6-character alphanumeric code |
| 🤖 **AI Opponent** | Minimax AI with alpha-beta pruning (Easy / Medium / Hard) |
| 🎨 **Color Selection** | Choose White, Black, or Random when creating a room |
| 💬 **Live Chat** | Real-time in-game chat with typing indicators |
| 📊 **Player Stats** | Persistent Win / Loss / Draw stats per user via MongoDB |
| 📜 **Match History** | View last 10 games on your profile |
| 👁️ **Spectators** | Join full rooms to spectate ongoing games |
| ⚡ **Disconnect Logic** | Automatic win awarded on opponent disconnect/abandon |
| 🔁 **Rematch** | Start a new game instantly in the same room |

---

## 🛠️ Tech Stack

### Backend
- **[Node.js](https://nodejs.org/)** — JavaScript runtime
- **[Express.js v5](https://expressjs.com/)** — HTTP server and routing
- **[Socket.IO v4](https://socket.io/)** — Real-time bidirectional communication
- **[Mongoose v9](https://mongoosejs.com/)** — MongoDB ODM
- **[bcrypt](https://www.npmjs.com/package/bcrypt)** — Secure password hashing
- **[chess.js](https://github.com/jhlywa/chess.js)** — Chess move validation & game state

### Frontend
- **EJS** — Server-side HTML templating
- **Vanilla CSS & JavaScript** — Custom-built UI with no frontend framework
- **Socket.IO Client** — Real-time board sync

### Database
- **[MongoDB](https://www.mongodb.com/)** — Persistent user accounts & game history

---

## 📁 Project Structure

```
Chess.com/
├── app.js                  # Main server — Express + Socket.IO + AI engine
├── package.json            # Dependencies & scripts
├── .gitignore
├── models/
│   ├── User.js             # User schema (auth + stats)
│   └── Game.js             # Game schema (result, moves, duration)
├── views/
│   └── index.ejs           # Single-page EJS template (all UI states)
└── public/
    ├── css/                # Stylesheets
    └── js/                 # Client-side scripts
>>>>>>> a7895a3 (Mobile and tablet responsive website)
```

---

<<<<<<< HEAD
# ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
```

---

# 🚀 Installation & Setup

## 1. Clone Repository

```bash
git clone https://github.com/your-username/chessplay.git
cd chessplay
```

---

## 2. Install Dependencies
=======
## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/) (local instance or a free Atlas cluster)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/chess.com.git
cd chess.com
```

### 2. Install Dependencies
>>>>>>> a7895a3 (Mobile and tablet responsive website)

```bash
npm install
```

<<<<<<< HEAD
---

## 3. Configure Environment Variables

Create `.env` file:
=======
### 3. Configure Environment Variables

Create a `.env` file in the root directory (see [Environment Variables](#-environment-variables)):
>>>>>>> a7895a3 (Mobile and tablet responsive website)

```bash
touch .env
```

<<<<<<< HEAD
Add:

```env
PORT=3000
MONGODB_URI=your_mongodb_uri
```

---

## 4. Start Development Server
=======
### 4. Start the Server
>>>>>>> a7895a3 (Mobile and tablet responsive website)

```bash
npm start
```

<<<<<<< HEAD
Server will run at:

```bash
http://localhost:3000
=======
The app will be running at **http://localhost:3000**

---

## 🔑 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/chessplay` | MongoDB connection string |

**Example `.env` file:**

```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/chessplay
```

> ⚠️ Never commit your `.env` file. It is already listed in `.gitignore`.

---

## 📡 API Reference

### Auth

#### `POST /api/signup`
Register a new user account.

**Request Body:**
```json
{
  "username": "Aniruddh",
  "password": "mypassword"
}
```

**Responses:**
- `200 OK` — `{ "success": true, "username": "Aniruddh" }`
- `400 Bad Request` — Validation error (username length, missing fields)
- `409 Conflict` — Username already taken

---

#### `POST /api/login`
Authenticate an existing user.

**Request Body:**
```json
{
  "username": "Aniruddh",
  "password": "mypassword"
}
```

**Responses:**
- `200 OK` — `{ "success": true, "username": "Aniruddh" }`
- `401 Unauthorized` — Invalid credentials

---

### Profile

#### `GET /api/profile/:username`
Fetch a user's stats and recent game history.

**Response:**
```json
{
  "username": "Aniruddh",
  "stats": {
    "gamesPlayed": 24,
    "wins": 15,
    "losses": 7,
    "draws": 2
  },
  "winPercentage": 63,
  "memberSince": "2024-01-01T00:00:00.000Z",
  "recentGames": [
    {
      "opponent": "ChessBot",
      "myColor": "white",
      "result": "white_win",
      "reason": "checkmate",
      "totalMoves": 42,
      "duration": 318,
      "isAI": true,
      "aiDifficulty": "hard",
      "date": "2024-06-01T12:00:00.000Z"
    }
  ]
}
>>>>>>> a7895a3 (Mobile and tablet responsive website)
```

---

<<<<<<< HEAD
# 🔌 Socket.IO Events

## Client → Server

| Event | Description |
|---|---|
| createRoom | Create private room |
| joinRoom | Join existing room |
| playAI | Start AI match |
| move | Send chess move |
| chatMessage | Send chat message |
| chatTyping | Broadcast typing |
| leaveRoom | Exit room |
| newGame | Start rematch |

---

## Server → Client

| Event | Description |
|---|---|
| roomCreated | Room creation success |
| roomJoined | Room joined |
| boardState | Current board FEN |
| move | Broadcast move |
| gameOver | Match result |
| playerNames | Player labels |
| chatMessage | Incoming message |
| chatTyping | Typing indicator |
| roomError | Error handling |

---

# 🗄️ Database Models

## User Model

```js
{
  username: String,
  passwordHash: String,

  stats: {
    gamesPlayed: Number,
    wins: Number,
    losses: Number,
    draws: Number
  },

  createdAt: Date
}
```

---

## Game Model

```js
{
  players: [],
  result: String,
  reason: String,
  winner: String,
  moves: [],
  totalMoves: Number,
  duration: Number,
  isAI: Boolean,
  aiDifficulty: String,
  createdAt: Date
=======
## 🔌 Socket.IO Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `createRoom` | `{ username, color }` | Create a new private room |
| `joinRoom` | `{ roomCode, username }` | Join an existing room |
| `playAI` | `{ username, difficulty, color }` | Start a game vs AI |
| `move` | `{ from, to, promotion? }` | Make a chess move |
| `chatMessage` | `{ text }` | Send a chat message |
| `chatTyping` | `true / false` | Broadcast typing indicator |
| `newGame` | _(none)_ | Request a rematch in current room |
| `leaveRoom` | _(none)_ | Voluntarily leave the room |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `roomCreated` | `{ roomCode }` | Confirms room creation with code |
| `roomJoined` | `{ roomCode }` | Confirms successful room join |
| `playerRole` | `"w"` or `"b"` | Assigns color to the player |
| `spectatorRole` | _(none)_ | Player joined as spectator |
| `boardState` | FEN string | Full board position update |
| `move` | `{ from, to, promotion? }` | Broadcasts a valid move |
| `playerNames` | `{ white, black }` | Player name labels |
| `playerCount` | `{ white: bool, black: bool }` | Slot fill status |
| `gameOver` | `{ reason, winner, winnerName, ... }` | Game ended signal |
| `chatMessage` | `{ username, text, time }` | Incoming chat message |
| `chatSystem` | string | System notification in chat |
| `chatTyping` | `{ username, typing }` | Typing indicator from opponent |
| `newGame` | _(none)_ | Rematch started |
| `roomError` | string | Error joining/creating a room |

---

## 🗄️ Database Models

### User

```js
{
  username:     String,   // 3–20 chars, unique
  passwordHash: String,   // bcrypt hashed
  stats: {
    gamesPlayed: Number,
    wins:        Number,
    losses:      Number,
    draws:       Number,
  },
  createdAt:    Date,
  // Virtual:
  winPercentage: Number   // (wins / gamesPlayed) * 100
}
```

### Game

```js
{
  players: [{ username: String, color: "white" | "black" }],
  result:  "white_win" | "black_win" | "draw",
  reason:  "checkmate" | "stalemate" | "draw" | "disconnect" | "abandon" | "resignation",
  winner:  String | null,       // username of winner
  moves:   [{ from, to, promotion }],
  totalMoves: Number,
  duration:   Number,           // seconds
  isAI:       Boolean,
  aiDifficulty: "easy" | "medium" | "hard" | null,
  createdAt:  Date
>>>>>>> a7895a3 (Mobile and tablet responsive website)
}
```

---

<<<<<<< HEAD
# 🤖 AI Engine Details

The chess AI uses:

- Minimax Algorithm
- Alpha-Beta Pruning
- Material Evaluation
- Piece-Square Tables
- Mobility Scoring
- Terminal Position Detection

### AI Response Time
The bot waits between:

```bash
400ms – 1000ms
```

to simulate realistic gameplay.

---

# ☁️ Deployment

## Render
1. Push code to GitHub
2. Create Web Service on Render
3. Add:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add environment variables
5. Deploy

---

## Railway
1. Connect GitHub repository
2. Add `MONGODB_URI`
3. Deploy instantly

---

# 🔒 Security Features

- bcrypt password hashing
- Input validation
- Room isolation
- Move validation using chess.js
- Server-side game authority
- Protected game logic

---

# 📈 Future Improvements

- Chess timers
- Elo rating system
- Friend system
- Matchmaking queue
- Puzzle mode
- Stockfish integration
- PGN export
- Mobile application

---

# 👨‍💻 Author

## Aniruddh Parmar

Passionate full-stack developer focused on building scalable real-time applications and interactive web experiences.

---

# ⭐ Support

If you enjoyed this project:

- Star the repository
- Fork the project
- Share feedback
- Contribute improvements
=======
## 🤖 AI Engine

The AI is powered by the **Minimax algorithm with Alpha-Beta Pruning**, implemented server-side in `app.js`.

### Difficulty Levels

| Level | Strategy | Search Depth |
|---|---|---|
| **Easy** | Random moves with 40% chance of preferring captures | 0 (random) |
| **Medium** | Minimax with alpha-beta pruning | 2 |
| **Hard** | Minimax with alpha-beta pruning + positional scoring | 3 |

### Evaluation Function

The board is evaluated using:
- **Material score** — Each piece type has a value (P=1, N=3, B=3, R=5, Q=9)
- **Piece-Square Tables (PST)** — Positional bonuses for pawns and knights encourage good development
- **Mobility bonus** — Extra score for having more available moves (controlling the position)
- **Terminal states** — Checkmate returns ±9999, draws return 0

### AI Timing

The AI responds with a **realistic delay of 400–1000ms** to simulate human thinking time.

---

## ☁️ Deployment

This app is ready to deploy on any Node.js-compatible platform.

### Render (Free Tier — Recommended)

1. Push your code to GitHub.
2. Go to [render.com](https://render.com) → **New Web Service**.
3. Connect your repository.
4. Set the following:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add environment variables:
   - `MONGODB_URI` → your MongoDB Atlas URI
   - `PORT` → (Render sets this automatically)
6. Deploy!

### Railway

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**.
2. Add `MONGODB_URI` as an environment variable.
3. Railway auto-detects Node.js and runs `npm start`.

### Environment Notes

- Rooms are stored **in-memory** (not persisted). Restarting the server clears active rooms, but all user accounts and game history remain in MongoDB.
- Use **MongoDB Atlas** for a free, cloud-hosted database that works with any deployment platform.

---

## 👤 Author

**Aniruddh Parmar**

> Built with passion for chess and clean code. ♟️
>>>>>>> a7895a3 (Mobile and tablet responsive website)

---

<div align="center">

<<<<<<< HEAD
### ♟️ Built with passion, sockets, and strategy.
=======
⭐ If you found this project useful, please consider giving it a star!
>>>>>>> a7895a3 (Mobile and tablet responsive website)

</div>
