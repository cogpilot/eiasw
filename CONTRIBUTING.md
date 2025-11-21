# Contributing to EIASW

Thank you for your interest in contributing to EIASW (Everything Is A Service Worker)!

## Philosophy

EIASW follows the Plan9 principle of simplicity and uniformity:

- **Minimal**: Keep the core small and focused
- **Uniform**: Consistent patterns across all services
- **Composable**: Services should work together seamlessly
- **Event-driven**: No polling, immediate processing
- **Self-documenting**: Code should be clear and well-commented

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/cogpilot/eiasw.git
cd eiasw

# Run tests
npm test

# Run examples
node examples/basic.js
node examples/plan9.js
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Keep changes focused and minimal
- Follow existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Test

```bash
# Run all tests
npm test

# Run specific test file
node --test test/index.test.js
```

### 4. Commit

```bash
git add .
git commit -m "Description of changes"
```

Follow these commit message guidelines:
- Use present tense ("Add feature" not "Added feature")
- Keep first line under 50 characters
- Add detailed description if needed

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Style

### JavaScript

- Use ES6+ features
- Prefer `const` over `let`, avoid `var`
- Use async/await over callbacks
- Keep functions small and focused
- Add JSDoc comments for public APIs

Example:
```javascript
/**
 * Send a message to the service worker
 * @param {Object} message - The message to send
 * @returns {Promise<Object>} The response
 */
async send(message) {
  // Implementation
}
```

### File Organization

```
eiasw/
├── src/           # Source code
│   └── index.js   # Core implementation
├── test/          # Tests
│   ├── index.test.js
│   └── performance.test.js
├── examples/      # Usage examples
│   ├── basic.js
│   └── plan9.js
└── docs/          # Documentation
```

## Testing

### Writing Tests

Use Node.js built-in test runner:

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { ServiceWorker } from '../src/index.js';

test('ServiceWorker: basic lifecycle', async (t) => {
  const worker = new ServiceWorker('test', {});
  
  await worker.start();
  assert.strictEqual(worker.state, 'running');
  
  await worker.stop();
  assert.strictEqual(worker.state, 'stopped');
});
```

### Test Categories

1. **Unit Tests** - Test individual components
2. **Integration Tests** - Test component interactions
3. **Performance Tests** - Test under load
4. **Stress Tests** - Test edge cases and limits

### Running Tests

```bash
# All tests
npm test

# With coverage (if configured)
npm run test:coverage

# Specific file
node --test test/index.test.js
```

## Documentation

### Code Comments

- Add JSDoc for all public APIs
- Explain "why" not "what" for complex logic
- Keep comments up to date with code changes

### README Updates

Update README.md when:
- Adding new features
- Changing public APIs
- Adding new examples

### Architecture Documentation

Update ARCHITECTURE.md for:
- Design decisions
- Performance optimizations
- New patterns or concepts

## Adding Examples

Examples should:
- Be self-contained
- Demonstrate real-world use cases
- Include console output for clarity
- Follow Plan9 principles where applicable

Example structure:
```javascript
import { ServiceRegistry } from '../src/index.js';

const registry = new ServiceRegistry();

// Register service
registry.register('name', {
  onStart: async (context) => {
    // Initialize
  },
  onMessage: async (message, context) => {
    // Process
    return result;
  },
  onStop: async (context) => {
    // Cleanup
  }
});

// Demo function
async function demo() {
  await registry.start('name');
  const result = await registry.send('name', { data: 'test' });
  console.log(result);
  await registry.stop('name');
}

demo().catch(console.error);
```

## Performance Considerations

When contributing, keep these in mind:

### Event-Driven Processing

✅ DO: Trigger processing immediately
```javascript
async send(message) {
  this.messageQueue.push(item);
  this._processMessages(); // Immediate
}
```

❌ DON'T: Use polling
```javascript
// Bad - polling overhead
setInterval(() => this._processMessages(), 100);
```

### Batch Operations

✅ DO: Process all available messages
```javascript
while (this.messageQueue.length > 0) {
  const item = this.messageQueue.shift();
  await processItem(item);
}
```

❌ DON'T: Process one at a time with delays
```javascript
// Bad - queue buildup
const item = this.messageQueue.shift();
await processItem(item);
```

### Resource Management

✅ DO: Clean up in onStop
```javascript
onStop: async (context) => {
  context.connections.forEach(c => c.close());
  context.connections = [];
}
```

❌ DON'T: Leave resources dangling
```javascript
onStop: async (context) => {
  // Bad - resources not cleaned up
}
```

## Issue Guidelines

### Reporting Bugs

Include:
- Node.js version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Code samples if applicable

### Requesting Features

Explain:
- Use case and motivation
- Proposed API if applicable
- How it fits Plan9 principles
- Performance implications

### Security Issues

Report security issues privately to the maintainers, not in public issues.

## Pull Request Process

1. **Ensure tests pass**: `npm test` must succeed
2. **Update documentation**: README, ARCHITECTURE, etc.
3. **Add tests**: Cover new functionality
4. **Keep changes focused**: One feature/fix per PR
5. **Write clear description**: Explain what and why

### PR Description Template

```markdown
## Changes

Brief description of changes

## Motivation

Why these changes are needed

## Testing

How the changes were tested

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Examples added/updated (if applicable)
- [ ] No breaking changes (or noted in description)
```

## Code Review

Expect reviewers to check:
- Code quality and style
- Test coverage
- Documentation completeness
- Performance impact
- Alignment with Plan9 principles

Be patient and responsive to feedback. Reviews help maintain code quality.

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0-or-later license.

## Questions?

- Open a GitHub issue for questions
- Check existing issues and documentation first
- Be respectful and constructive

## Recognition

Contributors will be recognized in:
- Git commit history
- Release notes
- CONTRIBUTORS file (if created)

Thank you for contributing to EIASW! 🎉