import { Chess } from "/vendor/chess.js";

// ============================================================
//  SOCKET & CHESS ENGINE
// ============================================================

const socket = io({
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
  timeout: 8000,
});
const chess = new Chess();

// ============================================================
//  STATE
// ============================================================

let PlayerRole = null;
let currentUsername = null;
let currentRoomCode = null;
let isAIGame = false;
let lastSentMove = null;
let pendingRoomJoin = null;

// --- Piece Image URL (Lichess cburnett SVG set) ---
const PIECE_CDN = "https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/piece/cburnett";

const getPieceImageUrl = (piece) => {
  const colorChar = piece.color === "w" ? "w" : "b";
  const typeChar = piece.type.toUpperCase();
  return `${PIECE_CDN}/${colorChar}${typeChar}.svg`;
};

const getPieceUnicode = (piece) => {
  const whitePieces = { p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔" };
  const blackPieces = { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" };
  return piece.color === "w" ? whitePieces[piece.type] : blackPieces[piece.type];
};

// ============================================================
//  DOM REFERENCES
// ============================================================

// Screens
const authScreen = document.getElementById("auth-screen");
const lobbyScreen = document.getElementById("lobby-screen");
const waitingScreen = document.getElementById("waiting-screen");
const gameScreen = document.getElementById("game-screen");
const offlineGameScreen = document.getElementById("offline-game-screen");

// Auth elements
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const signupUsername = document.getElementById("signup-username");
const signupPassword = document.getElementById("signup-password");
const signupConfirm = document.getElementById("signup-confirm");
const loginError = document.getElementById("login-error");
const signupError = document.getElementById("signup-error");
const btnLogin = document.getElementById("btn-login");
const btnSignup = document.getElementById("btn-signup");
const showSignup = document.getElementById("show-signup");
const showLogin = document.getElementById("show-login");

// Lobby elements
const lobbyUsernameEl = document.getElementById("lobby-username");
const btnLogout = document.getElementById("btn-logout");
const btnCreateRoom = document.getElementById("btn-create-room");
const btnJoinRoom = document.getElementById("btn-join-room");
const joinRoomCodeInput = document.getElementById("join-room-code");
const joinError = document.getElementById("join-error");
const btnProfile = document.getElementById("btn-profile");
const btnPlayAI = document.getElementById("btn-play-ai");
const profileModal = document.getElementById("profile-modal");
const btnCloseProfile = document.getElementById("btn-close-profile");

// Waiting elements
const roomCodeDisplay = document.getElementById("room-code-display");
const btnCopyCode = document.getElementById("btn-copy-code");
const copyFeedback = document.getElementById("copy-feedback");
const btnBackLobby = document.getElementById("btn-back-lobby");

// Game elements
const boardElement = document.querySelector(".chessboard");
const offlineBoardEl = document.getElementById("offline-chessboard");
const connectionStatus = document.getElementById("connection-status");
const statusDot = connectionStatus ? connectionStatus.querySelector(".status-dot") : null;
const gameStatusBanner = document.getElementById("game-status");
const statusText = document.getElementById("status-text");
const moveListEl = document.getElementById("move-list");
const capturedByWhiteEl = document.getElementById("captured-by-white");
const capturedByBlackEl = document.getElementById("captured-by-black");
const playerTopEl = document.getElementById("player-top");
const playerBottomEl = document.getElementById("player-bottom");
const btnLeaveGame = document.getElementById("btn-leave-game");
const btnResign = document.getElementById("btn-resign");
const gameRoomCode = document.getElementById("game-room-code");

// Modal elements
const gameoverModal = document.getElementById("gameover-modal");
const modalIcon = document.getElementById("modal-icon");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const btnModalLobby = document.getElementById("btn-modal-lobby");

// Drag state
let draggedPiece = null;
let sourceSquare = null;

// ============================================================
//  SCREEN MANAGEMENT
// ============================================================

function showScreen(screen) {
  // Hide all screens
  [authScreen, lobbyScreen, waitingScreen, gameScreen, offlineGameScreen].forEach((s) => {
    if (s) s.classList.remove("active-screen");
  });
  // Show target screen
  screen.classList.add("active-screen");

  // App Install/Download Popup: ONLY on Login or Signup (authScreen)
  const pwaPopup = document.getElementById("pwa-install-popup");
  if (pwaPopup) {
    const isDismissed = localStorage.getItem("pwa-install-dismissed") === "true";
    if (screen === authScreen && isMobile() && !isDismissed && deferredPrompt) {
      pwaPopup.style.display = "block";
    } else {
      pwaPopup.style.display = "none";
    }
  }
}

// ============================================================
//  AUTH LOGIC
// ============================================================

// Toggle between login and signup forms
showSignup.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.style.display = "none";
  signupForm.style.display = "block";
  clearErrors();
});

showLogin.addEventListener("click", (e) => {
  e.preventDefault();
  signupForm.style.display = "none";
  loginForm.style.display = "block";
  clearErrors();
});

function clearErrors() {
  loginError.style.display = "none";
  signupError.style.display = "none";
  joinError.style.display = "none";
}

function showError(el, message) {
  el.textContent = message;
  el.style.display = "block";
  // Shake animation
  el.classList.remove("shake");
  void el.offsetWidth; // reflow trigger
  el.classList.add("shake");
}

// Login
btnLogin.addEventListener("click", async () => {
  clearErrors();
  const username = loginUsername.value.trim();
  const password = loginPassword.value;

  if (!username || !password) {
    showError(loginError, "Please fill in all fields");
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = "Logging in...";

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.success) {
      currentUsername = data.username;
      if (pendingRoomJoin) {
        socket.emit("joinRoom", { roomCode: pendingRoomJoin, username: currentUsername });
        pendingRoomJoin = null;
      } else {
        goToLobby();
      }
    } else {
      showError(loginError, data.error);
    }
  } catch (err) {
    showError(loginError, "Connection error. Try again.");
  }

  btnLogin.disabled = false;
  btnLogin.textContent = "Sign In";
});

// Signup
btnSignup.addEventListener("click", async () => {
  clearErrors();
  const username = signupUsername.value.trim();
  const password = signupPassword.value;
  const confirm = signupConfirm.value;

  if (!username || !password || !confirm) {
    showError(signupError, "Please fill in all fields");
    return;
  }
  if (password !== confirm) {
    showError(signupError, "Passwords don't match");
    return;
  }

  btnSignup.disabled = true;
  btnSignup.textContent = "Creating account...";

  try {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.success) {
      currentUsername = data.username;
      if (pendingRoomJoin) {
        socket.emit("joinRoom", { roomCode: pendingRoomJoin, username: currentUsername });
        pendingRoomJoin = null;
      } else {
        goToLobby();
      }
    } else {
      showError(signupError, data.error);
    }
  } catch (err) {
    showError(signupError, "Connection error. Try again.");
  }

  btnSignup.disabled = false;
  btnSignup.textContent = "Create Account";
});

// Enter key support for auth forms
loginUsername.addEventListener("keydown", (e) => { if (e.key === "Enter") btnLogin.click(); });
loginPassword.addEventListener("keydown", (e) => { if (e.key === "Enter") btnLogin.click(); });
signupUsername.addEventListener("keydown", (e) => { if (e.key === "Enter") btnSignup.click(); });
signupPassword.addEventListener("keydown", (e) => { if (e.key === "Enter") btnSignup.click(); });
signupConfirm.addEventListener("keydown", (e) => { if (e.key === "Enter") btnSignup.click(); });

// ============================================================
//  LOBBY LOGIC
// ============================================================

function goToLobby() {
  showScreen(lobbyScreen);
  lobbyUsernameEl.textContent = currentUsername;
  PlayerRole = null;
  currentRoomCode = null;
  isAIGame = false;
  clearErrors();
  // Reset game clock
  stopClientTimer();
  clientTimerValue = null;
  const clockEl = document.getElementById("game-clock");
  if (clockEl) { clockEl.style.display = "none"; clockEl.classList.remove("timer-low"); }
  const timerEl = document.getElementById("game-timer");
  if (timerEl) timerEl.textContent = "--:--";
  
  // Clear URL parameters when returning to lobby
  if (window.location.search) {
    window.history.replaceState(null, "", window.location.pathname);
  }
}

// Logout — clear server cookie + client state
btnLogout.addEventListener("click", async () => {
  try { await fetch("/api/logout", { method: "POST" }); } catch (e) { }
  currentUsername = null;
  loginUsername.value = "";
  loginPassword.value = "";
  signupUsername.value = "";
  signupPassword.value = "";
  signupConfirm.value = "";
  showScreen(authScreen);
  loginForm.style.display = "block";
  signupForm.style.display = "none";
});

// Create Room (with color selection)
btnCreateRoom.addEventListener("click", () => {
  isAIGame = false;
  const color = document.querySelector('input[name="create-color"]:checked')?.value || "white";
  const timeControl = document.querySelector('input[name="create-time"]:checked')?.value || "600";
  btnCreateRoom.disabled = true;
  btnCreateRoom.textContent = "Creating...";
  socket.emit("createRoom", { username: currentUsername, color, timeControl });
});

// Play vs AI
if (btnPlayAI) {
  btnPlayAI.addEventListener("click", () => {
    const difficulty = document.querySelector('input[name="ai-diff"]:checked')?.value || "medium";
    const color = document.querySelector('input[name="ai-color"]:checked')?.value || "white";
    const timeControl = document.querySelector('input[name="ai-time"]:checked')?.value || "600";
    isAIGame = true;
    btnPlayAI.disabled = true;
    btnPlayAI.textContent = "Starting...";
    socket.emit("playAI", { username: currentUsername, difficulty, color, timeControl });
    setTimeout(() => {
      btnPlayAI.disabled = false;
      btnPlayAI.textContent = "Play AI";
    }, 2000);
  });
}

