import { EventEmitter } from 'events';
import { IAudioPacket } from '../media/media-ingest.service';
import { ITranscriptionResult } from '../ai/ai-types';
import { STTService } from './stt.service';
import { LLMService } from './llm.service';

/**
 * AIOrchestratorService manages the flow from raw audio to structured meeting summaries.
 * It coordinates between STT (Deepgram/Whisper) and LLM (OpenAI/Anthropic) services.
 */
export class AIOrchestratorService extends EventEmitter {
  private sttService: STTService;
  private llmService: LLMService;

  constructor(sttService?: STTService, llmService?: LLMService) {
    super();
    this.sttService = sttService || new STTService();
    this.llmService = llmService || new LLMService();
  }

  /**
   * Processes a stream of audio packets to generate real-time transcription.
   * @param packet The audio packet received from MediaIngestService
   */
  async processAudioStream(packet: IAudioPacket): Promise<void> {
    // 1. Forward to STT Service (e.g., Deepgram)
    const transcription = await this.callSTTService(packet.data);
    
    if (transcription) {
      this.emit('transcription_ready', transcription);
    }
  }

  /**
   * Compiles accumulated transcripts into a summarized meeting block.
   * This implements the "LLM Transformation Layer" from Document 3.
   */
  async generateMeetingSummary(transcripts: ITranscriptionResult[]): Promise<string> {
    const context = transcripts.map(t => `[${t.speakerName}]: ${t.text}`).join('\n');
    
    console.log(`[AIOrchestratorService] Generating summary for ${transcripts.length} entries...`);
    
    // 2. Send context to LLM with structured prompt
    const summary = await this.callLLMService(context);
    
    return summary;
  }

  /**
   * Mock STT service call.
   */
  private async callSTTService(audioData: Buffer): Promise<ITranscriptionResult | null> {
    try {
      // 실제 STT API 호출
      const text = await this.sttService.transcribe(audioData);
      
      return {
        speakerId: 'user_1', // 실제 스트림 메타데이터에서 추출해야 함
        speakerName: 'Jane Doe', // 실제 사용자 프로필에서 추출해야 함
        text: text,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[AIOrchestrator] STT Service Error:', error);
      return null;
    }
  }

  /**
   * 실제 LLM 서비스 호출.
   */
  private async callLLMService(context: string): Promise<string> {
    try {
      // 실제 LLM API 호출
      const lines = context.split('\n');
      return await this.llmService.summarizeMeeting(lines);
    } catch (error) {
      console.error('[AIOrchestrator] LLM Service Error:', error);
      return `### Error\n\nFailed to generate summary: ${error}`;
    }
  }
}
