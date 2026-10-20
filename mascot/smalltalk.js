// Deterministic replies to small talk, so the mascot feels alive without sending chit-chat to the brain.
const RULES = [
  [/\b(how are you|how's it going|how are things|how do you do)\b/i, "I'm good, thanks! All your answers are up to date. What can I check for you?"],
  [/\b(what'?s|what is) your name\b|\bwho are you\b/i, "I'm Brainy, the Company brain. I check payroll facts against trusted sources, and I stay quiet until something is off."],
  [/\bwhat can you do\b|\bhow do you work\b|\bhelp\b/i, "Ask me any payroll question, like the meal voucher maximum or the relapse period. When I'm online, I also warn you if you write or say a value that doesn't match a trusted source."],
  [/\b(thank you|thanks|cheers)\b/i, "You're welcome!"],
  [/\b(bye|goodbye|see you|that'?s all)\b/i, "Talk soon. I'll be right here in the corner."],
  [/^(hi|hey|hello|good (morning|afternoon|evening))[\s!.,]*$/i, "Hi! What would you like to know?"],
];

function smallTalk(text) {
  const t = text.trim();
  for (const [pattern, reply] of RULES) if (pattern.test(t)) return reply;
  return null;
}

module.exports = { smallTalk };
