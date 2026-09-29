import { MediaIngestService } from '../media/media-ingest.service';
import { AIOrchestratorService } from './ai-orchestrator.service';

/**
 * AIServiceCoordinator acts as the central hub connecting the Media Ingest layer
 * to the AI Orchestration layer. It manages the lifecycle of the transcription pipeline.
 */
export class AIServiceCoordinator {
  constructor(
    private mediaIngest: MediaIngestService,
    private aiOrchestrator: AIOrchestratorService
  ) {
    this.setupPipeline();
  }

  /**
   * Connects the media ingest events to the AI orchestration flow.
   */
  private setupPipeline(): void {
    // Listen for audio data ready from the Media Ingest service
    this.mediaIngest.on('audio_data_ready', async (packet) => {
      try {
        await this.aiOrchestrator.processAudioStream(packet);
      } catch (error) {
        console.error('[AIServiceCoordinator] Error processing audio stream:', error);
      }
    });

    // Listen for transcription results to trigger further logic (like real-time UI updates)
    this.aiOrchestrator.on('transcription_ready', (transcription) => {
      console.log(`[AIServiceCoordinator] New transcription: ${transcription.text}`);
      // In a real system, this would trigger a WebSocket broadcast to the room
    });
  }

  /**
   * High-level method to trigger a full meeting summary generation.
   */
  async triggerSummaryGeneration(transcripts: any[]): Promise<string> {
    return await this.aiOrchestrator.generateMeetingSummary(transcripts);
  }
}