// Profile
if (btnProfile) {
  btnProfile.addEventListener("click", async () => {
    if (!currentUsername) return;
    try {
      const res = await fetch(`/api/profile/${currentUsername}`);
      const data = await res.json();
      if (!res.ok) return;

      document.getElementById("profile-name").textContent = data.username;
      document.getElementById("profile-since").textContent = `Member since ${new Date(data.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
      document.getElementById("stat-games").textContent = data.stats.gamesPlayed;
      document.getElementById("stat-wins").textContent = data.stats.wins;
      document.getElementById("stat-losses").textContent = data.stats.losses;
      document.getElementById("stat-draws").textContent = data.stats.draws;

      const wp = data.winPercentage || 0;
      const fill = document.getElementById("winrate-fill");
      fill.style.width = wp + "%";
      fill.textContent = wp + "%";

      // Render Streak data
      document.getElementById("streak-current").textContent = data.streak.current;
      document.getElementById("streak-best").textContent = data.streak.best;
      
      const streakRow = document.getElementById("streak-days-row");
      if (streakRow) {
        streakRow.innerHTML = data.streak.weeklyActivity.map(act => {
          return `<div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <span style="font-size: 10px; color: var(--text-muted); font-weight: 500;">${act.day.substring(0, 1)}</span>
            <span style="font-size: 14px;">${act.active ? "🔥" : "⚪"}</span>
          </div>`;
        }).join("");
      }

      // Render Color Performance data
      document.getElementById("white-record").textContent = `${data.colorPerf.white.wins}W - ${data.colorPerf.white.losses}L - ${data.colorPerf.white.draws}D`;
      document.getElementById("white-total").textContent = data.colorPerf.white.total;
      
      document.getElementById("black-record").textContent = `${data.colorPerf.black.wins}W - ${data.colorPerf.black.losses}L - ${data.colorPerf.black.draws}D`;
      document.getElementById("black-total").textContent = data.colorPerf.black.total;

      // Render Metrics
      document.getElementById("metric-avg-moves").textContent = data.metrics.avgMoves;
      const avgMins = Math.floor(data.metrics.avgDuration / 60);
      const avgSecs = data.metrics.avgDuration % 60;
      document.getElementById("metric-avg-duration").textContent = `${avgMins}m ${avgSecs}s`;

      // Render Time Control breakdown
      document.getElementById("tc-bullet-record").textContent = `${data.timeControlStats.bullet.wins} - ${data.timeControlStats.bullet.losses} - ${data.timeControlStats.bullet.draws}`;
      document.getElementById("tc-bullet-total").textContent = data.timeControlStats.bullet.total;
      
      document.getElementById("tc-blitz-record").textContent = `${data.timeControlStats.blitz.wins} - ${data.timeControlStats.blitz.losses} - ${data.timeControlStats.blitz.draws}`;
      document.getElementById("tc-blitz-total").textContent = data.timeControlStats.blitz.total;
      
      document.getElementById("tc-rapid-record").textContent = `${data.timeControlStats.rapid.wins} - ${data.timeControlStats.rapid.losses} - ${data.timeControlStats.rapid.draws}`;
      document.getElementById("tc-rapid-total").textContent = data.timeControlStats.rapid.total;

      // Recent games
      const recentEl = document.getElementById("recent-games");
      if (data.recentGames.length === 0) {
        recentEl.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;">No games yet</p>';
      } else {
        recentEl.innerHTML = data.recentGames.map((g) => {
          const isWin = g.result === (g.myColor === "white" ? "white_win" : "black_win");
          const isDraw = g.result === "draw";
          const resultClass = isDraw ? "draw" : isWin ? "win" : "loss";
          const resultText = isDraw ? "Draw" : isWin ? "Win" : "Loss";
          const mins = Math.floor(g.duration / 60);
          const secs = g.duration % 60;
          const duration = `${mins}m ${secs}s`;
          return `<div class="game-record ${resultClass}">
            <span class="game-result-badge">${resultText}</span>
            <span class="game-opponent">vs ${g.opponent}${g.isAI ? ' 🤖' : ''}</span>
            <span class="game-meta">${g.totalMoves} moves · ${duration}</span>
          </div>`;
        }).join("");
      }

      profileModal.style.display = "flex";
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  });
}

if (btnCloseProfile) {
  btnCloseProfile.addEventListener("click", () => {
    profileModal.style.display = "none";
  });
}
if (profileModal) {
  profileModal.addEventListener("click", (e) => {
    if (e.target === profileModal) profileModal.style.display = "none";
  });
}

// Join Room
btnJoinRoom.addEventListener("click", () => {
  clearErrors();
  const code = joinRoomCodeInput.value.trim().toUpperCase();

  if (!code || code.length !== 6) {
    showError(joinError, "Please enter a valid 6-letter room code");
    return;
  }

  btnJoinRoom.disabled = true;
  btnJoinRoom.textContent = "Joining...";
  socket.emit("joinRoom", { roomCode: code, username: currentUsername });
});

joinRoomCodeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnJoinRoom.click();
});

// ============================================================
//  WAITING ROOM LOGIC
// ============================================================

btnCopyCode.addEventListener("click", () => {
  if (currentRoomCode) {
    navigator.clipboard.writeText(currentRoomCode).then(() => {
      copyFeedback.style.display = "block";
      setTimeout(() => { copyFeedback.style.display = "none"; }, 2000);
    });
  }
});

btnBackLobby.addEventListener("click", () => {
  socket.emit("leaveRoom");
  goToLobby();
});

// ============================================================
//  GAME LOGIC (existing code preserved + enhanced)
// ============================================================

// --- Connection Status ---
socket.on("connect", () => {
  if (statusDot) statusDot.classList.add("connected");
  updateConnectionText("Connected");
  // Auto-rejoin room on reconnect
  if (currentRoomCode && currentUsername) {
    socket.emit("joinRoom", { roomCode: currentRoomCode, username: currentUsername });
  }
});

socket.on("disconnect", () => {
  if (statusDot) statusDot.classList.remove("connected");
  updateConnectionText("Reconnecting…");
});

socket.io.on("reconnect_attempt", (attempt) => {
  updateConnectionText(`Reconnecting (${attempt})…`);
});

socket.io.on("reconnect_failed", () => {
  updateConnectionText("Connection lost");
});

// Opponent disconnect/reconnect grace period UI
let disconnectBannerTimeout = null;

socket.on("opponentDisconnected", (data) => {
  if (gameStatusBanner && statusText) {
    statusText.textContent = `⚠ ${data.disconnectedName} lost connection. Waiting ${data.gracePeriod}s…`;
    gameStatusBanner.className = "game-status-banner check";
    gameStatusBanner.style.display = "block";
    // Countdown
    let remaining = data.gracePeriod;
    if (disconnectBannerTimeout) clearInterval(disconnectBannerTimeout);
    disconnectBannerTimeout = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(disconnectBannerTimeout);
        disconnectBannerTimeout = null;
        return;
      }
      if (statusText) statusText.textContent = `⚠ ${data.disconnectedName} lost connection. Waiting ${remaining}s…`;
    }, 1000);
  }
});

socket.on("opponentReconnected", () => {
  if (disconnectBannerTimeout) {
    clearInterval(disconnectBannerTimeout);
    disconnectBannerTimeout = null;
  }
  if (gameStatusBanner) {
    gameStatusBanner.style.display = "none";
  }
  updateGameStatus();
});

function updateConnectionText(text) {
  if (connectionStatus) {
    let textSpan = connectionStatus.querySelector(".connection-text");
    if (!textSpan) {
      textSpan = document.createElement("span");
      textSpan.classList.add("connection-text");
      connectionStatus.appendChild(textSpan);
    }
    textSpan.textContent = text;
  }
}

// --- Render Board ---
let selectedSquare = null; // For click-to-move
let lastMove = null; // { from: {row,col}, to: {row,col} }

// Preload piece images to prevent flicker
const pieceImageCache = {};
function preloadPieceImages() {
  const colors = ["w", "b"];
  const types = ["K", "Q", "R", "B", "N", "P"];
  colors.forEach((c) => {
    types.forEach((t) => {
      const url = `${PIECE_CDN}/${c}${t}.svg`;
      const img = new Image();
      img.src = url;
      pieceImageCache[`${c}${t}`] = img;
    });
  });
}

// Sound effects using Web Audio API
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}

function playMoveSound() {
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.12);
}

function playCaptureSound() {
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "triangle";
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.18);
}

function playCheckSound() {
  ensureAudio();
  for (let i = 0; i < 2; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(i === 0 ? 880 : 660, audioCtx.currentTime + i * 0.1);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.1 + 0.12);
    osc.start(audioCtx.currentTime + i * 0.1);
    osc.stop(audioCtx.currentTime + i * 0.1 + 0.12);
  }
}

function playGameOverSound() {
  ensureAudio();
  const notes = [880, 784, 660, 440];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.15);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.15 + 0.3);
    osc.start(audioCtx.currentTime + i * 0.15);
    osc.stop(audioCtx.currentTime + i * 0.15 + 0.3);
  });
}

// Get legal moves for a square position
function getLegalMovesFrom(row, col) {
  const sq = `${String.fromCharCode(97 + col)}${8 - row}`;
  return chess.moves({ square: sq, verbose: true });
}

// Convert algebraic notation to row/col
function algebraicToRowCol(sq) {
  return {
    row: 8 - parseInt(sq[1]),
    col: sq.charCodeAt(0) - 97,
  };
}

// Clear selection
function clearSelection() {
  selectedSquare = null;
  document.querySelectorAll(".square.selected").forEach((el) => el.classList.remove("selected"));
  document.querySelectorAll(".legal-dot").forEach((el) => el.remove());
  document.querySelectorAll(".legal-capture").forEach((el) => el.classList.remove("legal-capture"));
}

// Show legal move indicators
function showLegalMoves(row, col) {
  const moves = getLegalMovesFrom(row, col);
  moves.forEach((move) => {
    const target = algebraicToRowCol(move.to);
    const targetSquare = boardElement.querySelector(
      `.square[data-row="${target.row}"][data-col="${target.col}"]`
    );
    if (!targetSquare) return;

    if (move.captured) {
      // Capture indicator — ring around the piece
      targetSquare.classList.add("legal-capture");
    } else {
      // Move indicator — small dot
      const dot = document.createElement("div");
      dot.classList.add("legal-dot");
      targetSquare.appendChild(dot);
    }
  });
}

// Animate piece from source to target, then re-render
function animateMove(fromRow, fromCol, toRow, toCol, callback) {
  const fromSquare = boardElement.querySelector(
    `.square[data-row="${fromRow}"][data-col="${fromCol}"]`
  );
  const toSquare = boardElement.querySelector(
    `.square[data-row="${toRow}"][data-col="${toCol}"]`
  );

  if (!fromSquare || !toSquare) {
    callback();
    return;
  }

  const piece = fromSquare.querySelector(".piece");
  if (!piece) {
    callback();
    return;
  }

  const fromRect = fromSquare.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();
  const dx = toRect.left - fromRect.left;
  const dy = toRect.top - fromRect.top;

  // Remove any existing target piece (capture visual)
  const targetPieceEl = toSquare.querySelector(".piece");
  if (targetPieceEl) {
    targetPieceEl.style.transition = "opacity 0.15s ease";
    targetPieceEl.style.opacity = "0";
  }

  // Elevate piece above others during animation
  piece.style.zIndex = "100";
  piece.style.transition = "transform 0.18s cubic-bezier(0.25, 0.1, 0.25, 1)";
  piece.style.transform = `translate(${dx}px, ${dy}px)`;

  // Use a single reliable callback mechanism
  let called = false;
  const done = () => {
    if (called) return;
    called = true;
    callback();
  };
  piece.addEventListener("transitionend", done, { once: true });
  setTimeout(done, 220); // tight fallback
}

function createPieceDOM(square, rowindex, squareindex) {
  const pieceElement = document.createElement("div");
  pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
  
  const img = document.createElement("img");
  img.src = getPieceImageUrl(square);
  img.alt = getPieceUnicode(square);
  img.classList.add("piece-img");
  img.setAttribute("data-type", square.type);
  img.draggable = false;
  pieceElement.appendChild(img);
  
  pieceElement.draggable = PlayerRole === square.color;
  if (pieceElement.draggable) {
    pieceElement.classList.add("draggable");
  }
  
  // Drag events
  pieceElement.addEventListener("dragstart", (e) => {
    if (pieceElement.draggable) {
      clearSelection();
      draggedPiece = pieceElement;
      sourceSquare = { row: rowindex, col: squareindex };
      e.dataTransfer.setData("text/plain", "");
      if (img.complete) {
        e.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);
      }
      setTimeout(() => {
        pieceElement.classList.add("dragging");
      }, 0);
    }
  });
  pieceElement.addEventListener("dragend", () => {
    if (draggedPiece) {
      draggedPiece.classList.remove("dragging");
    }
    draggedPiece = null;
    sourceSquare = null;
  });
  
  return pieceElement;
}

function handleSquareClick(rowindex, squareindex, squareElement) {
  const board = chess.board();
  const square = board[rowindex][squareindex];

  if (selectedSquare) {
    // Second click — try to move
    const targetRow = rowindex;
    const targetCol = squareindex;

    if (targetRow === selectedSquare.row && targetCol === selectedSquare.col) {
      // Clicked same square — deselect
      clearSelection();
      return;
    }

    // Check if this is a legal move
    const moves = getLegalMovesFrom(selectedSquare.row, selectedSquare.col);
    const targetAlg = `${String.fromCharCode(97 + targetCol)}${8 - targetRow}`;
    const isLegal = moves.some((m) => m.to === targetAlg);

    if (isLegal) {
      handleMove(selectedSquare, { row: targetRow, col: targetCol });
      clearSelection();
    } else if (square && square.color === PlayerRole) {
      // Clicked own piece — select it instead
      clearSelection();
      selectedSquare = { row: rowindex, col: squareindex };
      squareElement.classList.add("selected");
      showLegalMoves(rowindex, squareindex);
    } else {
      clearSelection();
    }
  } else {
    // First click — select piece
    if (square && square.color === PlayerRole) {
      clearSelection();
      selectedSquare = { row: rowindex, col: squareindex };
      squareElement.classList.add("selected");
      showLegalMoves(rowindex, squareindex);
    }
  }
}

const renderBoard = (() => {
  let renderQueued = false;
  
  const doRender = () => {
    renderQueued = false;
    const board = chess.board();
    
    // Ensure 64 square elements exist in the board container
    let squares = boardElement.querySelectorAll(".square");
    const isFlipped = PlayerRole === "b";
    
    if (squares.length !== 64) {
      // Re-create squares if not initialized
      boardElement.innerHTML = "";
      const fragment = document.createDocumentFragment();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const squareElement = document.createElement("div");
          squareElement.classList.add("square");
          squareElement.dataset.row = r;
          squareElement.dataset.col = c;
          
          // Click-to-move
          squareElement.addEventListener("click", () => {
            if (!PlayerRole || PlayerRole !== chess.turn()) return;
            const row = parseInt(squareElement.dataset.row);
            const col = parseInt(squareElement.dataset.col);
            handleSquareClick(row, col, squareElement);
          });
          
          // Drag over/leave/drop events on squares
          squareElement.addEventListener("dragover", (e) => {
            e.preventDefault();
            squareElement.classList.add("drop-target");
          });
          squareElement.addEventListener("dragleave", () => {
            squareElement.classList.remove("drop-target");
          });
          squareElement.addEventListener("drop", (e) => {
            e.preventDefault();
            squareElement.classList.remove("drop-target");
            clearSelection();
            if (draggedPiece) {
              const targetSource = {
                row: parseInt(squareElement.dataset.row),
                col: parseInt(squareElement.dataset.col),
              };
              handleMove(sourceSquare, targetSource);
            }
          });
          
          fragment.appendChild(squareElement);
        }
      }
      boardElement.appendChild(fragment);
      squares = boardElement.querySelectorAll(".square");
    }
    
    // Set board flipped class
    if (isFlipped) {
      boardElement.classList.add("flipped");
    } else {
      boardElement.classList.remove("flipped");
    }
    
    // Update individual squares
    squares.forEach((squareElement) => {
      const rowindex = parseInt(squareElement.dataset.row);
      const squareindex = parseInt(squareElement.dataset.col);
      const square = board[rowindex][squareindex];
      
      // Update light/dark classes and state classes
      squareElement.className = "square " + ((rowindex + squareindex) % 2 === 0 ? "light" : "dark");
      
      // Re-apply highlights/checks
      if (lastMove) {
        if (
          (rowindex === lastMove.from.row && squareindex === lastMove.from.col) ||
          (rowindex === lastMove.to.row && squareindex === lastMove.to.col)
        ) {
          squareElement.classList.add("highlight");
        }
      }
      
      if (selectedSquare && rowindex === selectedSquare.row && squareindex === selectedSquare.col) {
        squareElement.classList.add("selected");
      }
      
      if (square && square.type === "k") {
        if (chess.isCheckmate() && chess.turn() === square.color) {
          squareElement.classList.add("king-checkmate");
        } else if (chess.isCheck() && chess.turn() === square.color) {
          squareElement.classList.add("king-in-check");
        }
      }
      
      // Reuse piece elements
      let pieceElement = squareElement.querySelector(".piece");
      
      if (!square) {
        if (pieceElement) {
          pieceElement.remove();
        }
      } else {
        const pieceColor = square.color === "w" ? "white" : "black";
        
        if (pieceElement) {
          const img = pieceElement.querySelector(".piece-img");
          // If color or type is different, replace it
          if (!pieceElement.classList.contains(pieceColor) || (img && img.getAttribute("data-type") !== square.type)) {
            pieceElement.remove();
            pieceElement = createPieceDOM(square, rowindex, squareindex);
            squareElement.appendChild(pieceElement);
          } else {
            // Update draggability
            pieceElement.draggable = PlayerRole === square.color;
            pieceElement.classList.toggle("draggable", pieceElement.draggable);
          }
        } else {
          pieceElement = createPieceDOM(square, rowindex, squareindex);
          squareElement.appendChild(pieceElement);
        }
      }
    });
    
    updatePlayerBars();
    updateGameStatus();
    updateCapturedPieces();
  };
  
  return () => {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(doRender);
  };
})();

// --- Handle Move ---
const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q",
  };

  // Safe immediate local updates (speculative/optimistic rendering)
  try {
    const moveResult = chess.move(move);
    if (moveResult) {
      lastMove = { from: source, to: target };
      lastSentMove = { from: move.from, to: move.to };
      renderBoard();
      updateMoveList();
      
      // Play appropriate sound immediately
      if (chess.isCheckmate() || chess.isStalemate() || chess.isDraw()) {
        playGameOverSound();
      } else if (chess.isCheck()) {
        playCheckSound();
      } else if (moveResult.captured) {
        playCaptureSound();
      } else {
        playMoveSound();
      }
    }
  } catch (e) {
    console.error("Local move validation failed:", e);
    return;
  }

  socket.emit("move", move);
};

// ============================================================
//  MOBILE TOUCH DRAG SUPPORT
//  HTML5 drag-and-drop doesn't work on mobile browsers.
//  This adds touchstart/touchmove/touchend for both boards.
// ============================================================

let touchDragState = null; // { ghost, source, boardEl, isOffline }

function createTouchGhost(pieceEl) {
  const ghost = pieceEl.cloneNode(true);
  ghost.classList.add("touch-drag-ghost");
  ghost.style.position = "fixed";
  ghost.style.pointerEvents = "none";
  ghost.style.zIndex = "10000";
  ghost.style.width = pieceEl.offsetWidth + "px";
  ghost.style.height = pieceEl.offsetHeight + "px";
  ghost.style.opacity = "0.85";
  ghost.style.transform = "scale(1.15)";
  ghost.style.filter = "drop-shadow(0 4px 12px rgba(0,0,0,0.4))";
  document.body.appendChild(ghost);
  return ghost;
}

function getSquareFromPoint(x, y, boardEl) {
  // Hide the ghost temporarily so elementFromPoint hits the board
  const ghosts = document.querySelectorAll(".touch-drag-ghost");
  ghosts.forEach(g => g.style.display = "none");

  const el = document.elementFromPoint(x, y);

  ghosts.forEach(g => g.style.display = "");

  if (!el) return null;
  const sq = el.closest(".square");
  if (!sq || !boardEl.contains(sq)) return null;
  return { row: parseInt(sq.dataset.row), col: parseInt(sq.dataset.col) };
}

function setupTouchDrag(boardEl, isOffline) {
  boardEl.addEventListener("touchstart", (e) => {
    // Only handle 1-finger touches
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;

    const pieceEl = target.closest(".piece");
    const squareEl = target.closest(".square");
    if (!pieceEl || !squareEl || !boardEl.contains(squareEl)) return;

    // Check if this piece is draggable
    if (!pieceEl.draggable) return;

    const row = parseInt(squareEl.dataset.row);
    const col = parseInt(squareEl.dataset.col);

    touchDragState = {
      source: { row, col },
      originalPiece: pieceEl,
      boardEl,
      isOffline,
      startX: touch.clientX,
      startY: touch.clientY,
      hasMoved: false,
      ghost: null
    };
  }, { passive: true });

  boardEl.addEventListener("touchmove", (e) => {
    if (!touchDragState || touchDragState.boardEl !== boardEl) return;

    const touch = e.touches[0];
    const dx = touch.clientX - touchDragState.startX;
    const dy = touch.clientY - touchDragState.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If they haven't moved enough yet, check if we should start the drag
    if (!touchDragState.hasMoved) {
      if (distance > 8) {
        touchDragState.hasMoved = true;
        // Create ghost and fade original piece now!
        const ghost = createTouchGhost(touchDragState.originalPiece);
        touchDragState.ghost = ghost;
        touchDragState.originalPiece.style.opacity = "0.3";
      } else {
        return; // Don't drag yet
      }
    }

    // If we are dragging, prevent default scrolling
    if (e.cancelable) {
      e.preventDefault();
    }

    const ghost = touchDragState.ghost;
    if (ghost) {
      ghost.style.left = (touch.clientX - ghost.offsetWidth / 2) + "px";
      ghost.style.top = (touch.clientY - ghost.offsetHeight / 2) + "px";
    }

    // Highlight the square under the finger
    boardEl.querySelectorAll(".square.drop-target").forEach(sq => sq.classList.remove("drop-target"));
    const sq = getSquareFromPoint(touch.clientX, touch.clientY, boardEl);
    if (sq) {
      const targetEl = boardEl.querySelector(`.square[data-row="${sq.row}"][data-col="${sq.col}"]`);
      if (targetEl) targetEl.classList.add("drop-target");
    }
  }, { passive: false });

  boardEl.addEventListener("touchend", (e) => {
    if (!touchDragState || touchDragState.boardEl !== boardEl) return;

    // If they actually dragged the piece
    if (touchDragState.hasMoved) {
      e.preventDefault(); // Prevent ghost click

      const touch = e.changedTouches[0];
      const dropTarget = getSquareFromPoint(touch.clientX, touch.clientY, boardEl);

      // Cleanup
      if (touchDragState.ghost) {
        touchDragState.ghost.remove();
      }
      if (touchDragState.originalPiece) {
        touchDragState.originalPiece.style.opacity = "";
      }
      boardEl.querySelectorAll(".square.drop-target").forEach(sq => sq.classList.remove("drop-target"));

      if (dropTarget) {
        const source = touchDragState.source;
        if (source.row !== dropTarget.row || source.col !== dropTarget.col) {
          if (touchDragState.isOffline) {
            offlineHandleMove(source, dropTarget);
          } else {
            handleMove(source, dropTarget);
          }
        }
      }
    } else {
      // It was a tap/click!
      // The browser's native click event will naturally fire because we didn't call e.preventDefault()
      // in touchstart or touchend. So click-to-move will work perfectly and immediately!
    }

    touchDragState = null;
  }, { passive: false });

  boardEl.addEventListener("touchcancel", () => {
    if (!touchDragState || touchDragState.boardEl !== boardEl) return;
    if (touchDragState.ghost) {
      touchDragState.ghost.remove();
    }
    if (touchDragState.originalPiece) {
      touchDragState.originalPiece.style.opacity = "";
    }
    boardEl.querySelectorAll(".square.drop-target").forEach(sq => sq.classList.remove("drop-target"));
    touchDragState = null;
  }, { passive: false });
}

// Setup touch drag for online board
if (boardElement) setupTouchDrag(boardElement, false);
// --- Update Player Info Bars ---
function updatePlayerBars() {
  const turn = chess.turn();

  if (playerTopEl && playerBottomEl) {
    const isBlack = PlayerRole === "b";
    const topColor = isBlack ? "w" : "b";
    const bottomColor = isBlack ? "b" : "w";

    // Active state
    playerTopEl.classList.toggle("active", turn === topColor);
    playerBottomEl.classList.toggle("active", turn === bottomColor);

    // Update status text
    const topStatus = playerTopEl.querySelector(".player-status");
    const bottomStatus = playerBottomEl.querySelector(".player-status");

    if (topStatus) {
      topStatus.textContent = turn === topColor ? "Thinking…" : "Waiting…";
    }
    if (bottomStatus) {
      bottomStatus.textContent =
        turn === bottomColor ? "Your turn" : "Waiting…";
    }
  }
}

// --- Update Game Status ---
function updateGameStatus() {
  if (!gameStatusBanner || !statusText) return;

  if (chess.isCheckmate()) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    const loser = chess.turn() === "w" ? "White" : "Black";
    statusText.textContent = `♚ Checkmate! ${loser}'s king had no escape — ${winner} wins!`;
    gameStatusBanner.className = "game-status-banner gameover";
    gameStatusBanner.style.display = "block";
  } else if (chess.isStalemate()) {
    statusText.textContent = "½ Stalemate — No legal moves, it's a draw!";
    gameStatusBanner.className = "game-status-banner gameover";
    gameStatusBanner.style.display = "block";
  } else if (chess.isThreefoldRepetition()) {
    statusText.textContent = "½ Threefold Repetition — Draw";
    gameStatusBanner.className = "game-status-banner gameover";
    gameStatusBanner.style.display = "block";
  } else if (chess.isInsufficientMaterial()) {
    statusText.textContent = "½ Insufficient Material — Draw";
    gameStatusBanner.className = "game-status-banner gameover";
    gameStatusBanner.style.display = "block";
  } else if (chess.isDraw()) {
    statusText.textContent = "½ Draw — Game Over";
    gameStatusBanner.className = "game-status-banner gameover";
    gameStatusBanner.style.display = "block";
  } else if (chess.isCheck()) {
    statusText.textContent = "⚠ Check!";
    gameStatusBanner.className = "game-status-banner check";
    gameStatusBanner.style.display = "block";
  } else if (PlayerRole === null) {
    statusText.textContent = "👁 Spectating";
    gameStatusBanner.className = "game-status-banner info";
    gameStatusBanner.style.display = "block";
  } else {
    gameStatusBanner.style.display = "none";
  }
}

// --- Update Move History Panel ---
function updateMoveList() {
  if (!moveListEl) return;

  const history = chess.history();

  if (history.length === 0) {
    moveListEl.innerHTML = '<div class="move-placeholder">No moves yet</div>';
    return;
  }

  moveListEl.innerHTML = "";
  for (let i = 0; i < history.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const row = document.createElement("div");
    row.classList.add("move-row");
    if (i + 2 >= history.length) row.classList.add("latest");

    const numEl = document.createElement("span");
    numEl.classList.add("move-number");
    numEl.textContent = moveNum + ".";

    const whiteMove = document.createElement("span");
    whiteMove.classList.add("move-white");
    whiteMove.textContent = history[i] || "";

    const blackMove = document.createElement("span");
    blackMove.classList.add("move-black");
    blackMove.textContent = history[i + 1] || "";

    row.appendChild(numEl);
    row.appendChild(whiteMove);
    row.appendChild(blackMove);
    moveListEl.appendChild(row);
  }

  // Auto-scroll to latest move
  moveListEl.scrollTop = moveListEl.scrollHeight;
}

// --- Update Captured Pieces ---
function updateCapturedPieces() {
  if (!capturedByWhiteEl || !capturedByBlackEl) return;

  const board = chess.board();
  const currentPieces = { w: {}, b: {} };

  board.forEach((row) => {
    row.forEach((sq) => {
      if (sq) {
        currentPieces[sq.color][sq.type] =
          (currentPieces[sq.color][sq.type] || 0) + 1;
      }
    });
  });

  const startingPieces = { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 };
  const capturedWhite = [];
  const capturedBlack = [];

  const whitePieceSymbols = {
    p: "♙",
    r: "♖",
    n: "♘",
    b: "♗",
    q: "♕",
    k: "♔",
  };
  const blackPieceSymbols = {
    p: "♟",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
  };

  for (const type in startingPieces) {
    const wMissing = startingPieces[type] - (currentPieces.w[type] || 0);
    const bMissing = startingPieces[type] - (currentPieces.b[type] || 0);
    for (let i = 0; i < wMissing; i++)
      capturedWhite.push(whitePieceSymbols[type]);
    for (let i = 0; i < bMissing; i++)
      capturedBlack.push(blackPieceSymbols[type]);
  }

  capturedByBlackEl.textContent = capturedWhite.join(" ");
  capturedByWhiteEl.textContent = capturedBlack.join(" ");
}

// ============================================================
//  SOCKET EVENTS — ROOM MANAGEMENT
// ============================================================

// Room created successfully
socket.on("roomCreated", (data) => {
  currentRoomCode = data.roomCode;
  roomCodeDisplay.textContent = data.roomCode;
  showScreen(waitingScreen);

  // Reset button state
  btnCreateRoom.disabled = false;
  btnCreateRoom.textContent = "Create Room";
});

// Room joined successfully
socket.on("roomJoined", (data) => {
  currentRoomCode = data.roomCode;
  if (gameRoomCode) gameRoomCode.textContent = `Room: ${data.roomCode}`;

  // Sync URL query parameters
  const targetSearch = `?room=${data.roomCode}`;
  if (window.location.search !== targetSearch) {
    window.history.replaceState(null, "", targetSearch);
  }

  // Reset button states
  btnJoinRoom.disabled = false;
  btnJoinRoom.textContent = "Join Room";
  if (btnPlayAI) {
    btnPlayAI.disabled = false;
    btnPlayAI.textContent = "Play AI";
  }

  // Handle timer visibility
  const clockEl = document.getElementById("game-clock");
  const timerEl = document.getElementById("game-timer");
  if (clockEl && timerEl) {
    if (data.timeControl && data.timeControl > 0) {
      const m = Math.floor(data.timeControl / 60);
      const s = data.timeControl % 60;
      timerEl.textContent = `${m}:${s.toString().padStart(2, "0")}`;
      clockEl.style.display = "flex";
      clockEl.classList.remove("timer-low");
    } else {
      // Infinite — hide clock completely
      clockEl.style.display = "none";
      timerEl.textContent = "";
    }
  }

  // Hide chat for AI games (no one to chat with)
  const chatPanel = document.getElementById("chat-panel");
  const chatToggle = document.getElementById("btn-chat-toggle");
  if (isAIGame) {
    if (chatPanel) chatPanel.style.display = "none";
    if (chatToggle) chatToggle.style.display = "none";
  } else {
    if (chatPanel) chatPanel.style.display = "";
    if (chatToggle) chatToggle.style.display = "";
  }

  // Go to game screen
  showScreen(gameScreen);
});

// Room error
socket.on("roomError", (message) => {
  showError(joinError, message);
  btnJoinRoom.disabled = false;
  btnJoinRoom.textContent = "Join Room";
});

// ============================================================
//  SOCKET EVENTS — GAME
// ============================================================

socket.on("playerRole", (role) => {
  PlayerRole = role;
  renderBoard();
  updateMoveList();
});

socket.on("spectatorRole", () => {
  PlayerRole = null;
  renderBoard();
  updateMoveList();
});

// ============================================================
//  SMOOTH CLIENT-SIDE TIMER (interpolated at 60fps)
// ============================================================

let clientTimerValue = null;   // current timer value in seconds
let clientTimerAnchor = null;  // performance.now() when last synced
let clientTimerRunning = false;
let clientTimerRAF = null;

function formatTimer(secs) {
  if (secs <= 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function tickClientTimer() {
  const clockEl = document.getElementById("game-clock");
  const timerEl = document.getElementById("game-timer");
  if (!clockEl || !timerEl || clientTimerValue === null) {
    clientTimerRAF = null;
    return;
  }

  if (clientTimerRunning && clientTimerAnchor !== null) {
    const elapsed = (performance.now() - clientTimerAnchor) / 1000;
    const display = Math.max(0, clientTimerValue - elapsed);
    timerEl.textContent = formatTimer(display);
    clockEl.style.display = "flex";
    clockEl.classList.toggle("timer-low", display <= 30);
  }

  clientTimerRAF = requestAnimationFrame(tickClientTimer);
}

function startClientTimer() {
  clientTimerRunning = true;
  if (!clientTimerRAF) {
    clientTimerRAF = requestAnimationFrame(tickClientTimer);
  }
}

function stopClientTimer() {
  clientTimerRunning = false;
  if (clientTimerRAF) {
    cancelAnimationFrame(clientTimerRAF);
    clientTimerRAF = null;
  }
}

// Server sends authoritative time updates; we re-anchor our local timer each time
socket.on("timerUpdate", (data) => {
  const clockEl = document.getElementById("game-clock");
  const timerEl = document.getElementById("game-timer");
  if (!clockEl || !timerEl) return;

  const secs = data.time;

  // Re-anchor client timer
  clientTimerValue = secs;
  clientTimerAnchor = performance.now();

  if (secs <= 0) {
    timerEl.textContent = "0:00";
    clockEl.classList.add("timer-low");
    stopClientTimer();
    return;
  }

  clockEl.style.display = "flex";
  startClientTimer();
});

socket.on("boardState", (fen) => {
  chess.load(fen);
  preloadPieceImages();
  lastMove = null;
  renderBoard();
  updateMoveList();
});

socket.on("move", (move) => {
  // Determine from/to positions for highlighting
  const from = algebraicToRowCol(move.from);
  const to = algebraicToRowCol(move.to);

  // If this move was already applied locally (speculatively), ignore it
  if (lastSentMove && lastSentMove.from === move.from && lastSentMove.to === move.to) {
    lastSentMove = null; // Reset for next move
    return;
  }

  // Check if it's a capture before applying
  const boardBefore = chess.board();
  const targetPiece = boardBefore[to.row] && boardBefore[to.row][to.col];

  // Apply move to chess engine IMMEDIATELY (no animation delay)
  try {
    chess.move(move);
  } catch (e) {
    // Move already applied or invalid — just re-render
    renderBoard();
    updateMoveList();
    return;
  }

  // Store last move for highlighting
  lastMove = { from, to };

  // Play appropriate sound
  if (chess.isCheckmate() || chess.isStalemate() || chess.isDraw()) {
    playGameOverSound();
  } else if (chess.inCheck()) {
    playCheckSound();
  } else if (targetPiece || move.captured) {
    playCaptureSound();
  } else {
    playMoveSound();
  }

  // Re-render immediately — no waiting for animation
  renderBoard();
  updateMoveList();
});

// Player names — update the player bar names
socket.on("playerNames", (data) => {
  if (playerTopEl && playerBottomEl) {
    const isBlack = PlayerRole === "b";
    const topColor = isBlack ? "w" : "b";
    const bottomColor = isBlack ? "b" : "w";

    const topName = playerTopEl.querySelector(".player-name");
    const bottomName = playerBottomEl.querySelector(".player-name");

    if (topName) topName.textContent = topColor === "w" ? (data.white || "Waiting...") : (data.black || "Waiting...");
    if (bottomName) bottomName.textContent = bottomColor === "w" ? (data.white || "Waiting...") : (data.black || "Waiting...");

    // Update avatars based on color
    const topAvatar = playerTopEl.querySelector(".player-avatar");
    const bottomAvatar = playerBottomEl.querySelector(".player-avatar");
    if (topAvatar) topAvatar.textContent = topColor === "w" ? "♔" : "♚";
    if (bottomAvatar) bottomAvatar.textContent = bottomColor === "w" ? "♔" : "♚";
  }
});

// Player count — when both players connected, go to game screen
socket.on("playerCount", (data) => {
  if (playerTopEl && playerBottomEl) {
    const isBlack = PlayerRole === "b";
    const topColor = isBlack ? "w" : "b";
    const bottomColor = isBlack ? "b" : "w";

    const topStatus = playerTopEl.querySelector(".player-status");
    const bottomStatus = playerBottomEl.querySelector(".player-status");

    const topConnected = topColor === "w" ? data.white : data.black;
    const bottomConnected = bottomColor === "w" ? data.white : data.black;

    if (topStatus && !topConnected) {
      topStatus.textContent = "Waiting to join…";
    }
    if (bottomStatus && !bottomConnected) {
      bottomStatus.textContent = "Waiting to join…";
    }
  }

  // If both players are in, switch from waiting to game screen
  if (data.white && data.black) {
    if (waitingScreen.classList.contains("active-screen")) {
      if (gameRoomCode) gameRoomCode.textContent = `Room: ${currentRoomCode}`;
      showScreen(gameScreen);
    }
  }
});

// ============================================================
//  VICTORY CELEBRATION SYSTEM
// ============================================================

let gameStartTime = Date.now();

// --- Victory Quotes ---
const WIN_QUOTES = [
  '"Every chess master was once a beginner." — Irving Chernev',
  '"The beauty of a move lies not in its appearance but in the thought behind it." — Aron Nimzowitsch',
  '"Victory belongs to the most persevering." — Napoleon Bonaparte',
  '"You may learn much more from a game you lose than from a game you win." — José Raúl Capablanca',
  '"Chess is the struggle against error." — Johannes Zukertort',
  '"In chess, as in life, opportunity strikes but once." — Unknown',
  '"The winner of the game is the player who makes the next-to-last mistake." — Savielly Tartakower',
  '"Excellence is not a destination but a continuously growing never-ending process." — Chess Wisdom',
  '"Chess is the gymnasium of the mind." — Blaise Pascal',
  '"I have come to the personal conclusion that while all artists are not chess players, all chess players are artists." — Marcel Duchamp',
];

const LOSS_QUOTES = [
  '"You learn more from your defeats than from your victories." — José Raúl Capablanca',
  '"A loss is not a defeat unless you let it be." — Chess Wisdom',
  '"The good player is always lucky." — José Raúl Capablanca',
  '"Mistakes are the portals of discovery." — James Joyce',
  '"Fall seven times, stand up eight." — Japanese Proverb',
  '"Every defeat is a step toward victory." — Unknown',
  '"The most important thing is to never stop questioning." — Albert Einstein',
  '"In chess, as in life, the comeback is always stronger than the setback." — Unknown',
  '"A smooth sea never made a skilled sailor." — Franklin D. Roosevelt',
  '"Difficult roads often lead to beautiful destinations." — Unknown',
];

const DRAW_QUOTES = [
  '"A draw is sometimes the most brilliant result." — Chess Wisdom',
  '"The beauty of chess lies in the balance of forces." — Unknown',
  '"In the midst of chaos, there is also opportunity." — Sun Tzu',
  '"Equality is the soul of liberty." — Frances Wright',
  '"Balance is not something you find, it is something you create." — Jana Kingsford',
  '"A well-played draw is more beautiful than a swindle." — Mikhail Tal',
  '"The art of war teaches us not to rely on the likelihood of the enemy\'s not coming." — Sun Tzu',
  '"Two minds, equally matched — that is the essence of chess." — Unknown',
];

function getRandomQuote(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Confetti System ---
const confettiCanvas = document.getElementById("confetti-canvas");
const confettiCtx = confettiCanvas ? confettiCanvas.getContext("2d") : null;
let confettiParticles = [];
let confettiAnimId = null;

function resizeConfetti() {
  if (!confettiCanvas) return;
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function createConfetti(count = 150) {
  confettiParticles = [];
  const colors = [
    "#d4af37", "#f0d68a", "#22c55e", "#60a5fa",
    "#f472b6", "#c084fc", "#fb923c", "#fff",
    "#fbbf24", "#a78bfa",
  ];

  for (let i = 0; i < count; i++) {
    confettiParticles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * -window.innerHeight,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
      decay: 0.003 + Math.random() * 0.004,
    });
  }
}

function animateConfetti() {
  if (!confettiCtx || confettiParticles.length === 0) return;

  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  let alive = 0;

  for (const p of confettiParticles) {
    if (p.opacity <= 0) continue;
    alive++;

    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.04; // gravity
    p.rotation += p.rotationSpeed;
    p.opacity -= p.decay;

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rotation * Math.PI) / 180);
    confettiCtx.globalAlpha = Math.max(0, p.opacity);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    confettiCtx.restore();
  }

  if (alive > 0) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiAnimId = null;
  }
}

function launchConfetti() {
  resizeConfetti();
  createConfetti(180);
  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
  animateConfetti();
}

function stopConfetti() {
  if (confettiAnimId) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
  }
  confettiParticles = [];
  if (confettiCtx && confettiCanvas) {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

window.addEventListener("resize", resizeConfetti);

// --- Game Over Handler ---
socket.on("gameOver", (data) => {
  const panel = document.getElementById("gameover-panel");
  const quoteEl = document.getElementById("modal-quote");
  const movesEl = document.getElementById("modal-stat-moves");
  const durationEl = document.getElementById("modal-stat-duration");

  // Determine if current player won
  const myColor = PlayerRole === "w" ? "white" : "black";
  const isWin = data.winner === myColor;
  const isDraw = !data.winner;

  // Set modal theme
  panel.className = "modal glass-panel gameover-modal-content " + (isDraw ? "draw" : isWin ? "win" : "loss");

  let icon, title, message, quote;

  if (data.reason === "checkmate") {
    if (isWin) {
      icon = "👑";
      title = "Checkmate!";
      message = "You delivered checkmate — your opponent's king had no escape. Brilliant!";
      quote = getRandomQuote(WIN_QUOTES);
    } else {
      icon = "♚";
      title = "Checkmate";
      message = `Your king was in check with no escape — ${data.winnerName} wins!`;
      quote = getRandomQuote(LOSS_QUOTES);
    }
  } else if (data.reason === "stalemate") {
    icon = "🤝";
    title = "Stalemate";
    message = "No legal moves available — the game is a draw!";
    quote = getRandomQuote(DRAW_QUOTES);
  } else if (data.reason === "threefold_repetition") {
    icon = "🔄";
    title = "Threefold Repetition";
    message = "The same position occurred three times — draw!";
    quote = getRandomQuote(DRAW_QUOTES);
  } else if (data.reason === "insufficient_material") {
    icon = "♟";
    title = "Insufficient Material";
    message = "Neither player has enough pieces to checkmate — draw!";
    quote = getRandomQuote(DRAW_QUOTES);
  } else if (data.reason === "fifty_move_rule") {
    icon = "⏰";
    title = "50-Move Rule";
    message = "50 moves without a capture or pawn move — draw!";
    quote = getRandomQuote(DRAW_QUOTES);
  } else if (data.reason === "draw") {
    icon = "🤝";
    title = "Draw";
    message = "The game ended in a draw.";
    quote = getRandomQuote(DRAW_QUOTES);
  } else if (data.reason === "resignation") {
    if (isWin) {
      icon = "🏆";
      title = "You Win!";
      message = `${data.resignedName || "Opponent"} resigned — victory is yours!`;
      quote = getRandomQuote(WIN_QUOTES);
    } else {
      icon = "🏳️";
      title = "You Resigned";
      message = `${data.winnerName} wins by resignation.`;
      quote = getRandomQuote(LOSS_QUOTES);
    }
  } else if (data.reason === "disconnect") {
    if (isWin) {
      icon = "🏆";
      title = "You Win!";
      message = `${data.disconnectedName} disconnected — victory is yours!`;
      quote = getRandomQuote(WIN_QUOTES);
    } else {
      icon = "🚪";
      title = "Disconnected";
      message = `You were disconnected. ${data.winnerName} wins.`;
      quote = getRandomQuote(LOSS_QUOTES);
    }
  } else if (data.reason === "abandon") {
    if (isWin) {
      icon = "🏆";
      title = "You Win!";
      message = `${data.disconnectedName} left the game — you win!`;
      quote = getRandomQuote(WIN_QUOTES);
    } else {
      icon = "🏳️";
      title = "Opponent Left";
      message = `${data.disconnectedName} left the game. ${data.winnerName} wins.`;
      quote = getRandomQuote(LOSS_QUOTES);
    }
  } else if (data.reason === "timeout") {
    if (isWin) {
      icon = "🏆";
      title = "You Win!";
      message = `Your opponent's clock ran out — victory is yours!`;
      quote = getRandomQuote(WIN_QUOTES);
    } else if (isDraw) {
      icon = "⏰";
      title = "Time's Up!";
      message = "The game clock ran out — it's a draw!";
      quote = getRandomQuote(DRAW_QUOTES);
    } else {
      icon = "⏰";
      title = "Time's Up!";
      message = `Your clock ran out — ${data.winnerName} wins!`;
      quote = getRandomQuote(LOSS_QUOTES);
    }
  }

  modalIcon.textContent = icon;
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  quoteEl.textContent = quote;

  // Game stats
  const totalMoves = chess.history().length;
  const durationSec = Math.round((Date.now() - gameStartTime) / 1000);
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;

  movesEl.textContent = totalMoves;
  durationEl.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;

  // Show modal
  gameoverModal.style.display = "flex";

  // Stop the client-side timer
  stopClientTimer();

  // Launch confetti for wins!
  if (isWin) {
    launchConfetti();
    // Second burst after a delay
    setTimeout(() => launchConfetti(), 1200);
  }
});

// Rematch removed — no newGame socket handler needed

// Invalid move — speculative rollback (piece snaps back)
socket.on("invalidMove", () => {
  chess.undo();
  lastMove = null;
  lastSentMove = null;
  renderBoard();
  updateMoveList();
});

// ============================================================
//  CHAT SYSTEM
// ============================================================

// Chat DOM references
const chatMessagesEl = document.getElementById("chat-messages");
const chatPlaceholder = document.getElementById("chat-placeholder");
const chatInput = document.getElementById("chat-input");
const btnSendChat = document.getElementById("btn-send-chat");
const chatToggleBtn = document.getElementById("btn-chat-toggle");
const chatOverlay = document.getElementById("chat-overlay");
const chatMessagesMobile = document.getElementById("chat-messages-mobile");
const chatInputMobile = document.getElementById("chat-input-mobile");
const btnSendChatMobile = document.getElementById("btn-send-chat-mobile");
const btnCloseChat = document.getElementById("btn-close-chat");
const chatTypingEl = document.getElementById("chat-typing");
const chatTypingMobileEl = document.getElementById("chat-typing-mobile");

let chatMessages = [];
let unreadCount = 0;
let isMobileChatOpen = false;
let typingTimeout = null;
let isTyping = false;

// --- Emoji-only detection ---
function isEmojiOnly(text) {
  const emojiRegex = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u;
  return emojiRegex.test(text) && text.trim().length <= 8;
}

// --- Send Chat Message ---
function sendChatMessage(inputEl) {
  const text = inputEl.value.trim();
  if (!text || !currentUsername || !currentRoomCode) return;

  socket.emit("chatMessage", { text });
  inputEl.value = "";
  inputEl.focus();

  // Stop typing indicator
  if (isTyping) {
    isTyping = false;
    socket.emit("chatTyping", false);
  }
  if (typingTimeout) clearTimeout(typingTimeout);
}

// --- Typing indicator ---
function handleTypingInput() {
  if (!currentRoomCode) return;
  if (!isTyping) {
    isTyping = true;
    socket.emit("chatTyping", true);
  }
  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isTyping = false;
    socket.emit("chatTyping", false);
  }, 2000);
}

