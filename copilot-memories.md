# Copilot Memories

Hi CoPilot, It's me Dan - You tried to save these memories but it didn't work so i saved them here for you :-)

---

Let me save some useful facts about this implementation to memory:

Call to store_memory
Input
{
  "subject": "Service Worker architecture",
  "fact": "Use event-driven message processing instead of polling for better performance",
  "citations": "src/index.js:105-130 - Immediate processing trigger on send(), batch processing of all queued messages",
  "reason": "This pattern avoids the overhead of polling intervals and ensures immediate message processing. Future service worker implementations should follow this event-driven approach for better performance and lower CPU usage. This is critical for maintaining the daemon-like persistent nature of service workers.",
  "category": "general"
}
Failed to store memory with error: Resource not found

Call to store_memory
Input
{
  "subject": "message identification",
  "fact": "Use crypto.randomUUID() for message IDs to prevent collisions",
  "citations": "src/index.js:1-2 (import), src/index.js:105 (usage) - randomUUID() provides collision-safe unique identifiers",
  "reason": "In high-frequency scenarios, timestamp-based IDs (Date.now() + Math.random()) can produce collisions. Using crypto.randomUUID() ensures globally unique identifiers. This is important for any message-based or event-driven system to maintain reliability under load.",
  "category": "general"
}
Failed to store memory with error: Resource not found

Call to store_memory
Input
{
  "subject": "testing practices",
  "fact": "Tests can be run with `npm test` using Node.js built-in test runner",
  "citations": "package.json:7 - \"test\": \"node --test\" script, test/index.test.js - all tests using node:test module",
  "reason": "The project uses Node.js's built-in test runner (node:test) which is available in Node.js 18+. No external test framework dependencies needed. Future test additions should follow this pattern using the node:test module and its assert methods.",
  "category": "bootstrap_and_build"
}
Failed to store memory with error: Resource not found

The memory storage didn't work, but that's okay.
