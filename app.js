const express = require("express");
const app = express();
const socket = require("socket.io");
const path = require("path");
const http = require("http");
const server = http.createServer(app);
const io = socket(server, {
  pingTimeout: 30000,
  pingInterval: 15000,
  maxHttpBufferSize: 1e6,
  cors: { origin: "*" },
});
const { Chess } = require("chess.js");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const User = require("./models/User");
const Game = require("./models/Game");

// ============================================================
//  RATE LIMITER — prevents abuse under heavy traffic
// ============================================================
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 1000; // 1 second
const RATE_LIMIT_MAX = 15; // max events per window

function rateLimit(socketId) {
  const now = Date.now();
  const entry = rateLimitMap.get(socketId);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(socketId, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Cleanup stale entries every 30s
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of rateLimitMap) {
    if (now - entry.start > RATE_LIMIT_WINDOW * 2) rateLimitMap.delete(id);
  }
}, 30000);

// JWT Secret — in production use an environment variable
const JWT_SECRET = process.env.JWT_SECRET || "chessplay_secret_key_2026_aniruddh";
const JWT_EXPIRY = "1d"; // Token expires after 1 day
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day in ms

// ============================================================
//  MONGODB CONNECTION
// ============================================================

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chessplay";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

// ============================================================
//  IN-MEMORY DATA STORES (rooms are transient, not stored in DB)
// ============================================================

const rooms = new Map();
const socketRooms = new Map();
const socketUsers = new Map();

// ============================================================
//  EXPRESS CONFIG
// ============================================================

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser());
app.use(
  "/vendor",
  express.static(path.join(__dirname, "node_modules/chess.js/dist/esm")),
);

// ============================================================
//  ROUTES
// ============================================================

app.get("/", (req, res) => {
  res.render("index", { title: "Chess" });
});

// ---------- Auth Helpers ----------

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function setAuthCookie(res, username) {
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  res.cookie("chess_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
  });
  return token;
}

// ---------- Auth API ----------

// Auto-login: check if the browser has a valid token cookie
app.get("/api/me", async (req, res) => {
  try {
    const token = req.cookies.chess_token;
    if (!token) {
      return res.json({ loggedIn: false });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ username: decoded.username });
    if (!user) {
      res.clearCookie("chess_token");
      return res.json({ loggedIn: false });
    }

    res.json({ loggedIn: true, username: user.username });
  } catch (err) {
    // Token expired or invalid — clear it
    res.clearCookie("chess_token");
    res.json({ loggedIn: false });
  }
});

app.post("/api/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: "Username must be 3-20 characters" });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }

    const existing = await User.findOne({ username: { $regex: new RegExp(`^${escapeRegex(username)}$`, "i") } });
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash });

    setAuthCookie(res, user.username);
    res.json({ success: true, username: user.username });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = await User.findOne({ username: { $regex: new RegExp(`^${escapeRegex(username)}$`, "i") } });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    setAuthCookie(res, user.username);
    res.json({ success: true, username: user.username });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("chess_token");
  res.json({ success: true });
});

// ---------- Profile API ----------

