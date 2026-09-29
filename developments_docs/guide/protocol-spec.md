# API & Protocol Specification

## 1. WebSocket (Real-time Presence) Protocol
All real-time presence updates are handled via the `y-websocket` protocol and customized with `Y.Awareness`.

### 1.1. Awareness State Schema
When a user interacts with the canvas, their presence metadata is broadcasted.

**Payload Structure:**
```json
{
  "userId": "string (UUID)",
  "userName": "string",
  "userColor": "string (HEX)",
  "focusedBlockId": "string (UUID) | null",
  "cursorPosition": {
    "x": "number",
    "y": "number"
  }
}
```

### 1.2. Event Types
| Event Name | Source | Target | Description |
| :--- | :--- | :--- | :--- |
| `USER_BLOCK_FOCUS` | Client | Server/Peers | Emitted when a user selects/clicks a block. |
| `BROADCAST_BLOCK_PRESENCE` | Server | All Peers | Server-side broadcast of the updated awareness state. |
| `SYNC_STATE` | Server | Client | Initial state synchronization when joining a room. |

## 2. RESTful API Specification
Standard HTTP endpoints for administrative and non-real-time tasks.

**Base URL:** `/api/v1`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Create a new user account. | No |
| `POST` | `/auth/login` | Authenticate and receive JWT. | No |
| `GET` | `/rooms` | List all accessible rooms. | Yes |
| `POST` | `/rooms` | Create a new collaboration room. | Yes |
| `GET` | `/documents/:id` | Fetch document metadata and block list. | Yes |
| `PATCH` | `/documents/:id` | Update document metadata. | Yes |

## 3. AI Media Pipeline Flow
The flow of audio data from media source to AI-generated content.

1.  **Ingest:** mediasoup SFU captures audio $\to$ Node.js server receives stream.
2.  **Stream:** Node.js $\to$ Deepgram (via WebSocket/Stream API).
3.  **Diarization:** Deepgram returns text with `speaker_id` and `timestamp`.
4.  **LLM Processing:** 
    *   Input: Accumulated transcript segments.
    *   Prompt: "Summarize the following meeting transcript into structured Markdown blocks..."
    *   Output: Structured JSON containing `summary_text` and `action_items`.
5.  **Persistence:** The parsed JSON is converted into a `Block` type and inserted into the MongoDB `Document`.
