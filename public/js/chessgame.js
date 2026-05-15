import { Chess } from "/vendor/chess.js";

// ============================================================
//  SOCKET & CHESS ENGINE
// ============================================================

const socket = io();
const chess = new Chess();

// ============================================================
//  STATE
// ============================================================

let PlayerRole = null;
let currentUsername = null;
let currentRoomCode = null;

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
const connectionStatus = document.getElementById("connection-status");
const statusDot = connectionStatus ? connectionStatus.querySelector(".status-dot") : null;
const gameStatusBanner = document.getElementById("game-status");
const statusText = document.getElementById("status-text");
const moveListEl = document.getElementById("move-list");
const capturedByWhiteEl = document.getElementById("captured-by-white");
const capturedByBlackEl = document.getElementById("captured-by-black");
const playerTopEl = document.getElementById("player-top");
const playerBottomEl = document.getElementById("player-bottom");
const btnNewGame = document.getElementById("btn-new-game");
const btnLeaveGame = document.getElementById("btn-leave-game");
const btnResign = document.getElementById("btn-resign");
const gameRoomCode = document.getElementById("game-room-code");

// Modal elements
const gameoverModal = document.getElementById("gameover-modal");
const modalIcon = document.getElementById("modal-icon");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const btnModalRematch = document.getElementById("btn-modal-rematch");
const btnModalLobby = document.getElementById("btn-modal-lobby");

// Drag state
let draggedPiece = null;
let sourceSquare = null;

// ============================================================
//  SCREEN MANAGEMENT
// ============================================================

function showScreen(screen) {
  // Hide all screens
  [authScreen, lobbyScreen, waitingScreen, gameScreen].forEach((s) => {
    s.classList.remove("active-screen");
  });
  // Show target screen
  screen.classList.add("active-screen");
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
      goToLobby();
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
      goToLobby();
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
  clearErrors();
  // Reset game clock
  const clockEl = document.getElementById("game-clock");
  if (clockEl) { clockEl.style.display = "none"; clockEl.classList.remove("timer-low"); }
  const timerEl = document.getElementById("game-timer");
  if (timerEl) timerEl.textContent = "--:--";
}

// Logout — clear server cookie + client state
btnLogout.addEventListener("click", async () => {
  try { await fetch("/api/logout", { method: "POST" }); } catch(e) {}
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
});

socket.on("disconnect", () => {
  if (statusDot) statusDot.classList.remove("connected");
  updateConnectionText("Disconnected");
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

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";
  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowindex + squareindex) % 2 == 0 ? "light" : "dark",
      );
      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;

      // Last move highlighting
      if (lastMove) {
        if (
          (rowindex === lastMove.from.row && squareindex === lastMove.from.col) ||
          (rowindex === lastMove.to.row && squareindex === lastMove.to.col)
        ) {
          squareElement.classList.add("highlight");
        }
      }

      // King in check / checkmate highlighting
      if (square && square.type === "k") {
        if (chess.isCheckmate() && chess.turn() === square.color) {
          squareElement.classList.add("king-checkmate");
        } else if (chess.isCheck() && chess.turn() === square.color) {
          squareElement.classList.add("king-in-check");
        }
      }

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color == "w" ? "white" : "black",
        );

        const img = document.createElement("img");
        img.src = getPieceImageUrl(square);
        img.alt = getPieceUnicode(square);
        img.classList.add("piece-img");
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
        squareElement.appendChild(pieceElement);
      }

      // Click-to-move
      squareElement.addEventListener("click", () => {
        if (!PlayerRole || PlayerRole !== chess.turn()) return;

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
      });

      // Drag events on squares
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
      boardElement.appendChild(squareElement);
    });
  });
  if (PlayerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }

  updatePlayerBars();
  updateGameStatus();
  updateCapturedPieces();

  // Re-apply saved board theme
  const currentTheme = localStorage.getItem("chess-board-theme") || "classic";
  applyBoardTheme(currentTheme);
};

