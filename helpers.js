// helpers.js
export function extractMoveFromText(text) {
  // prefer first occurrence of rock|paper|scissors
  const pattern = /\b(rock|paper|scissors|scissor|📄|✂️|✂|🪨|🪨️)\b/i;
  const m = text.match(pattern);
  if (!m) return null;
  const raw = m[0].toLowerCase();
  if (raw.startsWith("rock") || raw.includes("🪨")) return "rock";
  if (raw.startsWith("paper") || raw.includes("📄")) return "paper";
  if (raw.startsWith("scissor") || raw.includes("✂")) return "scissors";
  return null;
}

export function formatResultReply(username, playerMove, botMove, outcome) {
  const emoji = { rock: "🪨", paper: "📄", scissors: "✂️" };
  const outcomeText = outcome === "win" ? "You win! 🎉" : outcome === "loss" ? "I win! 😎" : "It's a tie! 🤝";
  return `@${username} You chose ${playerMove} ${emoji[playerMove]} — I chose ${botMove} ${emoji[botMove]}.\n${outcomeText}\n(Reply 'rock'/'paper'/'scissors' to play again!)`;
}