app.get("/api/profile/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const recentGames = await Game.find({
      "players.username": user.username,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      username: user.username,
      stats: user.stats,
      winPercentage: user.winPercentage,
      memberSince: user.createdAt,
      recentGames: recentGames.map((g) => ({
        opponent: g.players.find((p) => p.username !== user.username)?.username || "AI",
        myColor: g.players.find((p) => p.username === user.username)?.color || "white",
        result: g.result,
        reason: g.reason,
        totalMoves: g.totalMoves,
        duration: g.duration,
        isAI: g.isAI,
        aiDifficulty: g.aiDifficulty,
        date: g.createdAt,
      })),
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

function broadcastRoomState(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  io.to(roomCode).emit("playerCount", {
    white: !!room.players.white,
    black: !!room.players.black,
  });

  io.to(roomCode).emit("playerNames", {
    white: room.usernames.white || "Waiting...",
    black: room.usernames.black || (room.isAI ? `AI (${room.aiDifficulty})` : "Waiting..."),
  });
}

// Save game to DB and update user stats
async function recordGame(room) {
  try {
    const players = [];
    if (room.usernames.white) players.push({ username: room.usernames.white, color: "white" });
    if (room.usernames.black && !room.isAI) players.push({ username: room.usernames.black, color: "black" });
    else if (room.isAI) players.push({ username: `AI (${room.aiDifficulty})`, color: "black" });

    let result = "draw";
    if (room.winner === "white") result = "white_win";
    else if (room.winner === "black") result = "black_win";

    const winnerUsername = room.winner ? room.usernames[room.winner] : null;
    const duration = Math.round((Date.now() - room.startTime) / 1000);

    await Game.create({
      players,
      result,
      reason: room.gameOverReason || "checkmate",
      winner: winnerUsername,
      moves: room.moveHistory || [],
      totalMoves: (room.moveHistory || []).length,
      duration,
      isAI: !!room.isAI,
      aiDifficulty: room.aiDifficulty || null,
    });

    // Update stats for real players
    for (const p of players) {
      if (p.username.startsWith("AI")) continue;
      const update = { $inc: { "stats.gamesPlayed": 1 } };
      if (result === "draw") {
        update.$inc["stats.draws"] = 1;
      } else if (winnerUsername === p.username) {
        update.$inc["stats.wins"] = 1;
      } else {
        update.$inc["stats.losses"] = 1;
      }
      await User.updateOne({ username: p.username }, update);
    }
  } catch (err) {
    console.error("Error recording game:", err);
  }
}

// ============================================================
//  AI ENGINE — Minimax with Alpha-Beta Pruning
// ============================================================

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Simple piece-square tables for positional evaluation
const PST_PAWN = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 5, 5, 5, 5, 5, 5, 5,
  1, 1, 2, 3, 3, 2, 1, 1,
  0.5, 0.5, 1, 2.5, 2.5, 1, 0.5, 0.5,
  0, 0, 0, 2, 2, 0, 0, 0,
  0.5, -0.5, -1, 0, 0, -1, -0.5, 0.5,
  0.5, 1, 1, -2, -2, 1, 1, 0.5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const PST_KNIGHT = [
  -5, -4, -3, -3, -3, -3, -4, -5,
  -4, -2, 0, 0, 0, 0, -2, -4,
  -3, 0, 1, 1.5, 1.5, 1, 0, -3,
  -3, 0.5, 1.5, 2, 2, 1.5, 0.5, -3,
  -3, 0, 1.5, 2, 2, 1.5, 0, -3,
  -3, 0.5, 1, 1.5, 1.5, 1, 0.5, -3,
  -4, -2, 0, 0.5, 0.5, 0, -2, -4,
  -5, -4, -3, -3, -3, -3, -4, -5,
];

function evaluateBoard(chessInstance) {
  if (chessInstance.isCheckmate()) {
    return chessInstance.turn() === "w" ? -9999 : 9999;
  }
  if (chessInstance.isDraw() || chessInstance.isStalemate()) return 0;

  let score = 0;
  const board = chessInstance.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      let value = PIECE_VALUES[piece.type] || 0;
      const idx = r * 8 + c;
      const mirrorIdx = (7 - r) * 8 + c;

      // Add positional bonus
      if (piece.type === "p") value += (piece.color === "w" ? PST_PAWN[mirrorIdx] : PST_PAWN[idx]) * 0.1;
      else if (piece.type === "n") value += (piece.color === "w" ? PST_KNIGHT[mirrorIdx] : PST_KNIGHT[idx]) * 0.1;

      score += piece.color === "w" ? value : -value;
    }
  }

  // Mobility bonus
  score += chessInstance.moves().length * 0.02 * (chessInstance.turn() === "w" ? 1 : -1);

  return score;
}

