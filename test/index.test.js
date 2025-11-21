import { test } from 'node:test';
import assert from 'node:assert';
import { ServiceWorker, ServiceRegistry } from '../src/index.js';

test('ServiceWorker: basic lifecycle', async (t) => {
  const handler = {
    onStart: async (context) => {
      context.started = true;
    },
    onStop: async (context) => {
      context.stopped = true;
    }
  };

  const worker = new ServiceWorker('test-worker', handler);
  
  assert.strictEqual(worker.state, 'stopped');
  assert.strictEqual(worker.name, 'test-worker');
  
  await worker.start();
  assert.strictEqual(worker.state, 'running');
  assert.strictEqual(worker.context.started, true);
  
  await worker.stop();
  assert.strictEqual(worker.state, 'stopped');
  assert.strictEqual(worker.context.stopped, true);
});

test('ServiceWorker: message handling', async (t) => {
  const handler = {
    onMessage: async (message, context) => {
      if (!context.counter) context.counter = 0;
      context.counter++;
      return { echo: message, counter: context.counter };
    }
  };

  const worker = new ServiceWorker('echo-worker', handler);
  await worker.start();

  const response1 = await worker.send({ text: 'hello' });
  assert.strictEqual(response1.echo.text, 'hello');
  assert.strictEqual(response1.counter, 1);

  const response2 = await worker.send({ text: 'world' });
  assert.strictEqual(response2.echo.text, 'world');
  assert.strictEqual(response2.counter, 2);

  await worker.stop();
});

test('ServiceWorker: restart', async (t) => {
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

  const worker = new ServiceWorker('restart-worker', handler);
  
  await worker.start();
  assert.strictEqual(startCount, 1);
  assert.strictEqual(stopCount, 0);
  
  await worker.restart();
  assert.strictEqual(startCount, 2);
  assert.strictEqual(stopCount, 1);
  
  await worker.stop();
  assert.strictEqual(stopCount, 2);
});

test('ServiceWorker: events', async (t) => {
  const events = [];
  const handler = {
    onStart: async () => {},
    onStop: async () => {}
  };

  const worker = new ServiceWorker('event-worker', handler);
  
  worker.on('starting', (e) => events.push(`starting:${e.name}`));
  worker.on('started', (e) => events.push(`started:${e.name}`));
  worker.on('stopping', (e) => events.push(`stopping:${e.name}`));
  worker.on('stopped', (e) => events.push(`stopped:${e.name}`));

  await worker.start();
  await worker.stop();

  assert.deepStrictEqual(events, [
    'starting:event-worker',
    'started:event-worker',
    'stopping:event-worker',
    'stopped:event-worker'
  ]);
});

test('ServiceWorker: error when sending to stopped worker', async (t) => {
  const handler = {
    onMessage: async (message) => message
  };

  const worker = new ServiceWorker('stopped-worker', handler);
  
  await assert.rejects(
    async () => await worker.send({ test: true }),
    /not running/
  );
});

test('ServiceRegistry: register and unregister', async (t) => {
  const registry = new ServiceRegistry();
  const handler = { onMessage: async (msg) => msg };

  const worker = registry.register('test-service', handler);
  assert.ok(worker instanceof ServiceWorker);
  assert.strictEqual(worker.name, 'test-service');
  
  const retrieved = registry.get('test-service');
  assert.strictEqual(retrieved, worker);
  
  await registry.unregister('test-service');
  assert.strictEqual(registry.get('test-service'), undefined);
});

test('ServiceRegistry: start and stop services', async (t) => {
  const registry = new ServiceRegistry();
  
  registry.register('service1', {
    onStart: async (context) => { context.value = 1; },
    onStop: async (context) => {}
  });
  
  registry.register('service2', {
    onStart: async (context) => { context.value = 2; },
    onStop: async (context) => {}
  });

  await registry.start('service1');
  const worker1 = registry.get('service1');
  assert.strictEqual(worker1.state, 'running');
  
  await registry.stop('service1');
  assert.strictEqual(worker1.state, 'stopped');
});

