# Project Roadmap & Development Plan

## 1. Project Overview
This document is the central command for the development of the **Collaborative Canvas Hub**. It integrates real-time video conferencing, modular block-based document editing (Notion-style), and AI-driven automated meeting minutes.

**Core Tech Stack:**
* **Backend:** Node.js (TypeScript)
* **Database:** MongoDB (Mongoose)
* **Frontend:** Next.js
* **Real-time:** WebSockets (Yjs / y-websocket)
* **Media:** **mediasoup** (SFU)
* **AI:** Deepgram/Whisper (STT/Diarization) + LLM (Summarization)

---

## 2. Architectural Pillars (from AGENTS.md)
* **Modular Block System:** Every element is a unique `Block` using a `BaseWorkspaceBlock` interface with `serialize()` and `exportToFile()` capabilities.
* **Flexible Data Modeling:** MongoDB stores heterogeneous block data (text, mindmaps, spreadsheets) within a unified `Document` schema.
* **Granular Presence:** Real-time broadcasting of user metadata (Name, Color, focused `blockId`) via Y.Awareness.
* **AI-Media Pipeline:** Seamless routing of audio streams from **mediasoup** SFU to AI services for automated transcript/summary generation.

---

## 3. Development Roadmap

### Phase 1: Core Infrastructure & Data Modeling (Foundation)
*Goal: Establish the scalable TypeScript boilerplate and Mongoose schema architecture.*
- [x] **System Architecture Setup:** Implement Clean Architecture folder structure (Controllers, Services, Models, WebSockets).
- [x] **Mongoose Model Implementation:**
    - [x] `User.ts`: Authentication and profile management.
    - [x] `Room.ts`: Metadata, participants, and video session configs.
    - [x] `Document.ts`: Parent document with flexible `Blocks` array (Subdocuments).
    - [x] `Transcript.ts`: Time-stamped, speaker-tagged conversation logs.
- [x] **Service & Controller Layer:** Core business logic and REST API endpoints.
- [x] **Error Handling & Routing:** Global error handler and route integration.

### Phase 2: Modular Plugin Ecosystem (Extensibility)
*Goal: Implement the core block interface and initial functional modules.*
- [x] **Plugin SDK Development:** Define `BaseWorkspaceBlock` abstract class/interface.
- [x] **Core Module Implementation:**
    - [x] **Text Module:** Basic editing with CRDT sync.
    - [x] **Mindmap Module:** Canvas-based node management.
    - [x] **Spreadsheet Module:** Cell-based data management.
- [x] **Plugin Manager:** Register and manage all plugins.
- [x] **Document Controller:** API endpoints for block operations.
- [x] **Presence Handler:** WebSocket handler for user focus events.

### Phase 3: AI & Media Integration (Intelligence)
*Goal: Connect the real-time media stream to the AI processing pipeline.*
- [x] **Audio Ingest Pipeline:** Route audio streams from mediasoup to the processing service. *(Architecture Implemented, Mocked)*
- [x] **AI Orchestration:**
    - [x] **STT/Diarization:** Integrate Deepgram/Whisper for speaker-labeled transcription. *(Architecture Implemented, Mocked)*
    - [x] **LLM Transformation:** Implement the service that converts transcripts into summarized Markdown blocks. *(Architecture Implemented, Mocked)*
- [x] **Automated Insertion:** Logic to automatically save AI-generated summaries into the MongoDB `Document` block list.
- [x] **Pipeline Integration Test:** End-to-end simulation of AI pipeline.

### Phase 4: Authentication & Security (Access Control)
*Goal: Implement user authentication and secure API access.*
- [x] **JWT Authentication:** Implement login, register, and token verification.
- [x] **Auth Middleware:** Protect API routes with JWT verification.
- [x] **Password Hashing:** Implement bcrypt for secure password storage.
- [x] **Role-based Access Control (RBAC):** Define roles (Owner, Editor, Viewer) for rooms/documents.

### Phase 5: Real-time Synchronization (Yjs)
*Goal: Implement real-time collaborative editing using Yjs and WebSockets.*
- [x] **Yjs Server Setup:** Configure `y-websocket` server.
- [x] **Awareness Integration:** Connect `PresenceService` to Yjs Awareness protocol.
- [x] **Document Sync:** Link Yjs Doc updates to MongoDB with Debounce logic.
- [x] **Cursor Broadcasting:** Real-time cursor position updates.
- [x] **Conflict Resolution:** Ensure CRDT-based conflict resolution works correctly.

### Phase 6: Production Media & AI Integration
*Goal: Connect real external services for production.*
- [x] **mediasoup Integration:** Implement real audio stream ingestion from SFU. *(Structure implemented, Mocked)*
- [x] **Real STT/LLM API:** Connect to Deepgram/OpenAI/Anthropic APIs.
- [x] **VAD Implementation:** Implement Voice Activity Detection to minimize API costs.
- [x] **Audio Buffer Management:** Handle audio chunking and backpressure.

### Phase 7: Advanced Export & Import (Full Document)
*Goal: Implement full document export to multiple formats and reverse import capability.*
- [x] **Full Document Export Engine:** Implement conversion from complete Document (all blocks) to:
    - **Markdown (.md):** Text-based structured serialization. ✅ Done (core.service.ts, document.controller.ts)
    - **Document (.docx):** Rich text formatting using `docx` library. 🔄 In Progress
    - **Visual (.pdf/png):** Canvas/Puppeteer based rendering of blocks. 🔄 In Progress
