# Testing & Quality Assurance Guide

## 1. Testing Strategy
We follow a pyramid testing approach: many unit tests, fewer integration tests, and minimal end-to-end tests.

### 1.1. Unit Testing (Focus: Business Logic)
* **Target:** Services, Models, and Plugin logic.
* **Framework:** Jest or Vitest.
* **Requirement:** 
    * Mock all external dependencies (DB, AI APIs, LiveKit).
    * Test edge cases (e.g., empty input, invalid block types).
    * Use `describe` and `it` blocks to clearly state the intent.

### 1.2. Integration Testing (Focus: Component Interaction)
* **Target:** Controller $\leftrightarrow$ Service $\leftrightarrow$ DB, WebSocket $\leftrightarrow$ Yjs.
* **Requirement:** 
    * Use a dedicated test database (e.g., `mongodb-memory-server`).
    * Verify that API calls correctly persist data in the database.
    * Verify that WebSocket events trigger the expected state changes in the DB.

### 1.3. End-to-End (E2E) Testing (Focus: Critical Paths)
* **Target:** The complete user flow (e.g., "User joins room $\to$ Types text $\to$ AI generates summary").
* **Framework:** Playwright or Cypress.
* **Requirement:** Run in a containerized environment that includes a real LiveKit instance and Mock AI endpoints.

## 2. Quality Checklists

### 2.1. Real-time Sync Check
* [ ] Does the system handle rapid-fire edits without losing data?
* [ ] Is the `Y.Awareness` payload within size limits to prevent socket congestion?
* [ ] Does the system recover correctly after a sudden WebSocket disconnection?

### 2.2. AI Pipeline Check
* [ ] **VAD Test:** Does the system correctly ignore background noise to save API costs?
* [ ] **Diarization Test:** Are speaker changes correctly identified in the transcript?
* [ ] **Error Resilience:** Does the system implement Exponential Backoff when the AI API returns a 429 or 5xx error?

### 2.3. Security & Performance Check
* [ ] **XSS Check:** Are all `data` fields from plugins sanitized?
* [ ] **DB Pressure Check:** Is the 3-5s debounce mechanism working during heavy typing?
* [ ] **Memory Leak Check:** Are all event listeners (LiveKit, Sockets) destroyed on disconnect?

## 3. Reporting
* All test failures must include the failed input, the expected output, and the actual output.
* Performance regressions must be reported with the specific environment metrics.
