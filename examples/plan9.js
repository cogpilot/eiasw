import { ServiceRegistry } from '../src/index.js';

/**
 * Plan9-style File Server Example
 * 
 * In Plan9, every resource is accessed through a file-like interface.
 * This example demonstrates how EIASW applies this principle:
 * - Each service worker is like a file server
 * - Operations are performed via message passing (like file I/O)
 * - Services maintain persistent state (like mounted filesystems)
 */

const registry = new ServiceRegistry();

// 9P-inspired file server
registry.register('9pfs', {
  onStart: async (context) => {
    console.log('🌳 Plan9 File System mounting...');
    
    // Create a simple hierarchical file system
    context.fs = {
      '/': { type: 'dir', entries: ['proc', 'net', 'dev'] },
      '/proc': { type: 'dir', entries: ['cpuinfo', 'meminfo'] },
      '/proc/cpuinfo': { type: 'file', content: 'CPU: 4 cores @ 3.2GHz' },
      '/proc/meminfo': { type: 'file', content: 'Memory: 16GB total, 8GB free' },
      '/net': { type: 'dir', entries: ['tcp', 'udp'] },
      '/net/tcp': { type: 'file', content: 'TCP connections: 42' },
      '/net/udp': { type: 'file', content: 'UDP sockets: 7' },
      '/dev': { type: 'dir', entries: ['null', 'random'] },
      '/dev/null': { type: 'file', content: '' },
      '/dev/random': { type: 'file', content: () => Math.random().toString() }
    };
    
    context.openFiles = new Map();
    context.nextFd = 1;
  },
  
  onMessage: async (message, context) => {
    const { op, path, data } = message;
    
    switch (op) {
      case 'stat': {
        const entry = context.fs[path];
        if (!entry) return { error: 'ENOENT', message: 'No such file or directory' };
        return { type: entry.type, path };
      }
      
      case 'open': {
        const entry = context.fs[path];
        if (!entry) return { error: 'ENOENT', message: 'No such file or directory' };
        
        const fd = context.nextFd++;
        context.openFiles.set(fd, { path, entry });
        return { fd };
      }
      
      case 'read': {
        const { fd } = message;
        const file = context.openFiles.get(fd);
        if (!file) return { error: 'EBADF', message: 'Bad file descriptor' };
        
        const { entry } = file;
        if (entry.type !== 'file') {
          return { error: 'EISDIR', message: 'Is a directory' };
        }
        
        const content = typeof entry.content === 'function' 
          ? entry.content() 
          : entry.content;
        
        return { data: content };
      }
      
      case 'readdir': {
        const entry = context.fs[path];
        if (!entry) return { error: 'ENOENT', message: 'No such file or directory' };
        if (entry.type !== 'dir') {
          return { error: 'ENOTDIR', message: 'Not a directory' };
        }
        
        return { entries: entry.entries };
      }
      
      case 'close': {
        const { fd } = message;
        const existed = context.openFiles.has(fd);
        context.openFiles.delete(fd);
        return { success: existed };
      }
      
      case 'walk': {
        // Walk the file tree (9P operation)
        const parts = path.split('/').filter(p => p);
        let current = '/';
        const walked = ['/'];
        
        for (const part of parts) {
          current = current === '/' ? `/${part}` : `${current}/${part}`;
          if (!context.fs[current]) {
            return { error: 'ENOENT', walked };
          }
          walked.push(current);
        }
        
        return { walked };
      }
      
      default:
        return { error: 'ENOSYS', message: 'Operation not implemented' };
    }
  },
  
  onStop: async (context) => {
    console.log('🌳 Plan9 File System unmounting...');
    console.log(`Files accessed: ${context.nextFd - 1}`);
  }
});

