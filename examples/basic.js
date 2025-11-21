import { ServiceRegistry } from '../src/index.js';

// Create a service registry
const registry = new ServiceRegistry();

// Register a file server-like service (Plan9 inspired)
registry.register('fileServer', {
  onStart: async (context) => {
    console.log('📁 File Server starting...');
    context.files = new Map();
    context.files.set('/hello.txt', 'Hello, World!');
    context.files.set('/readme.md', '# EIASW\nEverything is a Service Worker');
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
      
      case 'delete':
        const existed = context.files.has(path);
        context.files.delete(path);
        return { success: existed };
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
  
  onStop: async (context) => {
    console.log('📁 File Server stopping...');
  }
});

// Register a logging service
registry.register('logger', {
  onStart: async (context) => {
    console.log('📝 Logger starting...');
    context.logs = [];
  },
  
  onMessage: async (message, context) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, ...message };
    context.logs.push(logEntry);
    
    console.log(`[${timestamp}] ${message.level}: ${message.message}`);
    
    return { logged: true, total: context.logs.length };
  },
  
  onStop: async (context) => {
    console.log('📝 Logger stopping...');
    console.log(`Total logs: ${context.logs.length}`);
  }
});

// Register a counter service
registry.register('counter', {
  onStart: async (context) => {
    console.log('🔢 Counter starting...');
    context.count = 0;
  },
  
  onMessage: async (message, context) => {
    const { action, value = 1 } = message;
    
    switch (action) {
      case 'increment':
        context.count += value;
        break;
      case 'decrement':
        context.count -= value;
        break;
      case 'reset':
        context.count = 0;
        break;
    }
    
    return { count: context.count };
  },
  
  onStop: async (context) => {
    console.log('🔢 Counter stopping...');
    console.log(`Final count: ${context.count}`);
  }
});

// Demo function
async function demo() {
  console.log('\n=== EIASW Demo: Everything is a Service Worker ===\n');
  
  // Listen to registry events
  registry.on('service:started', (e) => {
    console.log(`✅ Service started: ${e.name}`);
  });
  
  registry.on('service:stopped', (e) => {
    console.log(`⛔ Service stopped: ${e.name}`);
  });
  
  // Start all services
  console.log('Starting all services...\n');
  await registry.startAll();
  
  console.log('\n--- File Server Operations ---\n');
  
  // List files
  const files = await registry.send('fileServer', { operation: 'list' });
  console.log('Files:', files);
  
  // Read a file
  const content = await registry.send('fileServer', { 
    operation: 'read', 
    path: '/hello.txt' 
  });
  console.log('Read /hello.txt:', content);
  
  // Write a new file
  await registry.send('fileServer', { 
    operation: 'write', 
    path: '/data.json',
    content: JSON.stringify({ foo: 'bar' })
  });
  console.log('Wrote /data.json');
  
  // List files again
  const filesAfter = await registry.send('fileServer', { operation: 'list' });
  console.log('Files after write:', filesAfter);
  
  console.log('\n--- Logger Operations ---\n');
  
  // Log some messages
  await registry.send('logger', { 
    level: 'info', 
    message: 'System initialized' 
  });
  
  await registry.send('logger', { 
    level: 'warning', 
    message: 'High memory usage detected' 
  });
  
  await registry.send('logger', { 
    level: 'error', 
    message: 'Connection timeout' 
  });
  
  console.log('\n--- Counter Operations ---\n');
  
  // Increment counter
  let result = await registry.send('counter', { action: 'increment' });
  console.log('After increment:', result);
  
  result = await registry.send('counter', { action: 'increment', value: 5 });
  console.log('After increment by 5:', result);
  
  result = await registry.send('counter', { action: 'decrement', value: 2 });
  console.log('After decrement by 2:', result);
  
  console.log('\n--- Service Status ---\n');
  
  // Get status of all services
  const status = registry.status();
  for (const [name, state] of Object.entries(status)) {
    console.log(`${name}: ${state.state} (queue: ${state.queueLength})`);
  }
  
  console.log('\n--- Cleanup ---\n');
  
  // Stop all services
  await registry.stopAll();
  
  console.log('\n=== Demo Complete ===\n');
}

// Run demo
demo().catch(console.error);