// --- Handle Move ---
const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q",
  };
  socket.emit("move", move);
};



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

  // Reset button states
  btnJoinRoom.disabled = false;
  btnJoinRoom.textContent = "Join Room";
  if (btnPlayAI) {
    btnPlayAI.disabled = false;
    btnPlayAI.textContent = "Play AI";
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

// Timer display — single game clock above board
socket.on("timerUpdate", (data) => {
  const clockEl = document.getElementById("game-clock");
  const timerEl = document.getElementById("game-timer");
  if (!clockEl || !timerEl) return;

  const secs = data.time;

  if (secs <= 0) {
    timerEl.textContent = "0:00";
    clockEl.classList.add("timer-low");
    return;
  }

  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  timerEl.textContent = `${m}:${s.toString().padStart(2, "0")}`;

  clockEl.style.display = "flex";
  clockEl.classList.toggle("timer-low", secs <= 30);
});

socket.on("boardState", (fen) => {
  chess.load(fen);
  preloadPieceImages();
  lastMove = null;
  renderBoard();
  updateMoveList();
});

socket.on("move", (move) => {
  // Determine from/to positions for animation
  const from = algebraicToRowCol(move.from);
  const to = algebraicToRowCol(move.to);

  // Check if it's a capture before applying
  const boardBefore = chess.board();
  const targetPiece = boardBefore[to.row] && boardBefore[to.row][to.col];

  // Animate the piece sliding, then apply the move
  animateMove(from.row, from.col, to.row, to.col, () => {
    chess.move(move);

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

    renderBoard();
    updateMoveList();
  });
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
    icon = "⏰";
    title = "Time's Up!";
    message = "The game clock ran out — it's a draw!";
    quote = getRandomQuote(DRAW_QUOTES);
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

  // Launch confetti for wins!
  if (isWin) {
    launchConfetti();
    // Second burst after a delay
    setTimeout(() => launchConfetti(), 1200);
  }
});

// New game event (rematch)
socket.on("newGame", (data) => {
  chess.reset();
  if (data && data.fen) chess.load(data.fen);
  lastMove = null;
  selectedSquare = null;
  gameStartTime = Date.now();
  stopConfetti();
  renderBoard();
  updateMoveList();
  gameoverModal.style.display = "none";
  if (gameStatusBanner) gameStatusBanner.style.display = "none";
});

// Invalid move — silently ignore (piece snaps back)
socket.on("invalidMove", () => { renderBoard(); });

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

// Rematch
if (btnNewGame) {
  btnNewGame.addEventListener("click", () => {
    socket.emit("newGame");
  });
}

// Resign
if (btnResign) {
  btnResign.addEventListener("click", () => {
    if (!PlayerRole || chess.isGameOver()) return;
    if (confirm("Are you sure you want to resign?")) {
      socket.emit("resign");
    }
  });
}

// Leave game — back to lobby
if (btnLeaveGame) {
  btnLeaveGame.addEventListener("click", () => {
    socket.emit("leaveRoom");
    chess.reset();
    gameoverModal.style.display = "none";
    clearChat();
    goToLobby();
  });
}

// Modal — Rematch
if (btnModalRematch) {
  btnModalRematch.addEventListener("click", () => {
    socket.emit("newGame");
  });
}

// Modal — Back to Lobby
if (btnModalLobby) {
  btnModalLobby.addEventListener("click", () => {
    socket.emit("leaveRoom");
    chess.reset();
    gameoverModal.style.display = "none";
    stopConfetti();
    clearChat();
    goToLobby();
  });
}

// ============================================================
//  BOARD THEME SELECTOR — Dashboard only
// ============================================================

function applyBoardTheme(theme) {
  if (!boardElement) return;
  boardElement.classList.remove(
    "theme-classic", "theme-emerald", "theme-ice",
    "theme-tournament", "theme-marble", "theme-walnut"
  );
  if (theme && theme !== "classic") {
    boardElement.classList.add(`theme-${theme}`);
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
//  AUTO-LOGIN: Check for existing session cookie
// ============================================================

async function tryAutoLogin() {
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    if (data.loggedIn && data.username) {
      currentUsername = data.username;
      goToLobby();
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
//  INITIAL STATE
// ============================================================

tryAutoLogin();
