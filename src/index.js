import { EventEmitter } from 'events';

/**
 * ServiceWorker - A persistent daemon process inspired by Plan9 file servers
 * 
 * Each service worker:
 * - Runs continuously as a daemon
 * - Exposes a file-like interface for communication
 * - Can be started, stopped, and restarted
 * - Maintains state across requests
 * - Communicates via message passing
 */
export class ServiceWorker extends EventEmitter {
  constructor(name, handler) {
    super();
    this.name = name;
    this.handler = handler;
    this.state = 'stopped';
    this.context = {};
    this.messageQueue = [];
    this.processInterval = null;
  }

  /**
   * Start the service worker daemon
   */
  async start() {
    if (this.state === 'running') {
      throw new Error(`ServiceWorker ${this.name} is already running`);
    }

    this.state = 'starting';
    this.emit('starting', { name: this.name });

    try {
      if (this.handler.onStart) {
        await this.handler.onStart(this.context);
      }

      this.state = 'running';
      this.emit('started', { name: this.name });
      
      // Start message processing loop
      this.processInterval = setInterval(() => this._processMessages(), 10);
      
      return true;
    } catch (error) {
      this.state = 'error';
      this.emit('error', { name: this.name, error });
      throw error;
    }
  }

  /**
   * Stop the service worker daemon
   */
  async stop() {
    if (this.state === 'stopped') {
      return true;
    }

    this.state = 'stopping';
    this.emit('stopping', { name: this.name });

    try {
      if (this.processInterval) {
        clearInterval(this.processInterval);
        this.processInterval = null;
      }

      if (this.handler.onStop) {
        await this.handler.onStop(this.context);
      }

      this.state = 'stopped';
      this.emit('stopped', { name: this.name });
      
      return true;
    } catch (error) {
      this.state = 'error';
      this.emit('error', { name: this.name, error });
      throw error;
    }
  }

  /**
   * Restart the service worker daemon
   */
  async restart() {
    await this.stop();
    await this.start();
    return true;
  }

  /**
   * Send a message to the service worker
   * Returns a promise that resolves with the response
   */
  async send(message) {
    if (this.state !== 'running') {
      throw new Error(`ServiceWorker ${this.name} is not running (state: ${this.state})`);
    }

    return new Promise((resolve, reject) => {
      const messageId = Date.now() + Math.random();
      
      this.messageQueue.push({
        id: messageId,
        message,
        resolve,
        reject,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Process queued messages
   * @private
   */
  async _processMessages() {
    if (this.messageQueue.length === 0 || !this.handler.onMessage) {
      return;
    }

    const item = this.messageQueue.shift();
    
    try {
      const response = await this.handler.onMessage(item.message, this.context);
      item.resolve(response);
    } catch (error) {
      item.reject(error);
    }
  }

  /**
   * Get current state of the service worker
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      queueLength: this.messageQueue.length,
      context: { ...this.context }
    };
  }
}

/**
 * ServiceRegistry - Manages multiple service workers
 * Acts as the "file server" coordinator
 */
export class ServiceRegistry extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
  }

  /**
   * Register a new service worker
   */
  register(name, handler) {
    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered`);
    }

    const worker = new ServiceWorker(name, handler);
    
    // Forward events
    worker.on('starting', (e) => this.emit('service:starting', e));
    worker.on('started', (e) => this.emit('service:started', e));
    worker.on('stopping', (e) => this.emit('service:stopping', e));
    worker.on('stopped', (e) => this.emit('service:stopped', e));
    worker.on('error', (e) => this.emit('service:error', e));

    this.services.set(name, worker);
    this.emit('registered', { name });
    
    return worker;
  }

  /**
   * Unregister a service worker
   */
  async unregister(name) {
    const worker = this.services.get(name);
    if (!worker) {
      throw new Error(`Service ${name} is not registered`);
    }

    if (worker.state === 'running') {
      await worker.stop();
    }

    this.services.delete(name);
    this.emit('unregistered', { name });
    
    return true;
  }

  /**
   * Get a service worker by name
   */
  get(name) {
    return this.services.get(name);
  }

  /**
   * Start a service by name
   */
  async start(name) {
    const worker = this.services.get(name);
    if (!worker) {
      throw new Error(`Service ${name} is not registered`);
    }
    return worker.start();
  }

  /**
   * Stop a service by name
   */
  async stop(name) {
    const worker = this.services.get(name);
    if (!worker) {
      throw new Error(`Service ${name} is not registered`);
    }
    return worker.stop();
  }

  /**
   * Send a message to a service
   */
  async send(name, message) {
    const worker = this.services.get(name);
    if (!worker) {
      throw new Error(`Service ${name} is not registered`);
    }
    return worker.send(message);
  }

  /**
   * Start all registered services
   */
  async startAll() {
    const promises = [];
    for (const [name, worker] of this.services) {
      if (worker.state === 'stopped') {
        promises.push(worker.start());
      }
    }
    return Promise.all(promises);
  }

  /**
   * Stop all running services
   */
  async stopAll() {
    const promises = [];
    for (const [name, worker] of this.services) {
      if (worker.state === 'running') {
        promises.push(worker.stop());
      }
    }
    return Promise.all(promises);
  }

  /**
   * List all registered services
   */
  list() {
    return Array.from(this.services.keys());
  }

  /**
   * Get status of all services
   */
  status() {
    const status = {};
    for (const [name, worker] of this.services) {
      status[name] = worker.getState();
    }
    return status;
  }
}

// Default export
export default { ServiceWorker, ServiceRegistry };
