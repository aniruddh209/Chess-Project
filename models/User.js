const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual: win percentage
userSchema.virtual("winPercentage").get(function () {
  if (this.stats.gamesPlayed === 0) return 0;
  return Math.round((this.stats.wins / this.stats.gamesPlayed) * 100);
});

// Ensure virtuals are included in JSON
userSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("User", userSchema);
