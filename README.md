# EIASW - Everything Is A Service Worker

**Persistent daemon architecture inspired by Plan9 file servers**

EIASW is a framework for building persistent service workers that act as long-running daemons, inspired by Plan9's file server architecture. Every service is a worker that maintains state, processes messages, and runs continuously until explicitly stopped.

## Philosophy

In Plan9, everything is a file server - processes expose their functionality through a file-like interface. EIASW applies this principle to modern service architectures:

- **Everything is persistent**: Services run as long-lived daemons
- **Message-based communication**: Services communicate via message passing
- **State preservation**: Each service maintains its own context across requests
- **Lifecycle management**: Explicit start/stop/restart controls
- **Event-driven**: Rich event system for monitoring and coordination

## Installation

```bash
npm install eiasw
```

## Quick Start

```javascript
import { ServiceRegistry } from 'eiasw';

// Create a service registry
const registry = new ServiceRegistry();

// Register a service
registry.register('counter', {
  onStart: async (context) => {
    context.count = 0;
  },
  
  onMessage: async (message, context) => {
    if (message.action === 'increment') {
      context.count++;
    }
    return { count: context.count };
  },
  
  onStop: async (context) => {
    console.log(`Final count: ${context.count}`);
  }
});

// Start the service
await registry.start('counter');

// Send messages
const result = await registry.send('counter', { action: 'increment' });
console.log(result); // { count: 1 }

// Stop when done
await registry.stop('counter');
```

## Core Concepts

### ServiceWorker

A `ServiceWorker` is a persistent daemon that:
- Maintains state in a `context` object
- Processes messages through a handler
- Emits lifecycle events
- Runs continuously until stopped

```javascript
import { ServiceWorker } from 'eiasw';

const worker = new ServiceWorker('my-service', {
  onStart: async (context) => {
    // Initialize service state
    context.data = [];
  },
  
  onMessage: async (message, context) => {
    // Process incoming messages
    return { processed: true };
  },
  
  onStop: async (context) => {
    // Cleanup on shutdown
  }
});

await worker.start();
await worker.send({ type: 'ping' });
await worker.stop();
```

### ServiceRegistry

A `ServiceRegistry` manages multiple service workers:
- Register/unregister services
- Start/stop services individually or all at once
- Route messages to the correct service
- Monitor service health and status

```javascript
import { ServiceRegistry } from 'eiasw';

const registry = new ServiceRegistry();

// Register multiple services
registry.register('auth', authHandler);
registry.register('database', dbHandler);
registry.register('cache', cacheHandler);

// Start all services
await registry.startAll();

// Send message to a specific service
const result = await registry.send('auth', { action: 'login', user: 'admin' });

// Check service status
const status = registry.status();
console.log(status);

// Stop all services
await registry.stopAll();
```

## Handler Interface

Service handlers implement up to three lifecycle methods:

```javascript
const handler = {
  // Called when service starts
  onStart: async (context) => {
    // Initialize state, open connections, etc.
    context.connections = [];
  },
  
  // Called for each message
  onMessage: async (message, context) => {
    // Process message and return response
    return { success: true };
  },
  
  // Called when service stops
  onStop: async (context) => {
    // Cleanup, close connections, etc.
    context.connections.forEach(conn => conn.close());
  }
};
```

## Events

Both `ServiceWorker` and `ServiceRegistry` emit events:

### ServiceWorker Events

```javascript
worker.on('starting', ({ name }) => console.log('Starting...'));
worker.on('started', ({ name }) => console.log('Started!'));
worker.on('stopping', ({ name }) => console.log('Stopping...'));
worker.on('stopped', ({ name }) => console.log('Stopped!'));
worker.on('error', ({ name, error }) => console.error('Error:', error));
```

### ServiceRegistry Events

```javascript
registry.on('registered', ({ name }) => console.log('Registered'));
registry.on('unregistered', ({ name }) => console.log('Unregistered'));
registry.on('service:started', ({ name }) => console.log('Service started'));
registry.on('service:stopped', ({ name }) => console.log('Service stopped'));
registry.on('service:error', ({ name, error }) => console.error('Error'));
```

