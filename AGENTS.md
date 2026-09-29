## 📋 AI Agent Development Specification: Node.js & MongoDB Based Collaborative Canvas Hub
## 1. 프로젝트 개요 (Overview)

* 기술 스택: Node.js (TypeScript) + MongoDB (Mongoose) + Next.js + WebSockets (Yjs)
* 목적: 다자간 실시간 화상 채팅을 진행하면서, 노션 스타일의 모듈형 블록 문서와 마인드맵을 공동 편집하고, AI가 실시간으로 화자를 분리하여 회의록을 자동 생성해 주는 통합 협업 플랫폼 개발.
* 핵심 가치: MongoDB의 유연한 Document 구조를 활용하여 다양한 모듈형 블록을 끊김 없이 저장하고, Node.js의 이벤트 기반 아키텍처로 실시간 화상 및 Presence 처리를 최적화함.

------------------------------
## 2. 기술 아키텍처 및 상세 명세 (Technical Specs)## 👥 2.1. SFU 기반 다자간 화상 채팅 (Node.js 연동)

* 구현 방식: SFU(Selective Forwarding Unit) 미디어 서버인 **mediasoup**를 백엔드로 연동합니다.
* Node.js 역할: Node.js API 서버는 룸 개설, 참여자 토큰(Token) 발급 및 인증을 관리하며, 오디오 스트림 파이프라인을 AI 서비스(Deepgram/Whisper)로 중계하는 가교 역할을 수행합니다.

## 🧱 2.2. 노션 스타일 블록 데이터 구조 (MongoDB 최적화)

* 구현 방식: 문서 내의 모든 요소는 고유 ID를 가진 독립된 객체(Block)입니다. MongoDB는 스키마 변경 없이 새로운 컴포넌트 데이터(텍스트, 마인드맵, 스프레드시트 등)를 Object 혹은 Subdocument 형태로 유연하게 적재할 수 있어 이 아키텍처에 가장 이상적입니다.

## 🟢 2.3. 실시간 블록 단위 존재감 표시 (Granular Presence via WebSockets)

* 구현 방식: Node.js 환경에서 y-websocket 또는 커스텀 Socket.io 서버를 구동합니다.
* 사용자가 특정 블록에 포커스하면 Y.Awareness 프로토콜을 통해 사용자의 ID, 이름, 지정 색상, 현재 선택한 blockId 상태가 방 안의 모든 참여자에게 실시간 브로드캐스팅됩니다.

## 🔌 2.4. 확장형 플러그인 인터페이스 및 모듈별 파일 빌더

* 구현 방식: 각 블록 모듈은 TypeScript 추상 클래스를 상속받아 구현됩니다.
* 각 모듈은 고유의 파일 변환 엔진 로직을 내장합니다. (예: 시트 모듈은 Node.js 서버 측에서 xlsx 라이브러리를 사용해 바이너리 추출, 텍스트 모듈은 docx 라이브러리를 통해 파일 스트림 생성 후 클라이언트로 다운로드 제공).

## 🎙️ 2.5. AI 화자 분리 회의록 파이프라인

* 구현 방식: 화상채팅에서 분리된 참여자별 오디오 스트림(또는 화자 분리 메타데이터가 포함된 통합 스트림)을 Node.js 서버가 수신하여 AI API로 전송합니다. 변환된 텍스트와 요약본은 즉시 MongoDB에 새로운 block 데이터 유형으로 추가됩니다.

------------------------------
## 3. 에이전트 개발 요청 프롬프트 (Agent Prompt)

[Prompt for AI Developer Agent]
Goal: Create a production-ready system architecture, MongoDB schema, and scalable TypeScript boilerplate code for a modular, block-based real-time collaborative workspace using Node.js (TypeScript) and MongoDB.
Core Architecture Requirements:

   1. TypeScript Modular Block Interface:
   Define a strict abstract class or interface (BaseWorkspaceBlock) that all feature modules (Text, Mindmap, Spreadsheet) must implement. It must enforce methods for:
   * render(data: any): JSX.Element (Frontend rendering blueprint)
      * serialize(): object (Data structure tailored for MongoDB insertion)
      * exportToFile(data: any): Promise<Buffer> (Server-side file compilation to formats like .docx, .xlsx, .pdf)
   2. Granular Presence Schema & Logic:
   Provide the Node.js WebSocket payload structure and Y.Awareness handler. When a client triggers a focus event on a specific blockId, the server must instantly broadcast the user's metadata (Name, Color, Cursor Position) to synched peers in the same room.
   3. Mongoose Database Schema Design:
   Design optimized Mongoose models for:
   * User: Standard authentication and profile layout.
      * Room: Virtual room capturing metadata, active participants, and video session configurations.
      * Document: A parent document containing metadata and an ordered array of flexible Subdocuments (Blocks). The blocks must accommodate unstructured layouts (e.g., heterogeneous objects for texts, canvas nodes for mindmaps, cell arrays for spreadsheets).
      * Transcript: Time-stamped conversation dialogues split by speaker profiles.
   4. Audio & AI Pipeline Flow:
   Provide a structural diagram and service layout in Node.js detailing how incoming audio streams from the SFU (mediasoup) are routed to a Diarization/STT service (e.g., Deepgram) and finally parsed by an LLM into summarized meeting blocks.

Deliverables:

   1. Full Mongoose Model code files (User.ts, Room.ts, Document.ts).
   2. TypeScript declaration files for the BaseWorkspaceBlock architecture and WebSocket signaling payload.
   3. Folder structure recommendation for a clean Node.js Clean Architecture (Controllers, Services, Models, WebSockets).
   4. Step-by-step developer roadmap to build the system incrementally.

------------------------------
