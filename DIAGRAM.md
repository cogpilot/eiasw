# EIASW Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ServiceRegistry                          │
│                  (Namespace Coordinator)                     │
├─────────────────────────────────────────────────────────────┤
│  services: Map<name, ServiceWorker>                         │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ FileServer   │ │   Logger     │ │   Counter    │  ...   │
│  │ Worker       │ │   Worker     │ │   Worker     │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │ register/send/start/stop
                          │
                    ┌──────────┐
                    │  Client  │
                    │   Code   │
                    └──────────┘
```

## ServiceWorker Lifecycle

```
     ┌─────────┐
     │ stopped │ ◄──────────────────┐
     └────┬────┘                    │
          │                         │
          │ start()                 │ stop()
          ▼                         │
     ┌─────────┐              ┌─────────┐
     │starting │              │stopping │
     └────┬────┘              └────▲────┘
          │                        │
          │ onStart()              │ onStop()
          ▼                        │
     ┌─────────┐                   │
     │ running │───────────────────┘
     └────┬────┘
          │
          │ send(message)
          ▼
     [message queue]
```

## Message Flow

```
Client Code
    │
    │ send(message)
    ▼
┌─────────────────────┐
│   ServiceWorker     │
│  ┌───────────────┐  │
│  │ Message Queue │  │
│  │ ┌───┐ ┌───┐   │  │
│  │ │msg│ │msg│...│  │
│  │ └───┘ └───┘   │  │
│  └───────┬───────┘  │
│          │          │
│  trigger │          │
│    ▼     ▼          │
│  _processMessages() │
│          │          │
│  while queue not    │
│  empty:             │
│    ┌────┴────┐      │
│    │ process │      │
│    │ message │      │
│    └────┬────┘      │
│         │           │
│  handler.onMessage  │
│    (msg, context)   │
│         │           │
│    ┌────▼────┐      │
│    │ response│      │
│    └────┬────┘      │
└─────────┼───────────┘
          │
          │ resolve(response)
          ▼
    Client Code
```

## Plan9 File Server Analogy

```
Plan9 File System          EIASW Service Worker
─────────────────          ────────────────────

┌──────────────┐          ┌──────────────────┐
│ File Server  │          │ ServiceWorker    │
│  (Daemon)    │   ═══    │   (Daemon)       │
└──────────────┘          └──────────────────┘

Mount point               start()
File operations           send(message)
File descriptors          Message IDs
Read/Write                onMessage handler
Directory structure       ServiceRegistry
9P protocol               Message passing
Unmount                   stop()
```

## Service Communication Pattern

```
┌─────────────────────────────────────────────────────────┐
│                  ServiceRegistry                        │
│                                                         │
│  ┌──────────────┐     ┌──────────────┐                 │
│  │  Service A   │     │  Service B   │                 │
│  │              │     │              │                 │
│  │ context: {}  │     │ context: {}  │                 │
│  │ queue: []    │     │ queue: []    │                 │
│  └──────────────┘     └──────────────┘                 │
│         ▲                     ▲                         │
│         │                     │                         │
└─────────┼─────────────────────┼─────────────────────────┘
          │                     │
          │ send('A', msg)      │ send('B', msg)
          │                     │
     ┌────┴─────────────────────┴────┐
     │        Client Code             │
     │                                │
     │  await registry.send('A', {})  │
     │  await registry.send('B', {})  │
     └────────────────────────────────┘
```

## Event Flow

```
ServiceWorker              Events               Listeners
─────────────             ────────             ──────────

start()          ──►    'starting'      ──►    console.log()
                 ──►    'started'       ──►    metrics.record()

send(msg)        ──►    (queued)
                 ──►    onMessage       ──►    process & respond

stop()           ──►    'stopping'      ──►    cleanup.run()
                 ──►    'stopped'       ──►    logger.info()

error            ──►    'error'         ──►    alert.send()
```

## Performance Architecture

```
Traditional Polling          EIASW Event-Driven
───────────────────          ──────────────────

┌────────────────┐          ┌────────────────┐
│ setInterval    │          │   send()       │
│   (10ms)       │          │                │
│     │          │          │    │           │
│     ▼          │          │    ▼           │
│ check queue    │          │ immediate      │
│     │          │    VS    │ trigger        │
│     ▼          │          │    │           │
│ if empty: wait │          │    ▼           │
│ if msg: process│          │ process all    │
│                │          │ messages       │
└────────────────┘          └────────────────┘

CPU: High (polling)         CPU: Low (events)
Latency: 0-10ms            Latency: <1ms
```

## Memory Model

```
ServiceWorker Instance
┌────────────────────────────────┐
│ name: "fileServer"             │
│ state: "running"               │
│                                │
│ context: {                     │
│   files: Map(...),             │ ◄─ Persistent
│   connections: [],             │    State
│   counter: 42                  │
│ }                              │
│                                │
│ messageQueue: [                │
│   { id, msg, resolve },        │ ◄─ Transient
│   { id, msg, resolve },        │    Queue
│ ]                              │
│                                │
│ handler: {                     │
│   onStart: Function,           │ ◄─ User
│   onMessage: Function,         │    Handlers
│   onStop: Function             │
│ }                              │
└────────────────────────────────┘
```

## Scalability Pattern

```
Single Service               Multiple Services
──────────────              ─────────────────

  ServiceWorker          ServiceRegistry
       │                       │
       │                   ┌───┼───┬───┬───┐
       ▼                   ▼   ▼   ▼   ▼   ▼
   [context]            [SW1][SW2][SW3][SW4][SW5]
   [messages]             │   │   │   │   │
   [handler]              ▼   ▼   ▼   ▼   ▼
                         ctx ctx ctx ctx ctx

1 service                N services in parallel
1 context                N isolated contexts
Sequential               Concurrent messages
```
