# Data Modeling & Schema Guide

## 1. Core Philosophy
* **Flexibility with Structure:** Leverage MongoDB's schema-less nature for plugin data, but enforce strict validation at the application layer (Mongoose/TypeScript).
* **Single Source of Truth:** Ensure that the `Document` model is the authoritative source for all block states.

## 2. Mongoose Schema Design Patterns

### 2.1. The Block Pattern (Polymorphic Subdocuments)
Every block in a document must follow this structure to ensure the core engine can manage them:
```typescript
{
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true }, // e.g., 'text', 'mindmap'
  updatedAt: { type: Date, default: Date.now },
  data: { type: Schema.Types.Mixed, required: true } // Plugin-specific payload
}
```
* **Rule:** Every plugin MUST define a validation schema for its `data` object to prevent corrupted state.

### 2.2. Relationship Management
* **User $\leftrightarrow$ Room:** Use ObjectIDs for references.
* **Room $\leftrightarrow$ Document:** Documents belong to a Room. Use a `roomId` reference in the `Document` schema.
* **Document $\leftrightarrow$ Blocks:** Blocks are embedded as an array within the `Document` to ensure atomic updates for a single document.

## 3. Data Integrity & Security

### 3.1. Sanitization (Anti-Injection)
* **Mandatory:** All plugin-driven `data` fields MUST be sanitized before being persisted to MongoDB.
* **Strategy:** Use a whitelist-based approach. If a plugin provides a `validate(data)` method, it MUST be called during the `save` middleware of the Mongoose model.

### 3.2. Concurrency Control
* **Debounced Writes:** To prevent DB bottlenecks during high-frequency WebSocket updates, implement a 3-5 second debounce mechanism for saving the `Document` state to MongoDB.
* **State Vector Validation:** When a client reconnects, the server must validate the incoming `State Vector` against the current MongoDB state to prevent "time-travel" overwrites.

## 4. Indexing Strategy
To maintain high performance, the following indexes are required:
* `User`: `email` (unique), `username` (unique).
* `Room`: `participantIds` (multikey index), `activeStatus`.
* `Document`: `roomId` (standard index), `updatedAt`.
* `Transcript`: `documentId`, `timestamp`.
