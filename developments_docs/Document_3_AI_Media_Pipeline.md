# Document 3: Audio Streaming & AI Pipeline Flow Specification

## 1. Media Integration Architecture
mediasoup SFU acts as the central router for audio/video packets. The Node.js application registers as a persistent headless ingest peer or reads the individual tracks using server-side egress hooks.

## 2. Audio Processing Parameters
* **Format:** Uncompressed PCM Linear / WebM Audio Stream
* **Sampling Rate:** 16,000 Hz (16kHz) optimized for speech recognizers
* **Channels:** 1 (Mono)
* **Bit Depth:** 16-bit

## 3. Downstream AI Processing Pipeline
1. **Extraction:** Individual client audio buffers are tracked via unique participant stream tokens.
2. **Diarization & STT:** Audio packets feed continuously into Deepgram/Whisper streaming endpoints. Deepgram processes concurrent diarization timestamps mapping speaker tags to audio nodes.
3. **LLM Transformation Layer:** Transcripts are compiled per time window. The text is passed into an LLM context window with structured prompts asking for summarization, key topics, and direct actions.
4. **Document Insertion:** The formatted Markdown block result is saved directly into the running room's MongoDB block list.