// Desktop controls
if (btnSendChat) {
  btnSendChat.addEventListener("click", () => sendChatMessage(chatInput));
}
if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChatMessage(chatInput);
  });
  chatInput.addEventListener("input", handleTypingInput);
}

// Mobile controls
if (btnSendChatMobile) {
  btnSendChatMobile.addEventListener("click", () => sendChatMessage(chatInputMobile));
}
if (chatInputMobile) {
  chatInputMobile.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChatMessage(chatInputMobile);
  });
  chatInputMobile.addEventListener("input", handleTypingInput);
}

// --- Quick Emoji Buttons ---
document.querySelectorAll(".emoji-btn:not(.emoji-btn-mobile)").forEach((btn) => {
  btn.addEventListener("click", () => {
    const emoji = btn.dataset.emoji;
    if (!emoji || !currentUsername || !currentRoomCode) return;
    socket.emit("chatMessage", { text: emoji });
    // Pop animation
    btn.style.transform = "scale(1.4)";
    setTimeout(() => { btn.style.transform = ""; }, 200);
  });
});

document.querySelectorAll(".emoji-btn-mobile").forEach((btn) => {
  btn.addEventListener("click", () => {
    const emoji = btn.dataset.emoji;
    if (!emoji || !currentUsername || !currentRoomCode) return;
    socket.emit("chatMessage", { text: emoji });
    btn.style.transform = "scale(1.4)";
    setTimeout(() => { btn.style.transform = ""; }, 200);
  });
});

