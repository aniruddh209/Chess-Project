# ♟️ ChessPlay — Real-Time Multiplayer Chess

[![Live Demo](https://img.shields.io/badge/Live-Demo-green?style=for-the-badge)](https://your-website-url.com)

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
```

---

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

```bash
npm install
```

---

## 3. Configure Environment Variables

Create `.env` file:

```bash
touch .env
```

Add:

```env
PORT=3000
MONGODB_URI=your_mongodb_uri
```

---

## 4. Start Development Server

```bash
npm start
```

Server will run at:

```bash
http://localhost:3000
```

---

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
}
```

---

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

---

<div align="center">

### ♟️ Built with passion, sockets, and strategy.

</div>
