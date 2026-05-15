const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  players: [
    {
      username: { type: String, required: true },
      color: { type: String, enum: ["white", "black"], required: true },
    },
  ],
  result: {
    type: String,
    enum: ["white_win", "black_win", "draw"],
    required: true,
  },
  reason: {
    type: String,
    enum: ["checkmate", "stalemate", "draw", "disconnect", "abandon", "resignation", "threefold_repetition", "insufficient_material", "fifty_move_rule", "timeout"],
    required: true,
  },
  winner: { type: String, default: null }, // username of winner
  moves: [
    {
      from: String,
      to: String,
      promotion: String,
    },
  ],
  totalMoves: { type: Number, default: 0 },
  duration: { type: Number, default: 0 }, // seconds
  isAI: { type: Boolean, default: false },
  aiDifficulty: { type: String, enum: ["easy", "medium", "hard", null], default: null },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Game", gameSchema);