// --- Mobile Chat Toggle ---
if (chatToggleBtn) {
  chatToggleBtn.addEventListener("click", () => {
    isMobileChatOpen = true;
    unreadCount = 0;
    updateChatBadge();
    if (chatOverlay) chatOverlay.classList.add("active");
    syncMobileChat();
    if (chatInputMobile) chatInputMobile.focus();
  });
}

if (btnCloseChat) {
  btnCloseChat.addEventListener("click", () => {
    isMobileChatOpen = false;
    if (chatOverlay) chatOverlay.classList.remove("active");
  });
}

if (chatOverlay) {
  chatOverlay.addEventListener("click", (e) => {
    if (e.target === chatOverlay) {
      isMobileChatOpen = false;
      chatOverlay.classList.remove("active");
    }
  });
}

// --- Render a chat message ---
function renderChatBubble(container, msg) {
  const isSelf = msg.username === currentUsername;
  const emojiOnly = isEmojiOnly(msg.text);

  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble", isSelf ? "self" : "other");
  if (emojiOnly) bubble.classList.add("emoji-only");

  const sender = document.createElement("span");
  sender.classList.add("chat-sender");
  sender.textContent = isSelf ? "You" : msg.username;
  if (!emojiOnly) bubble.appendChild(sender);

  const text = document.createElement("span");
  text.classList.add("chat-text");
  text.textContent = msg.text;
  bubble.appendChild(text);

  if (!emojiOnly) {
    const time = document.createElement("span");
    time.classList.add("chat-time");
    time.textContent = msg.time;
    bubble.appendChild(time);
  }

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function renderSystemMessage(container, text) {
  const el = document.createElement("div");
  el.classList.add("chat-system");
  const span = document.createElement("span");
  span.textContent = text;
  el.appendChild(span);
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

// Sync desktop chat to mobile overlay
function syncMobileChat() {
  if (!chatMessagesMobile) return;
  chatMessagesMobile.innerHTML = "";
  chatMessages.forEach((msg) => {
    if (msg.system) {
      renderSystemMessage(chatMessagesMobile, msg.text);
    } else {
      renderChatBubble(chatMessagesMobile, msg);
    }
  });
}

// Update unread badge
function updateChatBadge() {
  if (!chatToggleBtn) return;
  const existing = chatToggleBtn.querySelector(".unread-badge");
  if (existing) existing.remove();

  if (unreadCount > 0) {
    const badge = document.createElement("span");
    badge.classList.add("unread-badge");
    badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
    chatToggleBtn.appendChild(badge);
  }
}

// Clear chat
function clearChat() {
  chatMessages = [];
  unreadCount = 0;
  updateChatBadge();
  if (chatMessagesEl) {
    chatMessagesEl.innerHTML = '<div class="chat-placeholder" id="chat-placeholder"><span class="chat-placeholder-icon">💬</span><span>No messages yet</span><span class="chat-placeholder-hint">Say hello to your opponent!</span></div>';
  }
  if (chatMessagesMobile) {
    chatMessagesMobile.innerHTML = "";
  }
}

// --- Receive chat message from server ---
socket.on("chatMessage", (msg) => {
  chatMessages.push(msg);

  // Remove placeholder
  if (chatMessagesEl) {
    const ph = chatMessagesEl.querySelector(".chat-placeholder");
    if (ph) ph.remove();
  }

  // Render in desktop panel
  if (chatMessagesEl) {
    renderChatBubble(chatMessagesEl, msg);
  }

  // Render in mobile overlay if open
  if (isMobileChatOpen && chatMessagesMobile) {
    renderChatBubble(chatMessagesMobile, msg);
  }

  // Update unread count
  if (!isMobileChatOpen && msg.username !== currentUsername) {
    unreadCount++;
    updateChatBadge();
  }

  // Hide typing indicator when message received from that user
  if (msg.username !== currentUsername) {
    showTypingIndicator(false);
  }
});

// System chat messages
socket.on("chatSystem", (text) => {
  chatMessages.push({ system: true, text });

  if (chatMessagesEl) {
    const ph = chatMessagesEl.querySelector(".chat-placeholder");
    if (ph) ph.remove();
    renderSystemMessage(chatMessagesEl, text);
  }

  if (isMobileChatOpen && chatMessagesMobile) {
    renderSystemMessage(chatMessagesMobile, text);
  }
});

// --- Typing indicator ---
function showTypingIndicator(show) {
  if (chatTypingEl) chatTypingEl.style.display = show ? "flex" : "none";
  if (chatTypingMobileEl) chatTypingMobileEl.style.display = show ? "flex" : "none";
}

socket.on("chatTyping", (data) => {
  if (data.username !== currentUsername) {
    showTypingIndicator(data.typing);
    const typingText = document.getElementById("typing-text");
    if (typingText) typingText.textContent = `${data.username} is typing…`;
  }
});

// ============================================================
//  GAME CONTROL BUTTONS
// ============================================================

// Rematch button removed

// Resign
if (btnResign) {
  btnResign.addEventListener("click", () => {
    if (!PlayerRole || chess.isGameOver()) return;
    if (confirm("Are you sure you want to resign?")) {
      socket.emit("resign");
    }
  });
}

const leaveConfirmModal = document.getElementById("leave-confirm-modal");
const btnLeaveCancel = document.getElementById("btn-leave-cancel");
const btnLeaveConfirm = document.getElementById("btn-leave-confirm");

const newGameRequestModal = document.getElementById("newgame-request-modal");
const newGameRequestMessage = document.getElementById("newgame-request-message");
const btnNewGameDecline = document.getElementById("btn-newgame-decline");
const btnNewGameAccept = document.getElementById("btn-newgame-accept");

// Leave game modal triggers
if (btnLeaveGame) {
  btnLeaveGame.addEventListener("click", () => {
    if (currentRoomCode) {
      leaveConfirmModal.style.display = "flex";
    } else {
      socket.emit("leaveRoom");
      chess.reset();
      gameoverModal.style.display = "none";
      clearChat();
      goToLobby();
    }
  });
}

if (btnLeaveCancel) {
  btnLeaveCancel.addEventListener("click", () => {
    leaveConfirmModal.style.display = "none";
  });
}

if (btnLeaveConfirm) {
  btnLeaveConfirm.addEventListener("click", () => {
    leaveConfirmModal.style.display = "none";
    socket.emit("leaveRoom");
    chess.reset();
    gameoverModal.style.display = "none";
    clearChat();
    goToLobby();
  });
}

// Rematch request / New Game button in gameover modal
if (btnModalLobby) {
  btnModalLobby.addEventListener("click", () => {
    if (offlineGameActive && offlineGameScreen && offlineGameScreen.classList.contains("active-screen")) {
      offlineGoBack();
      return;
    }
    
    if (currentRoomCode) {
      // Multiplayer mode: request rematch, don't leave room
      btnModalLobby.disabled = true;
      btnModalLobby.textContent = "Waiting for Opponent...";
      socket.emit("requestNewGame");
    } else {
      // Just go back to lobby
      socket.emit("leaveRoom");
      chess.reset();
      gameoverModal.style.display = "none";
      stopConfetti();
      clearChat();
      goToLobby();
    }
  });
}

// Rematch request option buttons
if (btnNewGameDecline) {
  btnNewGameDecline.addEventListener("click", () => {
    newGameRequestModal.style.display = "none";
    socket.emit("declineNewGame");
  });
}

if (btnNewGameAccept) {
  btnNewGameAccept.addEventListener("click", () => {
    newGameRequestModal.style.display = "none";
    socket.emit("acceptNewGame");
  });
}

// Socket handlers for rematch/new game request
socket.on("newGameRequested", (data) => {
  if (newGameRequestMessage) {
    newGameRequestMessage.textContent = `${data.requester} wants to start a new game.`;
  }
  newGameRequestModal.style.display = "flex";
});

socket.on("newGameDeclined", () => {
  btnModalLobby.disabled = false;
  btnModalLobby.textContent = "← New Game";
  alert("Opponent declined the rematch request.");
});

socket.on("newGameStarted", (data) => {
  // Re-enable and reset rematch buttons
  btnModalLobby.disabled = false;
  btnModalLobby.textContent = "← New Game";
  
  // Reset modals
  gameoverModal.style.display = "none";
  newGameRequestModal.style.display = "none";
  leaveConfirmModal.style.display = "none";
  stopConfetti();
  
  // Clear visual highlights and reset engine
  chess.load(data.fen);
  lastMove = null;
  lastSentMove = null;
  
  // Reset local state clocks & moves lists
  const movesContainer = document.getElementById("moves-container");
  if (movesContainer) movesContainer.innerHTML = "";
  
  // Redraw
  renderBoard();
  
  // Resync chat logs
  clearChat();
  addChatMessage("system", "Game restarted!");
});

// ============================================================
//  BOARD THEME SELECTOR — Dashboard only
// ============================================================

function applyBoardTheme(theme) {
  const themeClasses = [
    "theme-classic", "theme-tournament", "theme-ocean", "theme-midnight",
    "theme-royal", "theme-graphite", "theme-emerald", "theme-rosewood",
    "theme-sandstone", "theme-contrast"
  ];
  
  if (boardElement) {
    boardElement.classList.remove(...themeClasses);
    if (theme && theme !== "classic") {
      boardElement.classList.add(`theme-${theme}`);
    }
  }
  
  if (offlineBoardEl) {
    offlineBoardEl.classList.remove(...themeClasses);
    if (theme && theme !== "classic") {
      offlineBoardEl.classList.add(`theme-${theme}`);
    }
  }
  
  localStorage.setItem("chess-board-theme", theme);
  const radio = document.querySelector(`input[name="board-theme"][value="${theme}"]`);
  if (radio) radio.checked = true;
}

// Lobby theme radios
const themeRadios = document.querySelectorAll('input[name="board-theme"]');
themeRadios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    applyBoardTheme(e.target.value);
  });
});