// Network service (also file-like)
registry.register('netfs', {
  onStart: async (context) => {
    console.log('🌐 Network File System starting...');
    context.connections = [];
  },
  
  onMessage: async (message, context) => {
    const { op, addr, port, protocol = 'tcp' } = message;
    
    switch (op) {
      case 'dial': {
        const connId = context.connections.length;
        const conn = { id: connId, addr, port, protocol, state: 'established' };
        context.connections.push(conn);
        return { connId, fd: 3 + connId }; // Like opening a file descriptor
      }
      
      case 'write': {
        const { connId, data } = message;
        const conn = context.connections[connId];
        if (!conn) return { error: 'EBADF' };
        
        console.log(`  → Sending to ${conn.addr}:${conn.port}: ${data}`);
        return { written: data.length };
      }
      
      case 'read': {
        const { connId } = message;
        const conn = context.connections[connId];
        if (!conn) return { error: 'EBADF' };
        
        // Simulate receiving data
        return { data: `Response from ${conn.addr}` };
      }
      
      case 'close': {
        const { connId } = message;
        const conn = context.connections[connId];
        if (conn) {
          conn.state = 'closed';
          return { success: true };
        }
        return { error: 'EBADF' };
      }
      
      default:
        return { error: 'ENOSYS' };
    }
  },
  
  onStop: async (context) => {
    console.log('🌐 Network File System stopping...');
    console.log(`Total connections: ${context.connections.length}`);
  }
});

// Run demonstration
async function demo() {
  console.log('\n=== Plan9-style File Server Demo ===\n');
  
  await registry.startAll();
  
  console.log('\n--- File System Operations (9P-style) ---\n');
  
  // Stat a file
  let result = await registry.send('9pfs', { op: 'stat', path: '/proc/cpuinfo' });
  console.log('Stat /proc/cpuinfo:', result);
  
  // Read a directory
  result = await registry.send('9pfs', { op: 'readdir', path: '/proc' });
  console.log('Readdir /proc:', result);
  
  // Walk the file tree
  result = await registry.send('9pfs', { op: 'walk', path: '/proc/cpuinfo' });
  console.log('Walk /proc/cpuinfo:', result);
  
  // Open and read a file
  result = await registry.send('9pfs', { op: 'open', path: '/proc/meminfo' });
  const fd = result.fd;
  console.log('Opened /proc/meminfo, fd:', fd);
  
  result = await registry.send('9pfs', { op: 'read', fd });
  console.log('Read from fd', fd + ':', result.data);
  
  await registry.send('9pfs', { op: 'close', fd });
  console.log('Closed fd', fd);
  
  // Read dynamic content
  result = await registry.send('9pfs', { op: 'open', path: '/dev/random' });
  const randFd = result.fd;
  result = await registry.send('9pfs', { op: 'read', fd: randFd });
  console.log('Random data:', result.data);
  await registry.send('9pfs', { op: 'close', fd: randFd });
  
  console.log('\n--- Network Operations (File-like) ---\n');
  
  // Dial a connection (like opening a file)
  result = await registry.send('netfs', { 
    op: 'dial', 
    addr: '192.168.1.100', 
    port: 8080 
  });
  const connId = result.connId;
  console.log('Dialed connection:', result);
  
  // Write data (like writing to a file)
  result = await registry.send('netfs', { 
    op: 'write', 
    connId, 
    data: 'GET / HTTP/1.1' 
  });
  console.log('Wrote', result.written, 'bytes');
  
  // Read response (like reading from a file)
  result = await registry.send('netfs', { op: 'read', connId });
  console.log('Read response:', result.data);
  
  // Close connection (like closing a file)
  await registry.send('netfs', { op: 'close', connId });
  console.log('Closed connection');
  
  console.log('\n--- Service Status ---\n');
  
  const status = registry.status();
  for (const [name, state] of Object.entries(status)) {
    console.log(`${name}: ${state.state}`);
  }
  
  console.log('\n--- Cleanup ---\n');
  
  await registry.stopAll();
  
  console.log('\n=== Demo Complete ===');
  console.log('\nKey Concepts:');
  console.log('- Services are persistent daemons (like mounted filesystems)');
  console.log('- Operations use file-like semantics (open/read/write/close)');
  console.log('- Everything exposed through a uniform interface');
  console.log('- Network connections treated like file descriptors');
  console.log('- Hierarchical namespaces (like Plan9 /proc, /net, /dev)');
}

demo().catch(console.error);
