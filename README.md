# ♟️ ChessPlay — Real-Time Multiplayer Chess Platform

[![Live Demo](https://img.shields.io/badge/Live-Demo-green?style=for-the-badge)](https://chessplay.onrender.com)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge\&logo=nodedotjs\&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge\&logo=express\&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge\&logo=socket.io\&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge\&logo=mongodb\&logoColor=white)
![EJS](https://img.shields.io/badge/EJS-B4CA65?style=for-the-badge\&logo=ejs\&logoColor=black)

A production-ready real-time multiplayer chess application built using Node.js, Express, Socket.IO, and MongoDB.

ChessPlay allows players to compete in live multiplayer matches, challenge AI opponents, chat in real time, spectate ongoing games, and track persistent match statistics — all inside a fast and responsive interface.

---

# 🚀 Features

## ♟️ Real-Time Multiplayer

* Create private multiplayer rooms instantly
* Join games using a unique room code
* Real-time board synchronization with Socket.IO
* White / Black / Random color selection
* Smooth move broadcasting with server-side validation

## 🤖 AI Opponent

Play against an AI with multiple difficulty levels.

| Difficulty | Description                                            |
| ---------- | ------------------------------------------------------ |
| Easy       | Randomized moves for beginners                         |
| Medium     | Minimax-based move evaluation                          |
| Hard       | Advanced positional evaluation with Alpha-Beta pruning |

### AI Capabilities

* Minimax Algorithm
* Alpha-Beta Pruning
* Material Evaluation
* Piece-Square Tables
* Mobility Scoring
* Checkmate Detection

## 🔐 Authentication System

* User signup and login
* Secure password hashing using bcrypt
* Persistent user profiles
* Session-based tracking

## 💬 In-Game Chat

* Real-time room chat
* Typing indicators
* Multiplayer communication without refresh
* System notifications for joins/leaves

## 📊 Player Statistics

Track:

* Total games played
* Wins / Losses / Draws
* Win percentage
* Match history
* AI and multiplayer records

## 👁️ Spectator Mode

* Spectators can join full rooms
* Live board updates in real time
* Watch multiplayer matches without interruption

## 🔁 Rematch System

* Instantly restart games
* Reuse the same room
* Fast replay experience

## ⚡ Disconnect Handling

* Automatic win assignment on disconnect
* Match history saved in MongoDB
* Player statistics updated instantly

---

# 🛠️ Tech Stack

## Backend

* Node.js
* Express.js
* Socket.IO
* MongoDB
* Mongoose
* bcrypt
* chess.js

## Frontend

* EJS
* Vanilla JavaScript
* Vanilla CSS
* Socket.IO Client

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

Create a `.env` file in the root directory.

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

## 2. Install Dependencies

```bash
npm install
```

## 3. Configure Environment Variables

Create a `.env` file:

```bash
touch .env
```

Add:

```env
PORT=3000
MONGODB_URI=your_mongodb_uri
```

## 4. Start Development Server

```bash
npm start
```

Server runs at:

```bash
http://localhost:3000
```

---

# 📡 Socket.IO Events

## Client → Server

| Event       | Description         |
| ----------- | ------------------- |
| createRoom  | Create private room |
| joinRoom    | Join existing room  |
| playAI      | Start AI match      |
| move        | Send chess move     |
| chatMessage | Send chat message   |
| chatTyping  | Broadcast typing    |
| leaveRoom   | Exit room           |
| newGame     | Start rematch       |

## Server → Client

| Event       | Description           |
| ----------- | --------------------- |
| roomCreated | Room creation success |
| roomJoined  | Room joined           |
| boardState  | Current board state   |
| move        | Broadcast move        |
| gameOver    | Match result          |
| playerNames | Player labels         |
| chatMessage | Incoming message      |
| chatTyping  | Typing indicator      |
| roomError   | Error handling        |

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

# 🤖 AI Engine

The chess AI is powered by the Minimax algorithm with Alpha-Beta pruning.

### Difficulty Levels

| Level  | Search Strategy                            |
| ------ | ------------------------------------------ |
| Easy   | Randomized move selection                  |
| Medium | Minimax depth-based evaluation             |
| Hard   | Positional scoring with Alpha-Beta pruning |

### Evaluation System

The AI evaluates:

* Material balance
* Piece positioning
* Mobility and board control
* Checkmate and terminal positions

### AI Response Time

```bash
400ms – 1000ms
```

This delay creates a more natural gameplay experience.

---

# 🔒 Security Features

* bcrypt password hashing
* Input validation
* Room isolation
* Move validation using chess.js
* Server-authoritative game logic
* Secure multiplayer synchronization

---

# ☁️ Deployment

## Render

1. Push the repository to GitHub
2. Create a new Web Service on Render
3. Add:

   * Build Command: `npm install`
   * Start Command: `npm start`
4. Configure environment variables
5. Deploy

## Railway

1. Connect the GitHub repository
2. Add `MONGODB_URI`
3. Deploy instantly

---

# 📈 Future Improvements

* Chess timers
* Elo rating system
* Friend system
* Matchmaking queue
* Puzzle mode
* Stockfish integration
* PGN export
* Mobile application

---

# 👨‍💻 Author

## Aniruddh Parmar

Passionate full-stack developer focused on building scalable real-time applications and multiplayer systems.

---

# ⭐ Support

If you enjoyed this project:

* Star the repository
* Fork the project
* Share feedback
* Contribute improvements

---

♟️ Built with passion, sockets, and strategy.