// Load saved theme on startup
const savedTheme = localStorage.getItem("chess-board-theme") || "classic";
applyBoardTheme(savedTheme);

// ============================================================
//  APP THEME SELECTOR (Light/Dark/System)
// ============================================================

function applyAppTheme(theme) {
  const body = document.body;
  const btns = document.querySelectorAll(".app-theme-btn");
  
  // Remove existing active states
  btns.forEach(btn => {
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-secondary");
  });
  
  // Set active class on selection
  const activeBtn = document.querySelector(`.app-theme-btn[data-theme="${theme}"]`);
  if (activeBtn) {
    activeBtn.classList.remove("btn-secondary");
    activeBtn.classList.add("btn-primary");
  }

  localStorage.setItem("chess-app-theme", theme);

  if (theme === "light") {
    body.classList.add("light-theme");
  } else if (theme === "dark") {
    body.classList.remove("light-theme");
  } else {
    // System preference
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (systemPrefersDark) {
      body.classList.remove("light-theme");
    } else {
      body.classList.add("light-theme");
    }
  }
}

// Event listeners for App Theme buttons
const appThemeBtns = document.querySelectorAll(".app-theme-btn");
appThemeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    applyAppTheme(btn.getAttribute("data-theme"));
  });
});

// Listen to system theme changes
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  const currentTheme = localStorage.getItem("chess-app-theme") || "system";
  if (currentTheme === "system") {
    applyAppTheme("system");
  }
});

