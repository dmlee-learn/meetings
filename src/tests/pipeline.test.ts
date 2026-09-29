import { MediaIngestService } from '../services/media/media-ingest.service';
import { AIOrchestratorService } from '../services/ai/ai-orchestrator.service';
import { AIIntegrationService } from '../services/ai/ai-integration.service';
import { DocumentService } from '../services/core.service';
import { IAudioPacket } from '../services/media/media-ingest.service';
import { ITranscriptionResult } from '../services/ai/ai-types';

/**
 * PipelineIntegrationTest simulates the end-to-end data flow:
 * Media Ingest -> AI Orchestration -> AI Integration (Document Insertion)
 */
export class PipelineIntegrationTest {
  private mediaIngest: MediaIngestService;
  private aiOrchestrator: AIOrchestratorService;
  private aiIntegration: AIIntegrationService;
  private docService: DocumentService;

  constructor(docService?: DocumentService | any) {
    this.mediaIngest = new MediaIngestService();
    this.aiOrchestrator = new AIOrchestratorService();
    this.docService = docService || new DocumentService();
    this.aiIntegration = new AIIntegrationService(this.docService, this.aiOrchestrator);
  }

  /**
   * Runs a full simulation of a meeting session.
   */
  async runFullSimulation(docId: string): Promise<void> {
    console.log('--- 🧪 Starting End-to-End Pipeline Simulation ---');

    // 1. Mocking accumulated transcripts from a session
    const mockTranscripts: ITranscriptionResult[] = [
      { speakerId: 'u1', speakerName: 'Alice', text: 'Hello everyone, let\'s start the meeting.', timestamp: Date.now() },
      { speakerId: 'u2', speakerName: 'Bob', text: 'Hi Alice, I am ready.', timestamp: Date.now() + 1000 },
      { speakerId: 'u1', speakerName: 'Alice', text: 'Today we discuss the new architecture.', timestamp: Date.now() + 2000 }
    ];

    // 2. Simulate the AI processing the transcripts
    console.log('[Test] Step 1: Simulating AI Summary Generation...');
    const summary = await this.aiOrchestrator.generateMeetingSummary(mockTranscripts);
    console.log(`[Test] Generated Summary: ${summary}`);

    // 3. Simulate the insertion of the summary into the document
    console.log('[Test] Step 2: Simulating Summary Block Insertion...');
    await this.aiIntegration.insertSummaryBlock(docId, summary);

    // 4. Simulate real-time audio flow
    console.log('[Test] Step 3: Simulating Real-time Audio Packet Ingestion...');
    const mockPacket: IAudioPacket = {
      participantId: 'user_123',
      streamId: 'stream_abc',
      data: Buffer.from('dummy audio data'),
      timestamp: Date.now()
    };
    await this.mediaIngest.handleIncomingAudio(mockPacket);

    console.log('--- ✅ Simulation Completed Successfully ---');
  }
}
