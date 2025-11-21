import { test } from 'node:test';
import assert from 'node:assert';
import { ServiceWorker, ServiceRegistry } from '../src/index.js';

test('Performance: concurrent message handling', async (t) => {
  const handler = {
    onMessage: async (message, context) => {
      // Simulate some async work
      await new Promise(resolve => setTimeout(resolve, 1));
      return { processed: message.id };
    }
  };

  const worker = new ServiceWorker('concurrent-worker', handler);
  await worker.start();

  // Send multiple messages concurrently
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(worker.send({ id: i }));
  }

  const results = await Promise.all(promises);
  
  assert.strictEqual(results.length, 100);
  
  // Verify all messages were processed
  const processedIds = results.map(r => r.processed).sort((a, b) => a - b);
  for (let i = 0; i < 100; i++) {
    assert.strictEqual(processedIds[i], i);
  }

  await worker.stop();
});

test('Performance: high-frequency messages', async (t) => {
  let counter = 0;
  
  const handler = {
    onStart: async (context) => {
      context.counter = 0;
    },
    onMessage: async (message, context) => {
      context.counter++;
      return context.counter;
    }
  };

  const worker = new ServiceWorker('high-freq-worker', handler);
  await worker.start();

  // Send 1000 messages rapidly
  const promises = [];
  for (let i = 0; i < 1000; i++) {
    promises.push(worker.send({ tick: i }));
  }

  const results = await Promise.all(promises);
  
  // Verify counter reached 1000
  const finalCount = results[results.length - 1];
  assert.strictEqual(finalCount, 1000);

  await worker.stop();
});

test('Registry: multiple services with concurrent operations', async (t) => {
  const registry = new ServiceRegistry();
  
  // Register multiple services
  for (let i = 1; i <= 5; i++) {
    registry.register(`service${i}`, {
      onStart: async (context) => {
        context.id = i;
        context.processed = 0;
      },
      onMessage: async (message, context) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        context.processed++;
        return { serviceId: context.id, count: context.processed };
      }
    });
  }

  await registry.startAll();

  // Send messages to all services concurrently
  const promises = [];
  for (let i = 1; i <= 5; i++) {
    for (let j = 0; j < 10; j++) {
      promises.push(
        registry.send(`service${i}`, { msg: j })
          .then(result => ({ ...result, targetService: i }))
      );
    }
  }

  const results = await Promise.all(promises);
  
  assert.strictEqual(results.length, 50);
  
  // Verify each service processed its messages
  for (let i = 1; i <= 5; i++) {
    const serviceResults = results.filter(r => r.targetService === i);
    assert.strictEqual(serviceResults.length, 10);
  }

  await registry.stopAll();
});

test('Performance: message queue buildup and drainage', async (t) => {
  const processedOrder = [];
  
  const handler = {
    onMessage: async (message, context) => {
      // Slow processing to build up queue
      await new Promise(resolve => setTimeout(resolve, 5));
      processedOrder.push(message.id);
      return message.id;
    }
  };

  const worker = new ServiceWorker('queue-worker', handler);
  await worker.start();

  // Rapidly queue many messages
  const promises = [];
  for (let i = 0; i < 50; i++) {
    promises.push(worker.send({ id: i }));
  }

  await Promise.all(promises);
  
  // Verify FIFO ordering
  assert.strictEqual(processedOrder.length, 50);
  for (let i = 0; i < 50; i++) {
    assert.strictEqual(processedOrder[i], i);
  }

  await worker.stop();
});

test('Stress: rapid start/stop cycles', async (t) => {
  let startCount = 0;
  let stopCount = 0;

  const handler = {
    onStart: async (context) => {
      startCount++;
    },
    onStop: async (context) => {
      stopCount++;
    }
  };

  const worker = new ServiceWorker('cycle-worker', handler);

  // Perform multiple start/stop cycles
  for (let i = 0; i < 10; i++) {
    await worker.start();
    assert.strictEqual(worker.state, 'running');
    await worker.stop();
    assert.strictEqual(worker.state, 'stopped');
  }

  assert.strictEqual(startCount, 10);
  assert.strictEqual(stopCount, 10);
});