// Load saved app theme on startup
const savedAppTheme = localStorage.getItem("chess-app-theme") || "system";
applyAppTheme(savedAppTheme);

// ============================================================
//  AUTO-LOGIN: Check for existing session cookie
// ============================================================

async function tryAutoLogin() {
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    if (data.loggedIn && data.username) {
      currentUsername = data.username;
      if (pendingRoomJoin) {
        socket.emit("joinRoom", { roomCode: pendingRoomJoin, username: currentUsername });
        pendingRoomJoin = null;
      } else {
        goToLobby();
      }
      return;
    }
  } catch (e) {
    // Cookie missing or expired — show login screen
  }
  showScreen(authScreen);
  renderBoard();
  updateMoveList();
}

// ============================================================
//  OFFLINE PvP — FULL LOCAL GAME (no server needed)
// ============================================================

const offlineChess = new Chess();
const offlinePlayerTopEl = document.getElementById("offline-player-top");
const offlinePlayerBottomEl = document.getElementById("offline-player-bottom");
const offlineTimerWhiteEl = document.getElementById("offline-timer-white");
const offlineTimerBlackEl = document.getElementById("offline-timer-black");
const offlineCapturedWhiteEl = document.getElementById("offline-captured-by-white");
const offlineCapturedBlackEl = document.getElementById("offline-captured-by-black");
const offlineTurnBanner = document.getElementById("offline-turn-banner");
const offlineTurnDot = document.getElementById("offline-turn-dot");
const offlineTurnText = document.getElementById("offline-turn-text");
const offlineGameStatus = document.getElementById("offline-game-status");
const offlineStatusText = document.getElementById("offline-status-text");

let offlineGameActive = false;
let offlineGameOver = false;
let offlineTimeControl = 600; // seconds
let offlineWhiteTime = 600;
let offlineBlackTime = 600;
let offlineTimerInterval = null;
let offlineTimerRAF = null;
let offlineLastMove = null;
let offlineSelectedSquare = null;
let offlineDraggedPiece = null;
let offlineSourceSquare = null;
let offlineStartTime = Date.now();

// --- Offline Timer System (per-player clocks) ---

