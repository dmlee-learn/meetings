# Document 4: Clean Layered Architecture & Code Quality Guidelines

## 1. Directory Structural Layout
```text
src/
├── config/             # DB & environment variables setup
├── controllers/        # HTTP controllers & route handlers
├── websockets/         # WebSocket listeners & Yjs state configurations
├── models/             # Mongoose schemas & TypeScript type entities
├── services/           # Domain core business rules & AI orchestrators
├── plugins/            # Modular registered blocks (Text, Mindmap, etc.)
└── app.ts              # Entry point application config
```

## 2. Coding and Quality Enforcement Regulations
* **TypeScript Strict Mode:** `"strict": true` must be enabled across all configuration parameters in `tsconfig.json`.
* **Asynchronous Error Catching:** Explicit global express wrappers or pipeline catch middleware must intercept asynchronous exceptions without exposing node stacks to client interfaces.
* **Separation of Concerns:** Controllers must never call Mongoose queries directly. Data lookups belong inside a dedicated Service pattern.
