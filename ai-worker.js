// ============================================================
//  AI WORKER THREAD — runs minimax in a separate thread
//  so the main server event loop is never blocked
// ============================================================

const { parentPort, workerData } = require("worker_threads");
const { Chess } = require("chess.js");

// Piece values for evaluation
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Piece-Square Tables
const PST = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
   -50,-40,-30,-30,-30,-30,-40,-50,
   -40,-20,  0,  0,  0,  0,-20,-40,
   -30,  0, 10, 15, 15, 10,  0,-30,
   -30,  5, 15, 20, 20, 15,  5,-30,
   -30,  0, 15, 20, 20, 15,  0,-30,
   -30,  5, 10, 15, 15, 10,  5,-30,
   -40,-20,  0,  5,  5,  0,-20,-40,
   -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
   -20,-10,-10,-10,-10,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0, 10, 10, 10, 10,  0,-10,
   -10,  5,  5, 10, 10,  5,  5,-10,
   -10,  0, 10, 10, 10, 10,  0,-10,
   -10, 10, 10, 10, 10, 10, 10,-10,
   -10,  5,  0,  0,  0,  0,  5,-10,
   -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
   -20,-10,-10, -5, -5,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
     0,  0,  5,  5,  5,  5,  0, -5,
   -10,  5,  5,  5,  5,  5,  0,-10,
   -10,  0,  5,  0,  0,  0,  0,-10,
   -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -20,-30,-30,-40,-40,-30,-30,-20,
   -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20,
  ],
  k_end: [
   -50,-40,-30,-20,-20,-30,-40,-50,
   -30,-20,-10,  0,  0,-10,-20,-30,
   -30,-10, 20, 30, 30, 20,-10,-30,
   -30,-10, 30, 40, 40, 30,-10,-30,
   -30,-10, 30, 40, 40, 30,-10,-30,
   -30,-10, 20, 30, 30, 20,-10,-30,
   -30,-30,  0,  0,  0,  0,-30,-30,
   -50,-30,-30,-30,-30,-30,-30,-50,
  ],
};

function isEndgame(board) {
  let queens = 0, minors = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (p.type === "q") queens++;
      if (p.type === "n" || p.type === "b") minors++;
    }
  }
  return queens === 0 || (queens <= 2 && minors <= 2);
}

function evaluateBoard(chess) {
  if (chess.isCheckmate()) return chess.turn() === "w" ? -99999 : 99999;
  if (chess.isDraw() || chess.isStalemate()) return 0;

  let score = 0;
  const board = chess.board();
  const endgame = isEndgame(board);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const idx = r * 8 + c;
      const mirrorIdx = (7 - r) * 8 + c;

      let value = PIECE_VALUES[piece.type];
      let pstKey = piece.type;
      if (piece.type === "k" && endgame) pstKey = "k_end";
      const table = PST[pstKey];
      if (table) value += piece.color === "w" ? table[mirrorIdx] : table[idx];

      score += piece.color === "w" ? value : -value;
    }
  }

  const mobility = chess.moves().length;
  score += mobility * 2 * (chess.turn() === "w" ? 1 : -1);
  if (chess.isCheck()) score += chess.turn() === "w" ? -30 : 30;

  return score;
}

function orderMoves(chess, moves) {
  return moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    if (a.captured) scoreA += PIECE_VALUES[a.captured] * 10 - PIECE_VALUES[a.piece];
    if (b.captured) scoreB += PIECE_VALUES[b.captured] * 10 - PIECE_VALUES[b.piece];
    if (a.promotion) scoreA += 800;
    if (b.promotion) scoreB += 800;
    if (a.san && a.san.includes("+")) scoreA += 50;
    if (b.san && b.san.includes("+")) scoreB += 50;
    return scoreB - scoreA;
  });
}

function minimax(chess, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || chess.isGameOver()) return evaluateBoard(chess);

  const moves = chess.moves({ verbose: true });
  orderMoves(chess, moves);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const eval_ = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const eval_ = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getAIMove(fen, difficulty) {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  // EASY: depth 1, 30% blunders
  if (difficulty === "easy") {
    if (Math.random() < 0.3) return moves[Math.floor(Math.random() * moves.length)];
    const isMax = chess.turn() === "w";
    let bestMove = moves[0];
    let bestEval = isMax ? -Infinity : Infinity;
    const shuffled = [...moves].sort(() => Math.random() - 0.5);
    for (const move of shuffled) {
      chess.move(move);
      const eval_ = evaluateBoard(chess);
      chess.undo();
      if (isMax ? eval_ > bestEval : eval_ < bestEval) {
        bestEval = eval_;
        bestMove = move;
      }
    }
    return bestMove;
  }

  // MEDIUM: depth 2, HARD: depth 3
  const depth = difficulty === "medium" ? 2 : 3;
  const isMaximizing = chess.turn() === "w";

  let bestMove = moves[0];
  let bestEval = isMaximizing ? -Infinity : Infinity;

  orderMoves(chess, moves);
  const candidates = [];

  for (const move of moves) {
    chess.move(move);
    const eval_ = minimax(chess, depth - 1, -Infinity, Infinity, !isMaximizing);
    chess.undo();
    candidates.push({ move, eval: eval_ });
    if (isMaximizing ? eval_ > bestEval : eval_ < bestEval) {
      bestEval = eval_;
      bestMove = move;
    }
  }

  const threshold = 15;
  const topMoves = candidates.filter(c => Math.abs(c.eval - bestEval) <= threshold);
  if (topMoves.length > 1) {
    bestMove = topMoves[Math.floor(Math.random() * topMoves.length)].move;
  }

  return bestMove;
}

// Execute: receive FEN + difficulty, return the move
const { fen, difficulty } = workerData;
const move = getAIMove(fen, difficulty);
parentPort.postMessage(move ? { from: move.from, to: move.to, promotion: move.promotion || "q" } : null);