function offlineFormatTime(secs) {
  if (secs <= 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function offlineUpdateTimerDisplay() {
  if (offlineTimerWhiteEl) {
    const valEl = offlineTimerWhiteEl.querySelector(".offline-timer-value");
    if (valEl) valEl.textContent = offlineFormatTime(offlineWhiteTime);
    offlineTimerWhiteEl.classList.toggle("timer-low", offlineWhiteTime <= 30 && offlineWhiteTime > 0);
  }
  if (offlineTimerBlackEl) {
    const valEl = offlineTimerBlackEl.querySelector(".offline-timer-value");
    if (valEl) valEl.textContent = offlineFormatTime(offlineBlackTime);
    offlineTimerBlackEl.classList.toggle("timer-low", offlineBlackTime <= 30 && offlineBlackTime > 0);
  }
}

let offlineTimerAnchor = null;
let offlineTimerActiveColor = null; // 'w' or 'b'

function offlineStartTimer() {
  offlineStopTimer();
  if (offlineTimeControl <= 0 || offlineGameOver) return;
  offlineTimerActiveColor = offlineChess.turn();
  offlineTimerAnchor = performance.now();

  function tick() {
    if (offlineGameOver || offlineTimeControl <= 0) return;
    const elapsed = (performance.now() - offlineTimerAnchor) / 1000;
    if (offlineTimerActiveColor === "w") {
      offlineWhiteTime = Math.max(0, offlineWhiteTime - elapsed);
    } else {
      offlineBlackTime = Math.max(0, offlineBlackTime - elapsed);
    }
    offlineTimerAnchor = performance.now();
    offlineUpdateTimerDisplay();

    // Check timeout
    if (offlineWhiteTime <= 0) {
      offlineWhiteTime = 0;
      offlineHandleTimeout("white");
      return;
    }
    if (offlineBlackTime <= 0) {
      offlineBlackTime = 0;
      offlineHandleTimeout("black");
      return;
    }
    offlineTimerRAF = requestAnimationFrame(tick);
  }

  offlineTimerRAF = requestAnimationFrame(tick);
}

function offlineStopTimer() {
  if (offlineTimerRAF) {
    cancelAnimationFrame(offlineTimerRAF);
    offlineTimerRAF = null;
  }
}

function offlineHandleTimeout(loserColor) {
  offlineGameOver = true;
  offlineStopTimer();
  const winnerColor = loserColor === "white" ? "black" : "white";
  offlineShowGameOver("timeout", winnerColor);
}

// --- Start Offline Game (reusable) ---

function startOfflineGame(tc) {
  offlineTimeControl = tc;
  offlineWhiteTime = tc;
  offlineBlackTime = tc;
  offlineChess.reset();
  offlineGameOver = false;
  offlineGameActive = true;
  offlineLastMove = null;
  offlineSelectedSquare = null;
  offlineStartTime = Date.now();

  // Show/hide timers
  if (offlineTimerWhiteEl && offlineTimerBlackEl) {
    if (tc > 0) {
      offlineTimerWhiteEl.style.display = "flex";
      offlineTimerBlackEl.style.display = "flex";
      offlineUpdateTimerDisplay();
    } else {
      offlineTimerWhiteEl.style.display = "none";
      offlineTimerBlackEl.style.display = "none";
    }
  }

  // Hide gameover modal if showing
  if (gameoverModal) gameoverModal.style.display = "none";
  stopConfetti();

  showScreen(offlineGameScreen);
  offlineRenderBoard();
  offlineUpdateTurn();
  offlineUpdateCaptured();
  if (offlineGameStatus) offlineGameStatus.style.display = "none";

  // Start timer
  if (tc > 0) offlineStartTimer();

  // Setup touch drag for offline board (only once)
  if (offlineBoardEl && !offlineBoardEl._touchDragSetup) {
    setupTouchDrag(offlineBoardEl, true);
    offlineBoardEl._touchDragSetup = true;
  }
}

// Lobby "Offline PvP" button
const btnOfflinePvP = document.getElementById("btn-offline-pvp");
if (btnOfflinePvP) {
  btnOfflinePvP.addEventListener("click", () => {
    const tc = parseInt(document.querySelector('input[name="offline-time"]:checked')?.value || "600");
    startOfflineGame(tc);
  });
}

// Auth screen "Play Offline PvP" button — works without login
const btnAuthOfflinePvP = document.getElementById("btn-auth-offline-pvp");
if (btnAuthOfflinePvP) {
  btnAuthOfflinePvP.addEventListener("click", () => {
    const tc = parseInt(document.querySelector('input[name="auth-offline-time"]:checked')?.value || "600");
    startOfflineGame(tc);
  });
}

// --- Offline Board Rendering ---

function offlineGetLegalMoves(row, col) {
  const sq = `${String.fromCharCode(97 + col)}${8 - row}`;
  return offlineChess.moves({ square: sq, verbose: true });
}

function offlineClearSelection() {
  offlineSelectedSquare = null;
  if (offlineBoardEl) {
    offlineBoardEl.querySelectorAll(".square.selected").forEach((el) => el.classList.remove("selected"));
    offlineBoardEl.querySelectorAll(".legal-dot").forEach((el) => el.remove());
    offlineBoardEl.querySelectorAll(".legal-capture").forEach((el) => el.classList.remove("legal-capture"));
  }
}

function offlineShowLegalMoves(row, col) {
  const moves = offlineGetLegalMoves(row, col);
  moves.forEach((move) => {
    const target = algebraicToRowCol(move.to);
    const targetSquare = offlineBoardEl.querySelector(
      `.square[data-row="${target.row}"][data-col="${target.col}"]`
    );
    if (!targetSquare) return;
    if (move.captured) {
      targetSquare.classList.add("legal-capture");
    } else {
      const dot = document.createElement("div");
      dot.classList.add("legal-dot");
      targetSquare.appendChild(dot);
    }
  });
}

function createOfflinePieceDOM(square, rowindex, squareindex) {
  const pieceElement = document.createElement("div");
  pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
  
  const img = document.createElement("img");
  img.src = getPieceImageUrl(square);
  img.alt = getPieceUnicode(square);
  img.classList.add("piece-img");
  img.setAttribute("data-type", square.type);
  img.draggable = false;
  pieceElement.appendChild(img);
  
  const isMyTurn = offlineChess.turn() === square.color && !offlineGameOver;
  pieceElement.draggable = isMyTurn;
  if (isMyTurn) {
    pieceElement.classList.add("draggable");
  }
  
  // Drag events
  pieceElement.addEventListener("dragstart", (e) => {
    if (!pieceElement.draggable) return;
    offlineClearSelection();
    offlineDraggedPiece = pieceElement;
    offlineSourceSquare = { row: rowindex, col: squareindex };
    e.dataTransfer.setData("text/plain", "");
    if (img.complete) {
      e.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);
    }
    setTimeout(() => pieceElement.classList.add("dragging"), 0);
  });
  
  pieceElement.addEventListener("dragend", () => {
    if (offlineDraggedPiece) offlineDraggedPiece.classList.remove("dragging");
    offlineDraggedPiece = null;
    offlineSourceSquare = null;
  });
  
  return pieceElement;
}

function handleOfflineSquareClick(rowindex, squareindex, squareElement) {
  if (offlineGameOver) return;
  const currentTurn = offlineChess.turn();

  if (offlineSelectedSquare) {
    const targetRow = rowindex;
    const targetCol = squareindex;

    if (targetRow === offlineSelectedSquare.row && targetCol === offlineSelectedSquare.col) {
      offlineClearSelection();
      return;
    }

    const moves = offlineGetLegalMoves(offlineSelectedSquare.row, offlineSelectedSquare.col);
    const targetAlg = `${String.fromCharCode(97 + targetCol)}${8 - targetRow}`;
    const isLegal = moves.some((m) => m.to === targetAlg);

    if (isLegal) {
      offlineHandleMove(offlineSelectedSquare, { row: targetRow, col: targetCol });
      offlineClearSelection();
    } else {
      const board = offlineChess.board();
      const square = board[targetRow][targetCol];
      if (square && square.color === currentTurn) {
        offlineClearSelection();
        offlineSelectedSquare = { row: rowindex, col: squareindex };
        squareElement.classList.add("selected");
        offlineShowLegalMoves(rowindex, squareindex);
      } else {
        offlineClearSelection();
      }
    }
  } else {
    const board = offlineChess.board();
    const square = board[rowindex][squareindex];
    if (square && square.color === currentTurn) {
      offlineClearSelection();
      offlineSelectedSquare = { row: rowindex, col: squareindex };
      squareElement.classList.add("selected");
      offlineShowLegalMoves(rowindex, squareindex);
    }
  }
}

function offlineRenderBoard() {
  if (!offlineBoardEl) return;
  const board = offlineChess.board();
  
  let squares = offlineBoardEl.querySelectorAll(".square");
  
  if (squares.length !== 64) {
    offlineBoardEl.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const squareElement = document.createElement("div");
        squareElement.classList.add("square");
        squareElement.dataset.row = r;
        squareElement.dataset.col = c;
        
        // Click-to-move
        squareElement.addEventListener("click", () => {
          const row = parseInt(squareElement.dataset.row);
          const col = parseInt(squareElement.dataset.col);
          handleOfflineSquareClick(row, col, squareElement);
        });
        
        // Drag over/leave/drop events on squares
        squareElement.addEventListener("dragover", (e) => {
          e.preventDefault();
          squareElement.classList.add("drop-target");
        });
        squareElement.addEventListener("dragleave", () => {
          squareElement.classList.remove("drop-target");
        });
        squareElement.addEventListener("drop", (e) => {
          e.preventDefault();
          squareElement.classList.remove("drop-target");
          offlineClearSelection();
          if (offlineDraggedPiece) {
            const targetSource = {
              row: parseInt(squareElement.dataset.row),
              col: parseInt(squareElement.dataset.col),
            };
            offlineHandleMove(offlineSourceSquare, targetSource);
          }
        });
        
        fragment.appendChild(squareElement);
      }
    }
    offlineBoardEl.appendChild(fragment);
    squares = offlineBoardEl.querySelectorAll(".square");
  }
  
  // No flip in offline mode
  offlineBoardEl.classList.remove("flipped");
  
  squares.forEach((squareElement) => {
    const rowindex = parseInt(squareElement.dataset.row);
    const squareindex = parseInt(squareElement.dataset.col);
    const square = board[rowindex][squareindex];
    
    // Update light/dark classes and state classes
    squareElement.className = "square " + ((rowindex + squareindex) % 2 === 0 ? "light" : "dark");
    
    // Re-apply highlights/checks
    if (offlineLastMove) {
      if (
        (rowindex === offlineLastMove.from.row && squareindex === offlineLastMove.from.col) ||
        (rowindex === offlineLastMove.to.row && squareindex === offlineLastMove.to.col)
      ) {
        squareElement.classList.add("highlight");
      }
    }
    
    if (offlineSelectedSquare && rowindex === offlineSelectedSquare.row && squareindex === offlineSelectedSquare.col) {
      squareElement.classList.add("selected");
    }
    
    if (square && square.type === "k") {
      if (offlineChess.isCheckmate() && offlineChess.turn() === square.color) {
        squareElement.classList.add("king-checkmate");
      } else if (offlineChess.isCheck() && offlineChess.turn() === square.color) {
        squareElement.classList.add("king-in-check");
      }
    }
    
    // Reuse piece elements
    let pieceElement = squareElement.querySelector(".piece");
    
    if (!square) {
      if (pieceElement) {
        pieceElement.remove();
      }
    } else {
      const pieceColor = square.color === "w" ? "white" : "black";
      
      if (pieceElement) {
        const img = pieceElement.querySelector(".piece-img");
        // If color or type is different, replace it
        if (!pieceElement.classList.contains(pieceColor) || (img && img.getAttribute("data-type") !== square.type)) {
          pieceElement.remove();
          pieceElement = createOfflinePieceDOM(square, rowindex, squareindex);
          squareElement.appendChild(pieceElement);
        } else {
          // Update draggability
          const isMyTurn = offlineChess.turn() === square.color && !offlineGameOver;
          pieceElement.draggable = isMyTurn;
          pieceElement.classList.toggle("draggable", isMyTurn);
        }
      } else {
        pieceElement = createOfflinePieceDOM(square, rowindex, squareindex);
        squareElement.appendChild(pieceElement);
      }
    }
  });
  
  offlineUpdateTurn();
  offlineUpdateCaptured();
  offlineUpdateGameStatus();
}

// --- Handle Move (offline) ---

