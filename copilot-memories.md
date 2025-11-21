# Copilot Memories

This file contains important facts about the EIASW implementation that should be remembered for future development sessions.

## Service Worker Architecture

**Subject:** Service Worker architecture  
**Fact:** Use event-driven message processing instead of polling for better performance  
**Citations:** `src/index.js:105-130` - Immediate processing trigger on send(), batch processing of all queued messages  
**Reason:** This pattern avoids the overhead of polling intervals and ensures immediate message processing. Future service worker implementations should follow this event-driven approach for better performance and lower CPU usage. This is critical for maintaining the daemon-like persistent nature of service workers.  
**Category:** general

## Message Identification

**Subject:** message identification  
**Fact:** Use crypto.randomUUID() for message IDs to prevent collisions  
**Citations:** `src/index.js:1-2` (import), `src/index.js:105` (usage) - randomUUID() provides collision-safe unique identifiers  
**Reason:** In high-frequency scenarios, timestamp-based IDs (Date.now() + Math.random()) can produce collisions. Using crypto.randomUUID() ensures globally unique identifiers. This is important for any message-based or event-driven system to maintain reliability under load.  
**Category:** general

## Testing Practices

**Subject:** testing practices  
**Fact:** Tests can be run with `npm test` using Node.js built-in test runner  
**Citations:** `package.json:7` - "test": "node --test" script, `test/index.test.js` - all tests using node:test module  
**Reason:** The project uses Node.js's built-in test runner (node:test) which is available in Node.js 18+. No external test framework dependencies needed. Future test additions should follow this pattern using the node:test module and its assert methods.  
**Category:** bootstrap_and_build

---

## Purpose

These memories capture key architectural decisions and best practices from the EIASW implementation. They serve as a reference for:

- Future contributors understanding the design choices
- Maintaining consistency in code patterns
- Avoiding common pitfalls (like polling instead of event-driven processing)
- Understanding the testing infrastructure

## Usage

When working on EIASW in future sessions:
1. Review these memories to understand core design principles
2. Follow the established patterns for consistency
3. Add new memories here as significant architectural decisions are made
