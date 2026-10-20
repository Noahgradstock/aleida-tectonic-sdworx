// Public API of the trust engine. Import from here, not from the individual files.
export * from "./types";
export { POINTS, CAPS, HALF_LIFE_DAYS, STATUS } from "./config";
export { evaluateFact } from "./score";
export { matchScope } from "./scope";
export { ask, matchFact, type AskResult } from "./ask";
export { MemoryFeedbackStore, parseFeedback, parseContext, type FeedbackStore } from "./feedback";
export { mockKnowledgeBase, MOCK_NOW } from "./mock";
export { extractClaims, findValues, parseValue, unitOf, type Channel, type Extracted, type Quantity, type Skipped } from "./extract";
export { rankContacts, lastUpdated, type Contact, type ContactRanking } from "./contacts";
export { buildKnowledgeGraph, type KnowledgeGraph, type GraphNode, type GraphEdge, type PersonCv, type CvEntry, type NodeKind } from "./graph";