test('ServiceRegistry: send messages', async (t) => {
  const registry = new ServiceRegistry();
  
  registry.register('calculator', {
    onMessage: async (message, context) => {
      const { op, a, b } = message;
      if (op === 'add') return a + b;
      if (op === 'multiply') return a * b;
      return null;
    }
  });

  await registry.start('calculator');

  const sum = await registry.send('calculator', { op: 'add', a: 5, b: 3 });
  assert.strictEqual(sum, 8);

  const product = await registry.send('calculator', { op: 'multiply', a: 5, b: 3 });
  assert.strictEqual(product, 15);

  await registry.stop('calculator');
});

test('ServiceRegistry: startAll and stopAll', async (t) => {
  const registry = new ServiceRegistry();
  
  for (let i = 1; i <= 3; i++) {
    registry.register(`service${i}`, {
      onStart: async (context) => { context.id = i; },
      onStop: async (context) => {}
    });
  }

  await registry.startAll();
  
  const status = registry.status();
  assert.strictEqual(status.service1.state, 'running');
  assert.strictEqual(status.service2.state, 'running');
  assert.strictEqual(status.service3.state, 'running');

  await registry.stopAll();
  
  const statusAfter = registry.status();
  assert.strictEqual(statusAfter.service1.state, 'stopped');
  assert.strictEqual(statusAfter.service2.state, 'stopped');
  assert.strictEqual(statusAfter.service3.state, 'stopped');
});

test('ServiceRegistry: list services', async (t) => {
  const registry = new ServiceRegistry();
  
  registry.register('alpha', { onMessage: async (msg) => msg });
  registry.register('beta', { onMessage: async (msg) => msg });
  registry.register('gamma', { onMessage: async (msg) => msg });

  const list = registry.list();
  assert.strictEqual(list.length, 3);
  assert.ok(list.includes('alpha'));
  assert.ok(list.includes('beta'));
  assert.ok(list.includes('gamma'));
});

test('ServiceRegistry: events forwarding', async (t) => {
  const events = [];
  const registry = new ServiceRegistry();

  registry.on('service:starting', (e) => events.push(`starting:${e.name}`));
  registry.on('service:started', (e) => events.push(`started:${e.name}`));
  registry.on('registered', (e) => events.push(`registered:${e.name}`));

  registry.register('test', { onStart: async () => {} });
  await registry.start('test');

  assert.ok(events.includes('registered:test'));
  assert.ok(events.includes('starting:test'));
  assert.ok(events.includes('started:test'));
  
  await registry.stop('test');
});

test('ServiceWorker: getState', async (t) => {
  const handler = {
    onStart: async (context) => { context.foo = 'bar'; }
  };

  const worker = new ServiceWorker('state-worker', handler);
  
  let state = worker.getState();
  assert.strictEqual(state.name, 'state-worker');
  assert.strictEqual(state.state, 'stopped');
  assert.strictEqual(state.queueLength, 0);
  
  await worker.start();
  
  state = worker.getState();
  assert.strictEqual(state.state, 'running');
  assert.strictEqual(state.context.foo, 'bar');
  
  await worker.stop();
});

test('Integration: persistent state across messages', async (t) => {
  const registry = new ServiceRegistry();
  
  registry.register('counter', {
    onStart: async (context) => {
      context.count = 0;
    },
    onMessage: async (message, context) => {
      if (message.action === 'increment') {
        context.count++;
      } else if (message.action === 'decrement') {
        context.count--;
      }
      return context.count;
    }
  });

  await registry.start('counter');

  const count1 = await registry.send('counter', { action: 'increment' });
  assert.strictEqual(count1, 1);

  const count2 = await registry.send('counter', { action: 'increment' });
  assert.strictEqual(count2, 2);

  const count3 = await registry.send('counter', { action: 'decrement' });
  assert.strictEqual(count3, 1);

  await registry.stop('counter');
});
