// Conversation with memory. Remembers the topic (from the last answer or warning) so follow-ups work:
// "what's the right answer?", "where's the source?", "how did you get this?", "how sure are you?", "who should I ask?".
// Intent: fixed patterns first; Claude Haiku only classifies phrasing the patterns miss. Answers are always built
// from the trust engine's data by code, never written by the model.
const brain = require("./brain");
const env = require("./env");
const { smallTalk } = require("./smalltalk");

const INTENTS = ["right_answer", "source", "explain", "confidence", "expert", "new_question", "small_talk"];

const PATTERNS = [
  ["right_answer", /\b(right|correct|actual|real|true) (answer|value|number|amount)\b|\bwhat should it be\b|\bwhat is it then\b|\bso what is it\b/i],
  ["source", /\b(source|where (does|did) (it|this|that) come from|where did you (find|get)|reference|link)\b/i],
  ["explain", /\b(how did you (get|know|find|decide)|how do you know|why( is that| not)?\b|explain|reasoning|based on)\b/i],
  ["confidence", /\b(how sure|how certain|how confident|can i trust|confidence|trust (it|this|that))\b/i],
  ["expert", /\b(who (should|can|do) i (ask|talk|contact)|who knows|which expert|expert)\b/i],
];

let topic = null; // the last answer, with detail
let topicSaid = null; // the wrong value from the last warning, if any

function remember(answer, said = null) {
  if (answer && answer.matched) {
    topic = answer;
    topicSaid = said;
  }
}

// Called when the mascot warns, so "what's the right answer?" refers to the warning.
async function rememberWarning(issue) {
  try {
    remember(await brain.ask(issue.label), issue.said);
  } catch {
    // Keep the old topic.
  }
}

const date = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const sourceName = (t) =>
  t.source.replace(/^Official:\s*/i, "official notice on ").replace(/^Law:\s*/i, "law on ").replace(/:\s*/, " on ").replace(/^Teams /, "the Teams channel ");
// Prefer someone who backs the answer over someone whose older note was set aside.
const whoToAsk = (t) => {
  const d = t.detail || {};
  const setAsideBy = (d.setAside || []).map((x) => x.by);
  if (t.expert && !setAsideBy.includes(t.expert)) return t.expert;
  return (d.supporters || [])[0] || t.expert;
};
const speakable = (v) => String(v).replace(/€\s?([\d.,]+)/g, "$1 euros");

function reply(intent, t) {
  const d = t.detail || {};
  const v = t.value;
  switch (intent) {
    case "right_answer":
      return topicSaid
        ? `It's ${v}, not ${topicSaid}. That's the trusted value for ${t.label.toLowerCase()}.`
        : `The trusted value for ${t.label.toLowerCase()} is ${v}.`;
    case "source":
      return d.official
        ? `It comes from the ${sourceName(t)}${d.effectiveFrom ? `, in force since ${date(d.effectiveFrom)}` : ""}. That's an official publication.`
        : `It comes from ${sourceName(t)}${d.date ? `, written on ${date(d.date)}` : ""}.`;
    case "explain": {
      const parts = [];
      parts.push(d.official ? `I start from the ${sourceName(t)}, which is official` : `I start from ${sourceName(t)}`);
      if (d.supporters && d.supporters.length) parts.push(`${d.supporters.join(" and ")} ${d.supporters.length > 1 ? "say" : "says"} the same`);
      const aside = (d.setAside || [])[0];
      if (aside) parts.push(`I set aside ${aside.value} from ${aside.by || aside.source}, because it's ${aside.why}`);
      return `${parts.join(". ")}. That's why I trust ${v} at ${t.score} percent.`;
    }
    case "confidence":
      return t.status === "trusted"
        ? `${t.score} percent. It's backed by ${d.official ? "an official source" : "an expert"}${d.supporters && d.supporters.length ? `, and ${d.supporters.length} colleague${d.supporters.length > 1 ? "s agree" : " agrees"}` : ""}.`
        : `Only ${t.score} percent, so please check with ${whoToAsk(t) || "an expert"} before you use it.`;
    case "expert":
      return whoToAsk(t) ? `Ask ${whoToAsk(t)}. They back this answer.` : "Nobody owns this topic yet. I'll flag it for the team.";
    default:
      return null;
  }
}

async function classifyWithHaiku(question) {
  if (!env.ANTHROPIC_API_KEY || !topic) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 20,
        temperature: 0,
        system: `Classify the user's message to a payroll assistant. The current topic is "${topic.label}". Reply with exactly one word from: ${INTENTS.join(", ")}. Use new_question if it asks about a different payroll topic.`,
        messages: [{ role: "user", content: question.slice(0, 300) }],
      }),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const word = ((await res.json()).content?.[0]?.text || "").trim().toLowerCase();
    return INTENTS.includes(word) ? word : null; // the model can only pick from the list
  } catch {
    return null;
  }
}

// Returns { text, answer } where answer (if any) is shown as a card.
async function converse(question) {
  const chat = smallTalk(question);
  if (chat) return { text: chat };

  // A follow-up about the current topic, unless the question clearly names another topic.
  const namesOtherTopic = (() => {
    const f = brain.findFactByText(question);
    return f && topic && f.label !== topic.label;
  })();
  if (topic && !namesOtherTopic) {
    let intent = (PATTERNS.find(([, re]) => re.test(question)) || [])[0];
    if (!intent && !brain.findFactByText(question)) intent = await classifyWithHaiku(question);
    const text = intent && reply(intent, topic);
    if (text) return { text, answer: topic };
  }

  const answer = await brain.ask(question);
  if (!answer.matched || !answer.value) {
    return { text: answer.message && !answer.matched ? "I don't have a trusted answer for that yet. I'll flag it for an expert." : "Nothing in the brain applies to this case yet.", answer };
  }
  remember(answer);
  const status = answer.status === "trusted" ? `${answer.score} percent trusted` : `only ${answer.score} percent trusted, so double-check it`;
  return { text: `${answer.label}: ${answer.value}. ${status}, from the ${sourceName(answer)}.`, answer };
}

module.exports = { converse, rememberWarning, speakable };