function minimax(chessInstance, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || chessInstance.isGameOver()) {
    return evaluateBoard(chessInstance);
  }

  const moves = chessInstance.moves();

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chessInstance.move(move);
      const eval_ = minimax(chessInstance, depth - 1, alpha, beta, false);
      chessInstance.undo();
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chessInstance.move(move);
      const eval_ = minimax(chessInstance, depth - 1, alpha, beta, true);
      chessInstance.undo();
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getAIMove(chessInstance, difficulty) {
  const moves = chessInstance.moves({ verbose: true });
  if (moves.length === 0) return null;

  if (difficulty === "easy") {
    // Random move with slight preference for captures
    const captures = moves.filter((m) => m.captured);
    if (captures.length > 0 && Math.random() < 0.4) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = difficulty === "medium" ? 2 : 3;
  const isMaximizing = chessInstance.turn() === "w";

  let bestMove = moves[0];
  let bestEval = isMaximizing ? -Infinity : Infinity;

  // Shuffle moves for variety
  const shuffled = [...moves].sort(() => Math.random() - 0.5);

  for (const move of shuffled) {
    chessInstance.move(move);
    const eval_ = minimax(chessInstance, depth - 1, -Infinity, Infinity, !isMaximizing);
    chessInstance.undo();

    if (isMaximizing ? eval_ > bestEval : eval_ < bestEval) {
      bestEval = eval_;
      bestMove = move;
    }
  }

  return bestMove;
}

// Make AI move with realistic delay
function scheduleAIMove(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.isAI || room.gameOver) return;

  const aiColor = room.aiColor;
  if (room.chess.turn() !== aiColor) return;

  const delay = 400 + Math.random() * 600; // 400-1000ms

  setTimeout(() => {
    const currentRoom = rooms.get(roomCode);
    if (!currentRoom || currentRoom.gameOver) return;
    if (currentRoom.chess.turn() !== aiColor) return;

    const aiMove = getAIMove(currentRoom.chess, currentRoom.aiDifficulty);
    if (!aiMove) return;

    const moveObj = { from: aiMove.from, to: aiMove.to, promotion: aiMove.promotion || "q" };
    currentRoom.chess.move(moveObj);
    currentRoom.moveHistory.push(moveObj);

    io.to(roomCode).emit("move", moveObj);
    io.to(roomCode).emit("boardState", currentRoom.chess.fen());

    // Check game over
    checkGameOver(currentRoom, roomCode);
  }, delay);
}

function checkGameOver(room, roomCode) {
  if (room.chess.isCheckmate()) {
    const winnerColor = room.chess.turn() === "w" ? "black" : "white";
    room.gameOver = true;
    room.winner = winnerColor;
    room.gameOverReason = "checkmate";
    io.to(roomCode).emit("gameOver", {
      reason: "checkmate",
      winner: winnerColor,
      winnerName: room.usernames[winnerColor] || (room.isAI ? `AI (${room.aiDifficulty})` : ""),
    });
    recordGame(room);
  } else if (room.chess.isStalemate()) {
    // Stalemate = the current player has NO legal moves but is NOT in check → draw
    room.gameOver = true;
    room.gameOverReason = "stalemate";
    io.to(roomCode).emit("gameOver", {
      reason: "stalemate",
      winner: null,
      winnerName: null,
      stalematedColor: room.chess.turn() === "w" ? "white" : "black",
    });
    recordGame(room);
  } else if (room.chess.isThreefoldRepetition()) {
    room.gameOver = true;
    room.gameOverReason = "threefold_repetition";
    io.to(roomCode).emit("gameOver", {
      reason: "threefold_repetition",
      winner: null,
      winnerName: null,
    });
    recordGame(room);
  } else if (room.chess.isInsufficientMaterial()) {
    room.gameOver = true;
    room.gameOverReason = "insufficient_material";
    io.to(roomCode).emit("gameOver", {
      reason: "insufficient_material",
      winner: null,
      winnerName: null,
    });
    recordGame(room);
  } else if (room.chess.isDraw()) {
    // Covers 50-move rule and other draw conditions
    room.gameOver = true;
    const halfMoves = room.chess.fen().split(" ")[4];
    const reason = parseInt(halfMoves) >= 100 ? "fifty_move_rule" : "draw";
    room.gameOverReason = reason;
    io.to(roomCode).emit("gameOver", {
      reason,
      winner: null,
      winnerName: null,
    });
    recordGame(room);
  }
}

// ============================================================
//  SOCKET.IO — ROOM-BASED MULTIPLAYER
// ============================================================

