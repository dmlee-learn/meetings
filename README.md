# Collaborative Canvas Hub

다자간 실시간 화상 채팅, 노션 스타일 모듈형 블록 문서 공동 편집, AI 기반 회의록 자동 생성을 통합한 협업 플랫폼입니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| **백엔드** | Node.js (TypeScript, Strict Mode) |
| **데이터베이스** | MongoDB (Mongoose) |
| **프론트엔드** | Next.js (TypeScript) |
| **실시간 동기화** | WebSockets (Yjs / y-websocket) |
| **미디어 (SFU)** | mediasoup |
| **AI** | OpenAI (LLM) + STT/Diarization |

## 핵심 기능

- **다자간 화상 채팅**: mediasoup SFU 기반 WebRTC
- **블록 기반 문서 편집기**: 텍스트, 마인드맵, 스프레드시트 모듈
- **실시간 동기화**: Yjs CRDT 기반 동시 편집 + Presence (사용자 포커스 상태 브로드캐스트)
- **문서 내보내기/가져오기**: Markdown 전체 내보내기/가져오기 (통일된 `[BLOCK:TYPE]` 마크업)
- **블록 복사**: Excel/Word용 HTML 테이블/트리 변환 후 클립보드 복사
- **AI 회의록 파이프라인**: 오디오 → STT → LLM 요약 → 문서 블록 자동 삽입
- **방 비밀번호 (PIN)**: 방 접근 보호
- **권한 관리**: JWT 인증 + RBAC (Owner, Editor, Viewer)

## 프로젝트 구조

```
collaborative-canvas-hub/
├── src/                        # 백엔드 (Node.js + TypeScript)
│   ├── app.ts                  # Express 앱 진입점
│   ├── config/                 # DB, 환경 변수 설정
│   ├── controllers/            # HTTP 라우터 핸들러
│   ├── models/                 # Mongoose 스키마 (User, Room, Document, Transcript)
│   ├── services/               # 비즈니스 로직, AI 오케스트레이터
│   ├── plugins/                # 모듈형 블록 플러그인 (Text, Mindmap, Spreadsheet)
│   ├── websockets/             # WebSocket 핸들러 (Yjs, Presence)
│   └── middlewares/            # 인증, RBAC, 에러 처리
├── client/                     # 프론트엔드 (Next.js)
│   ├── app/page.tsx            # 메인 페이지 (사이드바, 헤더, 캔버스)
│   └── components/             # 블록 편집기, 방 목록, 사이드바, AI 패널
├── test/                       # E2E 테스트 (Playwright)
│   ├── helpers.mjs             # 공통 헬퍼 (loginAs, enterRoom, setTextBlock)
│   └── e2e/
│       ├── login.test.mjs      # 로그인 테스트
│       └── sync.test.mjs       # 실시간 동기화 테스트
├── developments_docs/          # 개발 문서
├── docs/                       # 로드맵, 샘플 데이터
└── .env                        # 환경 변수 (TEST_HOST, PORT, FRONTEND_PORT 등)
```

## 시작하기

### 1. 의존성 설치

```bash
# 백엔드
npm install

# 프론트엔드
cd client && npm install && cd ..
```

### 2. 환경 변수 설정

`.env` 파일에서 필요한 값들을 수정합니다.

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/collaborative-canvas-hub
JWT_SECRET=your-super-secret-jwt-key-change-in-production
OPENAI_API_KEY=your-openai-api-key
TEST_HOST=http://localhost
FRONTEND_PORT=3002
```

> **참고:** `development` 모드에서는 인-메모리 MongoDB(`mongodb-memory-server`)를 사용하므로 별도 MongoDB 설치 없이 동작합니다. 서버 재시작 시 데이터가 초기화됩니다.

### 3. 서버 실행

```bash
# 백엔드 (API: 3000, WebSocket: 3001)
npm run dev

# 프론트엔드 (3002)
cd client && npm run dev
```

### 4. 샘플 데이터 생성

```bash
npx tsx docs/sampledata/create-sample-data.ts
```

브라우저에서 `http://localhost:3002` 접속 후 테스트 계정:

| 계정 | 이메일 | 비밀번호 |
|------|--------|----------|
| Alice | alice@example.com | password123 |
| Bob | bob@example.com | password123 |

## API 엔드포인트

### 인증
- `POST /api/auth/register` — 회원가입
- `POST /api/auth/login` — 로그인 (JWT 토큰 반환)
- `GET /api/auth/me` — 현재 사용자 정보

### 방 (Rooms)
- `GET /api/rooms` — 방 목록
- `POST /api/rooms` — 방 생성
- `POST /api/rooms/:id/join` — 방 입장
- `POST /api/rooms/:id/leave` — 방 퇴장

### 문서 (Documents)
- `GET /api/documents/:id` — 문서 조회
- `POST /api/documents` — 문서 생성
- `PATCH /api/documents/:id/blocks/:blockId` — 블록 수정
- `GET /api/documents/:id/export/markdown` — Markdown 내보내기
- `POST /api/documents/:id/import/markdown` — Markdown 가져오기

## 블록 내보내기 마크업 형식

모든 블록 타입은 통일된 `[BLOCK:TYPE]` 마크업으로 직렬화됩니다.

```markdown
# 문서 제목

## 섹션 제목

[BLOCK:TEXT]
{"data":{"text":"일반 텍스트 블록"}}
[/BLOCK:TEXT]

[BLOCK:MINDMAP]
{"data":{"nodes":[{"id":"1","text":"노드","parentId":null}],"edges":[]}}
[/BLOCK:MINDMAP]

[BLOCK:SPREADSHEET]
{"data":{"headers":["A","B"],"rows":[["1","2"]]}}
[/BLOCK:SPREADSHEET]
```

## WebSocket 프로토콜

| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `USER_BLOCK_FOCUS` | Client → Server | 사용자가 블록에 포커스 시 전송 |
| `BROADCAST_BLOCK_PRESENCE` | Server → Clients | 포커스 상태 브로드캐스트 |
| `BLOCK_UPDATE` | Client ↔ Server | 블록 편집 CRDT 업데이트 |
| `PRESENCE_UPDATE` | Server → Clients | 사용자 메타데이터 (이름, 색상, 커서) 브로드캐스트 |

## E2E 테스트

```bash
# 로그인 테스트
node test/e2e/login.test.mjs

# 실시간 동기화 테스트
node test/e2e/sync.test.mjs
```

테스트 스크린샷은 `test/screenshots/`에 저장됩니다.

## 개발 문서

| 문서 | 설명 |
|------|------|
| [WebSocket 프로토콜](developments_docs/Document_1_WebSocket_Protocol.md) | 실시간 동기화 및 Presence 프로토콜 명세 |
| [플러그인 아키텍처](developments_docs/Document_2_Plugin_Architecture.md) | 모듈형 블록 인터페이스 및 등록 가이드 |
| [AI 미디어 파이프라인](developments_docs/Document_3_AI_Media_Pipeline.md) | 오디오 스트림 → STT → LLM 처리 흐름 |
| [클린 아키텍처](developments_docs/Document_4_Clean_Architecture.md) | 폴더 구조 및 코드 품질 규칙 |
| [로드맵](docs/plan/roadmap.md) | 개발 계획 및 진행 현황 |

## 라이선스

MIT License
