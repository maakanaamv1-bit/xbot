// gameLogic.js
export const MOVES = ["rock", "paper", "scissors"];

export function normalizeMove(text) {
  if (!text) return null;
  text = text.toLowerCase();
  // accept common spellings and emojis
  if (/\brock\b|🪨|🪨️|🪨/i.test(text)) return "rock";
  if (/\bpaper\b|📄|📜/i.test(text)) return "paper";
  if (/\bscissors\b|scissor\b|✂️|✂/i.test(text)) return "scissors";
  return null;
}

export function botMove() {
  return MOVES[Math.floor(Math.random() * MOVES.length)];
}

export function decide(player, bot) {
  if (player === bot) return "tie";
  if (
    (player === "rock" && bot === "scissors") ||
    (player === "paper" && bot === "rock") ||
    (player === "scissors" && bot === "paper")
  ) return "win";
  return "loss";
}