io.on("connection", (uniquesocket) => {
  console.log("new connection:", uniquesocket.id);

  // ---------- Create Room (with color selection) ----------
  uniquesocket.on("createRoom", (data) => {
    const username = data.username;
    const preferredColor = data.color || "white"; // "white", "black", or "random"

    let creatorColor = preferredColor;
    if (creatorColor === "random") {
      creatorColor = Math.random() < 0.5 ? "white" : "black";
    }

    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      chess: new Chess(),
      players: { white: null, black: null },
      usernames: { white: null, black: null },
      spectators: [],
      gameOver: false,
      winner: null,
      gameOverReason: null,
      moveHistory: [],
      startTime: Date.now(),
      isAI: false,
      aiColor: null,
      aiDifficulty: null,
    };

    // Assign creator to their chosen color
    room.players[creatorColor] = uniquesocket.id;
    room.usernames[creatorColor] = username;

    rooms.set(roomCode, room);
    socketRooms.set(uniquesocket.id, roomCode);
    socketUsers.set(uniquesocket.id, username);
    uniquesocket.join(roomCode);

    uniquesocket.emit("roomCreated", { roomCode });
    uniquesocket.emit("playerRole", creatorColor === "white" ? "w" : "b");
    uniquesocket.emit("boardState", room.chess.fen());

    broadcastRoomState(roomCode);
    console.log(`Room ${roomCode} created by ${username} as ${creatorColor}`);
  });

  // ---------- Play vs AI ----------
  uniquesocket.on("playAI", (data) => {
    const username = data.username;
    const difficulty = data.difficulty || "medium";
    let playerColor = data.color || "white";
    if (playerColor === "random") playerColor = Math.random() < 0.5 ? "white" : "black";

    const aiColor = playerColor === "white" ? "black" : "white";
    const roomCode = generateRoomCode();

    const room = {
      code: roomCode,
      chess: new Chess(),
      players: { white: null, black: null },
      usernames: { white: null, black: null },
      spectators: [],
      gameOver: false,
      winner: null,
      gameOverReason: null,
      moveHistory: [],
      startTime: Date.now(),
      isAI: true,
      aiColor: aiColor === "white" ? "w" : "b",
      aiDifficulty: difficulty,
    };

    room.players[playerColor] = uniquesocket.id;
    room.usernames[playerColor] = username;
    room.players[aiColor] = "AI";
    room.usernames[aiColor] = `AI (${difficulty})`;

    rooms.set(roomCode, room);
    socketRooms.set(uniquesocket.id, roomCode);
    socketUsers.set(uniquesocket.id, username);
    uniquesocket.join(roomCode);

    uniquesocket.emit("roomJoined", { roomCode });
    uniquesocket.emit("playerRole", playerColor === "white" ? "w" : "b");
    uniquesocket.emit("boardState", room.chess.fen());
    broadcastRoomState(roomCode);

    io.to(roomCode).emit("chatSystem", `🤖 Playing against AI (${difficulty})`);
    console.log(`AI game: ${username} (${playerColor}) vs AI (${difficulty})`);

    // If AI plays white, make first move
    if (aiColor === "white") {
      scheduleAIMove(roomCode);
    }
  });

  // ---------- Join Room ----------
  uniquesocket.on("joinRoom", (data) => {
    const { roomCode, username } = data;
    const room = rooms.get(roomCode);

    if (!room) {
      uniquesocket.emit("roomError", "Room not found. Check the code and try again.");
      return;
    }

    if (room.isAI) {
      uniquesocket.emit("roomError", "Cannot join an AI game.");
      return;
    }

    if (room.gameOver) {
      uniquesocket.emit("roomError", "This game is already over. Ask your friend to create a new room.");
      return;
    }

    socketRooms.set(uniquesocket.id, roomCode);
    socketUsers.set(uniquesocket.id, username);
    uniquesocket.join(roomCode);

    // Assign to the open slot
    if (!room.players.white) {
      room.players.white = uniquesocket.id;
      room.usernames.white = username;
      uniquesocket.emit("playerRole", "w");
      console.log(`${username} joined room ${roomCode} as White`);
    } else if (!room.players.black) {
      room.players.black = uniquesocket.id;
      room.usernames.black = username;
      uniquesocket.emit("playerRole", "b");
      console.log(`${username} joined room ${roomCode} as Black`);
    } else {
      room.spectators.push(uniquesocket.id);
      uniquesocket.emit("spectatorRole");
      console.log(`${username} joined room ${roomCode} as Spectator`);
    }

    uniquesocket.emit("roomJoined", { roomCode });
    uniquesocket.emit("boardState", room.chess.fen());
    broadcastRoomState(roomCode);
    io.to(roomCode).emit("chatSystem", `${username} joined the game`);
  });

  // ---------- Move ----------
  uniquesocket.on("move", (move) => {
    if (rateLimit(uniquesocket.id)) return;
    const roomCode = socketRooms.get(uniquesocket.id);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room || room.gameOver) return;

    try {
      if (room.chess.turn() === "w" && uniquesocket.id !== room.players.white) return;
      if (room.chess.turn() === "b" && uniquesocket.id !== room.players.black) return;

      const result = room.chess.move(move);
      if (result) {
        room.moveHistory.push({ from: move.from, to: move.to, promotion: move.promotion });
        io.to(roomCode).emit("move", move);

        checkGameOver(room, roomCode);

        // If playing AI and game not over, schedule AI move
        if (room.isAI && !room.gameOver) {
          scheduleAIMove(roomCode);
        }
      } else {
        uniquesocket.emit("invalidMove", move);
      }
    } catch {
      // Invalid move — silently ignore (piece snaps back)
      uniquesocket.emit("invalidMove", move);
    }
  });

  // ---------- Resign ----------
  uniquesocket.on("resign", () => {
    const roomCode = socketRooms.get(uniquesocket.id);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room || room.gameOver) return;

    let resignedColor = null;
    if (uniquesocket.id === room.players.white) resignedColor = "white";
    else if (uniquesocket.id === room.players.black) resignedColor = "black";
    if (!resignedColor) return;

    const winnerColor = resignedColor === "white" ? "black" : "white";
    room.gameOver = true;
    room.winner = winnerColor;
    room.gameOverReason = "resignation";

    io.to(roomCode).emit("gameOver", {
      reason: "resignation",
      winner: winnerColor,
      winnerName: room.usernames[winnerColor] || (room.isAI ? `AI (${room.aiDifficulty})` : ""),
      resignedName: room.usernames[resignedColor] || "",
    });
    recordGame(room);
  });

  // ---------- Chat Message ----------
  uniquesocket.on("chatMessage", (data) => {
    if (rateLimit(uniquesocket.id)) return;
    const roomCode = socketRooms.get(uniquesocket.id);
    const username = socketUsers.get(uniquesocket.id);
    if (!roomCode || !username) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    const text = (data.text || "").trim().slice(0, 200);
    if (!text) return;

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    io.to(roomCode).emit("chatMessage", { username, text, time });
  });

  // ---------- Chat Typing Indicator ----------
  uniquesocket.on("chatTyping", (typing) => {
    const roomCode = socketRooms.get(uniquesocket.id);
    const username = socketUsers.get(uniquesocket.id);
    if (!roomCode || !username) return;

    uniquesocket.to(roomCode).emit("chatTyping", { username, typing: !!typing });
  });

  // ---------- New Game (rematch) ----------
  uniquesocket.on("newGame", () => {
    const roomCode = socketRooms.get(uniquesocket.id);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    room.chess = new Chess();
    room.gameOver = false;
    room.winner = null;
    room.gameOverReason = null;
    room.moveHistory = [];
    room.startTime = Date.now();

    io.to(roomCode).emit("newGame", { fen: room.chess.fen() });
    io.to(roomCode).emit("chatSystem", "♟ New game started — Good luck!");
    console.log(`New game started in room ${roomCode}`);

    // If AI game, check if AI goes first
    if (room.isAI && room.chess.turn() === room.aiColor) {
      scheduleAIMove(roomCode);
    }
  });

  // ---------- Disconnect ----------
  uniquesocket.on("disconnect", () => {
    console.log("disconnected:", uniquesocket.id);
    const roomCode = socketRooms.get(uniquesocket.id);
    const username = socketUsers.get(uniquesocket.id);

    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        let disconnectedColor = null;
        const savedUsername = username; // save before clearing

        if (uniquesocket.id === room.players.white) {
          disconnectedColor = "white";
          room.players.white = null;
        } else if (uniquesocket.id === room.players.black) {
          disconnectedColor = "black";
          room.players.black = null;
        } else {
          room.spectators = room.spectators.filter((id) => id !== uniquesocket.id);
        }

        if (disconnectedColor && !room.gameOver) {
          const opponentColor = disconnectedColor === "white" ? "black" : "white";
          if (room.players[opponentColor] || room.isAI) {
            room.gameOver = true;
            room.winner = opponentColor;
            room.gameOverReason = "disconnect";
            // Keep username for recordGame so loss is tracked
            recordGame(room);
            // Now clear the username and emit
            room.usernames[disconnectedColor] = null;
            io.to(roomCode).emit("gameOver", {
              reason: "disconnect",
              winner: opponentColor,
              winnerName: room.usernames[opponentColor] || "",
              disconnectedName: savedUsername || "Opponent",
            });
            console.log(`${savedUsername} disconnected from room ${roomCode}. ${room.usernames[opponentColor]} wins!`);
          } else {
            room.usernames[disconnectedColor] = null;
          }
        } else if (disconnectedColor) {
          room.usernames[disconnectedColor] = null;
        }

        if (disconnectedColor) {
          io.to(roomCode).emit("chatSystem", `${savedUsername || "A player"} disconnected`);
        }

        broadcastRoomState(roomCode);

        if (!room.players.white && !room.players.black && room.spectators.length === 0) {
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted (empty)`);
        }
      }

      socketRooms.delete(uniquesocket.id);
    }

    socketUsers.delete(uniquesocket.id);
  });

  // ---------- Board Theme ----------
  // Board theme is now per-user (stored in localStorage on client)
  // No server-side broadcast needed — each player picks their own theme

  // ---------- Leave Room ----------
  uniquesocket.on("leaveRoom", () => {
    const roomCode = socketRooms.get(uniquesocket.id);
    const username = socketUsers.get(uniquesocket.id);

    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        let disconnectedColor = null;
        const savedUsername = username;

        if (uniquesocket.id === room.players.white) {
          disconnectedColor = "white";
          room.players.white = null;
        } else if (uniquesocket.id === room.players.black) {
          disconnectedColor = "black";
          room.players.black = null;
        } else {
          room.spectators = room.spectators.filter((id) => id !== uniquesocket.id);
        }

        // IMPORTANT: Leave the room BEFORE emitting gameOver
        // so the leaving player does NOT receive the win/loss modal
        uniquesocket.leave(roomCode);

        if (disconnectedColor && !room.gameOver) {
          const opponentColor = disconnectedColor === "white" ? "black" : "white";
          if (room.players[opponentColor] || room.isAI) {
            room.gameOver = true;
            room.winner = opponentColor;
            room.gameOverReason = "abandon";
            // Keep username for recordGame so loss is tracked
            recordGame(room);
            // Now clear and emit
            room.usernames[disconnectedColor] = null;
            io.to(roomCode).emit("gameOver", {
              reason: "abandon",
              winner: opponentColor,
              winnerName: room.usernames[opponentColor] || "",
              disconnectedName: savedUsername || "Opponent",
            });
          } else {
            room.usernames[disconnectedColor] = null;
          }
        } else if (disconnectedColor) {
          room.usernames[disconnectedColor] = null;
        }

        if (disconnectedColor) {
          io.to(roomCode).emit("chatSystem", `${savedUsername || "A player"} left the game`);
        }

        broadcastRoomState(roomCode);

        if (!room.players.white && !room.players.black && room.spectators.length === 0) {
          rooms.delete(roomCode);
        }
      }

      socketRooms.delete(uniquesocket.id);
    }
  });
});

// ============================================================
//  START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, function () {
  console.log(`listening on port:${PORT}`);
});
