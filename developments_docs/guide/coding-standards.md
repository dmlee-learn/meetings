# Coding Standards & Style Guide

## 1. General Principles
* **Strict Typing:** Always define explicit types. Avoid `any` at all costs. Use `unknown` if the type is truly uncertain.
* **Clean Architecture:** Maintain strict separation between Controllers, Services, Models, and Plugins.
* **Immutability:** Prefer immutable data patterns, especially when handling Yjs state updates.

## 2. Naming Conventions
* **Files:** `kebab-case.ts` (e.g., `user-service.ts`, `base-workspace-block.ts`).
* **Classes & Interfaces:** `PascalCase` (e.g., `UserService`, `IWorkspaceBlock`).
* **Variables & Functions:** `camelCase` (e.g., `getUserById`, `isAuthorized`).
* **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`, `DEFAULT_ROOM_COLOR`).
* **Folders:** `kebab-case` (e.g., `auth-controllers`).

## 3. TypeScript & Coding Style
* **Strict Mode:** `"strict": true` must be enabled in `tsconfig.json`.
* **Interfaces vs Types:** 
    * Use `interface` for defining object shapes and class contracts (extensible).
    * Use `type` for unions, intersections, or primitive aliases.
* **Async/Await:** Always use `async/await` instead of raw Promises. 
* **Error Handling:** 
    * Never leave empty `catch` blocks.
    * Use custom Error classes for domain-specific errors (e.g., `ValidationError`, `AuthError`).
    * Wrap Controller methods in a global async error handler.

## 4. Directory & Structure
* **Controllers:** Handle HTTP/WS requests, validate input, and call Services. **No DB logic here.**
* **Services:** Contain all business logic and orchestrate domain tasks. **No direct Controller interaction.**
* **Models:** Define Mongoose schemas and TypeScript entity types.
* **Plugins:** Implement the `BaseWorkspaceBlock` interface. Each plugin must be self-contained.

## 5. Documentation & Comments
* **JSDoc:** Use JSDoc for all public methods and complex logic to explain *why* something is done, not just *what*.
* **TODOs:** Use `// TODO: [description]` for technical debt, but track critical tasks in `roadmap.md`.