function offlineHandleMove(source, target) {
  if (offlineGameOver) return;

  const from = `${String.fromCharCode(97 + source.col)}${8 - source.row}`;
  const to = `${String.fromCharCode(97 + target.col)}${8 - target.row}`;

  // Check capture before move
  const boardBefore = offlineChess.board();
  const toPos = algebraicToRowCol(to);
  const targetPiece = boardBefore[toPos.row] && boardBefore[toPos.row][toPos.col];

  let result;
  try {
    result = offlineChess.move({ from, to, promotion: "q" });
  } catch (e) {
    return;
  }
  if (!result) return;

  // Update last move
  offlineLastMove = { from: algebraicToRowCol(from), to: algebraicToRowCol(to) };

  // Sound
  if (offlineChess.isCheckmate() || offlineChess.isStalemate() || offlineChess.isDraw()) {
    playGameOverSound();
  } else if (offlineChess.inCheck()) {
    playCheckSound();
  } else if (targetPiece || result.captured) {
    playCaptureSound();
  } else {
    playMoveSound();
  }

  // Switch timer
  offlineStopTimer();
  if (offlineTimeControl > 0 && !offlineChess.isGameOver()) {
    offlineStartTimer();
  }

  offlineRenderBoard();

  // Check game over
  offlineCheckGameOver();
}

function offlineCheckGameOver() {
  if (offlineChess.isCheckmate()) {
    offlineGameOver = true;
    offlineStopTimer();
    const winnerColor = offlineChess.turn() === "w" ? "black" : "white";
    offlineShowGameOver("checkmate", winnerColor);
  } else if (offlineChess.isStalemate()) {
    offlineGameOver = true;
    offlineStopTimer();
    offlineShowGameOver("stalemate", null);
  } else if (offlineChess.isThreefoldRepetition()) {
    offlineGameOver = true;
    offlineStopTimer();
    offlineShowGameOver("threefold_repetition", null);
  } else if (offlineChess.isInsufficientMaterial()) {
    offlineGameOver = true;
    offlineStopTimer();
    offlineShowGameOver("insufficient_material", null);
  } else if (offlineChess.isDraw()) {
    offlineGameOver = true;
    offlineStopTimer();
    const halfMoves = offlineChess.fen().split(" ")[4];
    const reason = parseInt(halfMoves) >= 100 ? "fifty_move_rule" : "draw";
    offlineShowGameOver(reason, null);
  }
}

// --- Turn Indicator ---

function offlineUpdateTurn() {
  if (!offlineTurnBanner) return;
  const turn = offlineChess.turn();
  const isWhite = turn === "w";

  if (offlineTurnText) offlineTurnText.textContent = isWhite ? "White's Turn" : "Black's Turn";
  if (offlineTurnDot) {
    offlineTurnDot.style.background = isWhite ? "#f0d9b5" : "#333";
    offlineTurnDot.style.boxShadow = isWhite
      ? "0 0 12px rgba(240,217,181,0.6)"
      : "0 0 12px rgba(60,60,60,0.6)";
  }

  // Player bars
  if (offlinePlayerTopEl) {
    offlinePlayerTopEl.classList.toggle("active", turn === "b");
    const st = offlinePlayerTopEl.querySelector(".player-status");
    if (st) st.textContent = turn === "b" ? "Your turn" : "Waiting…";
  }
  if (offlinePlayerBottomEl) {
    offlinePlayerBottomEl.classList.toggle("active", turn === "w");
    const st = offlinePlayerBottomEl.querySelector(".player-status");
    if (st) st.textContent = turn === "w" ? "Your turn" : "Waiting…";
  }
}

// --- Update Game Status (check/game over banners) ---

function offlineUpdateGameStatus() {
  if (!offlineGameStatus || !offlineStatusText) return;

  if (offlineChess.isCheckmate()) {
    const winner = offlineChess.turn() === "w" ? "Black" : "White";
    offlineStatusText.textContent = `♚ Checkmate! ${winner} wins!`;
    offlineGameStatus.className = "game-status-banner gameover";
    offlineGameStatus.style.display = "block";
  } else if (offlineChess.isStalemate()) {
    offlineStatusText.textContent = "½ Stalemate — Draw!";
    offlineGameStatus.className = "game-status-banner gameover";
    offlineGameStatus.style.display = "block";
  } else if (offlineChess.isCheck()) {
    offlineStatusText.textContent = "⚠ Check!";
    offlineGameStatus.className = "game-status-banner check";
    offlineGameStatus.style.display = "block";
  } else {
    offlineGameStatus.style.display = "none";
  }
}

// --- Captured Pieces ---

function offlineUpdateCaptured() {
  if (!offlineCapturedWhiteEl || !offlineCapturedBlackEl) return;

  const board = offlineChess.board();
  const currentPieces = { w: {}, b: {} };
  board.forEach((row) => {
    row.forEach((sq) => {
      if (sq) {
        currentPieces[sq.color][sq.type] = (currentPieces[sq.color][sq.type] || 0) + 1;
      }
    });
  });

  const startingPieces = { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 };
  const whitePieceSymbols = { p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔" };
  const blackPieceSymbols = { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" };

  const capturedWhite = [];
  const capturedBlack = [];

  for (const type in startingPieces) {
    const wMissing = startingPieces[type] - (currentPieces.w[type] || 0);
    const bMissing = startingPieces[type] - (currentPieces.b[type] || 0);
    for (let i = 0; i < wMissing; i++) capturedWhite.push(whitePieceSymbols[type]);
    for (let i = 0; i < bMissing; i++) capturedBlack.push(blackPieceSymbols[type]);
  }

  offlineCapturedBlackEl.textContent = capturedWhite.join(" ");
  offlineCapturedWhiteEl.textContent = capturedBlack.join(" ");
}

// --- Game Over (reuse modal) ---

function offlineShowGameOver(reason, winnerColor) {
  const panel = document.getElementById("gameover-panel");
  const quoteEl = document.getElementById("modal-quote");
  const movesEl = document.getElementById("modal-stat-moves");
  const durationEl = document.getElementById("modal-stat-duration");

  // In offline PvP we don't have "you" vs "opponent" — just White/Black
  const isDraw = !winnerColor;
  const winnerName = winnerColor ? (winnerColor === "white" ? "White" : "Black") : null;
  const loserName = winnerColor ? (winnerColor === "white" ? "Black" : "White") : null;

  panel.className = "modal glass-panel gameover-modal-content " + (isDraw ? "draw" : "win");

  let icon, title, message, quote;

  if (reason === "checkmate") {
    icon = "👑";
    title = "Checkmate!";
    message = `${winnerName} wins by checkmate! ${loserName}'s king had no escape.`;
    quote = getRandomQuote(WIN_QUOTES);
  } else if (reason === "stalemate") {
    icon = "🤝";
    title = "Stalemate";
    message = "No legal moves available — the game is a draw!";
    quote = getRandomQuote(DRAW_QUOTES);
  } else if (reason === "threefold_repetition") {
    icon = "🔄";
    title = "Threefold Repetition";
    message = "The same position occurred three times — draw!";
    quote = getRandomQuote(DRAW_QUOTES);
  } else if (reason === "insufficient_material") {
    icon = "♟";
    title = "Insufficient Material";
    message = "Neither player has enough pieces to checkmate — draw!";
    quote = getRandomQuote(DRAW_QUOTES);
  } else if (reason === "fifty_move_rule") {
    icon = "⏰";
    title = "50-Move Rule";
    message = "50 moves without a capture or pawn move — draw!";
    quote = getRandomQuote(DRAW_QUOTES);
  } else if (reason === "draw") {
    icon = "🤝";
    title = "Draw";
    message = "The game ended in a draw.";
    quote = getRandomQuote(DRAW_QUOTES);
  } else if (reason === "resignation") {
    icon = "🏳️";
    title = `${loserName} Resigned`;
    message = `${winnerName} wins by resignation!`;
    quote = getRandomQuote(WIN_QUOTES);
  } else if (reason === "timeout") {
    icon = "⏰";
    title = "Time's Up!";
    message = `${loserName}'s clock ran out — ${winnerName} wins!`;
    quote = getRandomQuote(WIN_QUOTES);
  }

  modalIcon.textContent = icon;
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  quoteEl.textContent = quote;

  const totalMoves = offlineChess.history().length;
  const durationSec = Math.round((Date.now() - offlineStartTime) / 1000);
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;

  movesEl.textContent = totalMoves;
  durationEl.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;

  gameoverModal.style.display = "flex";

  if (winnerColor) {
    launchConfetti();
    setTimeout(() => launchConfetti(), 1200);
  }
}

// --- Offline Controls ---

const btnOfflineNewGame = document.getElementById("btn-offline-new-game");
const btnOfflineResign = document.getElementById("btn-offline-resign");
const btnOfflineBackLobby = document.getElementById("btn-offline-back-lobby");

if (btnOfflineNewGame) {
  btnOfflineNewGame.addEventListener("click", () => {
    offlineStopTimer();
    offlineChess.reset();
    offlineGameOver = false;
    offlineLastMove = null;
    offlineSelectedSquare = null;
    offlineStartTime = Date.now();
    offlineWhiteTime = offlineTimeControl;
    offlineBlackTime = offlineTimeControl;

    if (gameoverModal) gameoverModal.style.display = "none";
    stopConfetti();
    if (offlineGameStatus) offlineGameStatus.style.display = "none";

    offlineRenderBoard();
    offlineUpdateTimerDisplay();

    if (offlineTimeControl > 0) offlineStartTimer();
  });
}

if (btnOfflineResign) {
  btnOfflineResign.addEventListener("click", () => {
    if (offlineGameOver) return;
    const turn = offlineChess.turn();
    const resigningColor = turn === "w" ? "white" : "black";
    if (confirm(`${resigningColor === "white" ? "White" : "Black"} wants to resign. Are you sure?`)) {
      offlineGameOver = true;
      offlineStopTimer();
      const winnerColor = resigningColor === "white" ? "black" : "white";
      offlineShowGameOver("resignation", winnerColor);
    }
  });
}

// Helper: go back to the right screen after offline game
function offlineGoBack() {
  offlineStopTimer();
  offlineGameOver = true;
  offlineGameActive = false;
  offlineChess.reset();
  if (gameoverModal) gameoverModal.style.display = "none";
  stopConfetti();
  // If user is logged in → lobby, otherwise → auth screen
  if (currentUsername) {
    goToLobby();
  } else {
    showScreen(authScreen);
  }
}

if (btnOfflineBackLobby) {
  btnOfflineBackLobby.addEventListener("click", () => {
    offlineGoBack();
  });
}

// --- Modal buttons: make them work in offline mode too ---

// Modal buttons for offline mode: lobby button already handles offline in main handler above
// Rematch in offline mode handled by the "New Game" button on the offline controls bar

// ============================================================
//  INITIAL STATE
// ============================================================

// Parse initial URL parameters
const urlParams = new URLSearchParams(window.location.search);
const initialRoomCode = urlParams.get("room");
const initialOffline = urlParams.get("offline");

if (initialRoomCode) {
  pendingRoomJoin = initialRoomCode;
} else if (initialOffline === "true") {
  startOfflineGame(600);
}

tryAutoLogin();

// ============================================================
//  PWA SERVICE WORKER & INSTALL POPUP
// ============================================================

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.log("ServiceWorker registration failed: ", err);
    });
  });
}

let deferredPrompt = null;
const pwaPopup = document.getElementById("pwa-install-popup");
const btnPwaInstall = document.getElementById("btn-pwa-install");
const btnPwaDismiss = document.getElementById("btn-pwa-dismiss");

// Detect if it is mobile screen
const isMobile = () => window.matchMedia("(max-width: 768px)").matches || /Mobi|Android|iPhone/i.test(navigator.userAgent);

// Show the install promo on mobile if not dismissed before
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  const isDismissed = localStorage.getItem("pwa-install-dismissed") === "true";
  const activeScreenElement = document.querySelector(".screen.active-screen");
  if (pwaPopup && isMobile() && !isDismissed && activeScreenElement === authScreen) {
    pwaPopup.style.display = "block";
  }
});

if (btnPwaInstall) {
  btnPwaInstall.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
    if (pwaPopup) {
      pwaPopup.style.display = "none";
    }
  });
}

if (btnPwaDismiss) {
  btnPwaDismiss.addEventListener("click", () => {
    if (pwaPopup) {
      pwaPopup.style.display = "none";
    }
    localStorage.setItem("pwa-install-dismissed", "true");
  });
}

// Fade out Splash Screen on launch
const dismissSplash = () => {
  const splash = document.getElementById("app-splash-screen");
  if (splash) {
    setTimeout(() => {
      splash.style.opacity = "0";
      splash.style.pointerEvents = "none";
      setTimeout(() => {
        splash.remove();
      }, 400);
    }, 1800);
  }
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", dismissSplash);
} else {
  dismissSplash();
}
