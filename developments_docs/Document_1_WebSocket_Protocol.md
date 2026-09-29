# Document 1: Real-time Data Synchronization & WebSocket Protocol Specification

## 1. Overview
This document specifies the network communication protocol and event schemas for the real-time collaborative features using WebSockets and Yjs (CRDT) in the Node.js/TypeScript backend environment.

## 2. Sync Architecture
* **State Synchronization:** Handled via Yjs binary state updates sent over WebSocket channels (`y-websocket`).
* **Awareness & Presence:** Manages non-persistent data such as user cursor location, names, profile colors, and focused block IDs.

## 3. Protocol Message Schemas

### 3.1. User Block Focus Event
Emitted immediately when a user clicks or enters an input element inside a modular block.
```json
{
  "event": "USER_BLOCK_FOCUS",
  "payload": {
    "roomId": "room_uuid_1234",
    "userId": "user_uuid_5678",
    "userName": "Jane Doe",
    "userColor": "#FF5733",
    "blockId": "block_uuid_9999"
  }
}
```

### 3.2. Broadcast Block Presence Event
Sent by the server to all other active connected sockets in the room.
```json
{
  "event": "BROADCAST_BLOCK_PRESENCE",
  "payload": {
    "blockId": "block_uuid_9999",
    "activeUsers": [
      {
        "userId": "user_uuid_5678",
        "userName": "Jane Doe",
        "userColor": "#FF5733"
      }
    ]
  }
}
```

## 4. Conflict Resolution Policy
* Text synchronization relies strictly on the CRDT character sequencing rules of Yjs.
* Positional structural shifts (e.g., reordering block arrays) utilize sequential absolute placement tags.