## Examples

### File Server (Plan9-style)

```javascript
registry.register('fileServer', {
  onStart: async (context) => {
    context.files = new Map();
    context.files.set('/hello.txt', 'Hello, World!');
  },
  
  onMessage: async (message, context) => {
    const { operation, path, content } = message;
    
    switch (operation) {
      case 'read':
        return context.files.get(path) || null;
      case 'write':
        context.files.set(path, content);
        return { success: true };
      case 'list':
        return Array.from(context.files.keys());
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
});

await registry.start('fileServer');

// Use the file server
const files = await registry.send('fileServer', { operation: 'list' });
const content = await registry.send('fileServer', { 
  operation: 'read', 
  path: '/hello.txt' 
});
```

### Persistent Cache

```javascript
registry.register('cache', {
  onStart: async (context) => {
    context.store = new Map();
    context.hits = 0;
    context.misses = 0;
  },
  
  onMessage: async (message, context) => {
    const { action, key, value, ttl } = message;
    
    if (action === 'get') {
      if (context.store.has(key)) {
        context.hits++;
        return { value: context.store.get(key), hit: true };
      } else {
        context.misses++;
        return { value: null, hit: false };
      }
    }
    
    if (action === 'set') {
      context.store.set(key, value);
      if (ttl) {
        setTimeout(() => context.store.delete(key), ttl);
      }
      return { success: true };
    }
    
    if (action === 'stats') {
      return { 
        size: context.store.size,
        hits: context.hits,
        misses: context.misses,
        hitRate: context.hits / (context.hits + context.misses)
      };
    }
  }
});
```

### Event Logger

```javascript
registry.register('logger', {
  onStart: async (context) => {
    context.logs = [];
  },
  
  onMessage: async (message, context) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, ...message };
    context.logs.push(logEntry);
    
    if (message.level === 'error') {
      console.error(`[${timestamp}] ERROR: ${message.message}`);
    }
    
    return { logged: true, total: context.logs.length };
  },
  
  onStop: async (context) => {
    console.log(`Total logs collected: ${context.logs.length}`);
  }
});
```

## API Reference

### ServiceWorker

#### Constructor
```javascript
new ServiceWorker(name, handler)
```

#### Methods
- `async start()` - Start the service worker
- `async stop()` - Stop the service worker
- `async restart()` - Restart the service worker
- `async send(message)` - Send a message and get response
- `getState()` - Get current state information

#### Properties
- `name` - Service worker name
- `state` - Current state: 'stopped', 'starting', 'running', 'stopping', 'error'
- `context` - Persistent context object

### ServiceRegistry

#### Constructor
```javascript
new ServiceRegistry()
```

#### Methods
- `register(name, handler)` - Register a new service
- `async unregister(name)` - Unregister a service
- `get(name)` - Get a service worker instance
- `async start(name)` - Start a specific service
- `async stop(name)` - Stop a specific service
- `async send(name, message)` - Send message to a service
- `async startAll()` - Start all registered services
- `async stopAll()` - Stop all running services
- `list()` - List all registered service names
- `status()` - Get status of all services

## Use Cases

- **Microservices**: Each service is a persistent worker
- **Background Processing**: Long-running tasks with state
- **Protocol Servers**: File servers, database proxies, API gateways
- **Event Processing**: Stateful stream processors
- **Resource Managers**: Connection pools, caches, queues
- **Monitoring Services**: Metrics collection, health checks

## Architecture

EIASW follows the Plan9 principle of "everything is a file server":

1. **Services as Daemons**: Each service runs persistently
2. **Message-Based I/O**: Communication via message passing (like file operations)
3. **Uniform Interface**: All services expose the same handler interface
4. **State Preservation**: Context maintained across requests (like file system state)
5. **Lifecycle Control**: Explicit start/stop management (like mounting/unmounting)

## License

AGPL-3.0-or-later

## Contributing

Contributions welcome! This project follows the Plan9 philosophy of simplicity and uniformity.

## Credits

Inspired by Plan9's file server architecture and modern service worker patterns.