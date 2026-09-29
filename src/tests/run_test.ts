import { MediaIngestService } from '../services/media/media-ingest.service';
import { AIOrchestratorService } from '../services/ai/ai-orchestrator.service';
import { AIIntegrationService } from '../services/ai/ai-integration.service';
import { PipelineIntegrationTest } from './pipeline.test';
import { DocumentService } from '../services/core.service';

async function runTest() {
  console.log('Running Pipeline Integration Test...');
  
  try {
    // 1. Set up Mock Document Service to avoid real DB calls
    const mockDocService = {
      updateBlock: async (docId: string, blockId: string, blockData: any) => {
        console.log(`[Mock] Updated block ${blockId} in doc ${docId} with data:`, blockData);
        return { ok: 1 };
      }
    };

    // 2. Set up the tester with Mocked Document Service
    const tester = new PipelineIntegrationTest(mockDocService);
    
    // Create a valid ObjectId for testing purposes
    const validObjectId = new (require('mongodb').ObjectId)();
    console.log(`[Test] Using valid document ID: ${validObjectId}`);
    
    // 3. Run the simulation
    await tester.runFullSimulation(validObjectId.toString());
    console.log('TEST PASSED');
  } catch (error) {
    console.error('TEST FAILED:', error);
    process.exit(1);
  }
}

runTest();