- [x] **Full Document Import Engine:** Implement parsing of Markdown files to reconstruct `Document` subdocuments. ✅ Done (core.service.ts, document.controller.ts)
- [x] **Data Sanitization:** Sanitize plugin `data` objects (XSS/Injection prevention).
- [x] **Schema Validation:** Enforce strict validation on plugin data inputs.
- [x] **Backup & Restore:** Implement document backup and restore functionality.

### Phase 8: Frontend Integration & UI
*Goal: Build the Next.js frontend and connect to backend services.*
- [x] **Next.js Setup:** Initialize Next.js project with TypeScript.
- [x] **Block Renderers:** Implement React components for Text, Mindmap, Spreadsheet.
- [x] **Yjs Client:** Integrate Yjs client for real-time editing.
- [x] **mediasoup Client:** Integrate WebRTC client for video/audio.
- [x] **UI/UX Polish:** Polish the interface for usability.

---

## 4. Development Progress Tracker

| Task ID | Feature/Module | Description | Status | Priority | Phase |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T-001** | **Base Architecture** | Setup Clean Architecture & TS Boilerplate | ✅ Done | P0 | 1 |
| **T-002** | **Mongoose Models** | User, Room, Document, Transcript | ✅ Done | P0 | 1 |
| **T-003** | **Block SDK** | `BaseWorkspaceBlock` interface | ✅ Done | P1 | 2 |
| **T-004** | **Core Plugins** | Text, Mindmap, Spreadsheet modules | ✅ Done | P1 | 2 |
| **T-005** | **Plugin Manager** | Register and manage plugins | ✅ Done | P1 | 2 |
| **T-006** | **Presence Handler** | WebSocket handler for user focus | ✅ Done | P1 | 2 |
| **T-007** | **AI Pipeline** | Audio Ingest $\to$ STT $\to$ LLM flow | ✅ Done | P2 | 3 |
| **T-008** | **AI Integration** | Auto-save summaries to Document | ✅ Done | P2 | 3 |
| **T-009** | **In-Memory DB** | Test environment with `mongodb-memory-server` | ✅ Done | P3 | 1 |
| **T-010** | **Yjs Server** | Real-time sync with `y-websocket` | ✅ Done | P1 | 5 |
| **T-011** | **mediasoup Integration** | Real audio stream from SFU | ✅ Done | P2 | 6 |
| **T-012** | **Real STT/LLM** | Connect to Deepgram/OpenAI | ✅ Done | P2 | 6 |
| **T-013** | **File Export** | Real `.docx`, `.xlsx` generation | ✅ Done | P3 | 7 |
| **T-014** | **JWT Auth** | Login, register, token verification | ✅ Done | P0 | 4 |
| **T-015** | **Auth Middleware** | Protect API routes with JWT | ✅ Done | P0 | 4 |
| **T-016** | **Data Sanitization** | Sanitize plugin data objects | ✅ Done | P2 | 7 |
| **T-017** | **Next.js Frontend** | Initialize Next.js and connect to backend | ✅ Done | P1 | 8 |
| **T-019** | **RBAC** | Role-based access control | ✅ Done | P0 | 4 |
| **T-020** | **CRDT Resolution** | Yjs conflict resolution verification | ✅ Done | P1 | 5 |
| **T-021** | **Audio Buffer** | Audio chunking and backpressure | ✅ Done | P2 | 6 |
| **T-022** | **Backup & Restore** | Document backup and restore | ✅ Done | P3 | 7 |
| **T-023** | **UI/UX Polish** | Interface usability improvements | ✅ Done | P1 | 8 |
| **T-024** | **Full Doc Export (MD)** | Markdown export for complete document | ✅ Done | P1 | 7 |
| **T-025** | **Full Doc Import (MD)** | Parse Markdown to reconstruct document | ✅ Done | P1 | 7 |
| **T-026** | **Full Doc Export (Docx)** | Rich text export using docx library | 🔄 In Progress | P2 | 7 |
| **T-027** | **Full Doc Export (Image)** | Canvas/Puppeteer based visual export | 🔄 In Progress | P2 | 7 |
| **T-028** | **Room Password (PIN)** | 방 비밀번호(PIN) 보호 | ✅ Done | P1 | 4 |
| **T-029** | **Sidebar Hover Expand** | 사이드바 hover 확장 UX (200px→280px) | ✅ Done | P2 | 8 |
| **T-030** | **Block Copy (Excel/Word)** | 블록 복사: HTML 테이블/트리 변환 후 클립보드 | ✅ Done | P1 | 7 |
| **T-031** | **Active Room Indicator** | 방 목록에서 참여 중인 방 시각화 (초록 테두리 + 배지) | ✅ Done | P2 | 8 |
| **T-032** | **Mindmap HTML Export** | 마인드맵 → HTML 트리 변환 (`__ROOT__` 처리) | ✅ Done | P2 | 7 |
| **T-033** | **E2E Test Suite** | Playwright E2E (login, sync) + `.env` 참조 | ✅ Done | P2 | QA |
| **T-034** | **README & Docs** | README 작성, LiveKit→mediasoup 문서 통일 | ✅ Done | P3 | Docs |

---

## 5. Technical Compliance Checklist
*Every PR must satisfy these requirements:*

- [x] **Strict Typing:** `tsconfig.json` must have `"strict": true`.
- [x] **Data Integrity:** Plugin `data` objects must be sanitized (XSS/Injection prevention).
- [x] **Concurrency:** Implement **Debounced DB Writes** (3-5s interval) for Yjs updates.
- [x] **Resource Management:** Explicitly call `destroy()`/`removeAllListeners()` on mediasoup/Socket disconnects.
- [x] **Error Handling:** All async service methods must use global error-catching wrappers.
- [ ] **AI Efficiency:** VAD (Voice Activity Detection) must be active to minimize API costs.

---
*Last Updated: 2026-09-29*
