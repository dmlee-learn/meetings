/**
 * AI 파이프라인 통합 테스트: LLM Summary -> Block Insert -> Markdown Export
 */
import { dbConnector } from '../config/database';
import { Room, IRoom } from '../models/Room';
import { Document, IDocument } from '../models/Document';
import { RoomService, DocumentService } from '../services/core.service';
import { PluginManager } from '../plugins/plugin-manager';
import { AIIntegrationService } from '../services/ai/ai-integration.service';
import { AIOrchestratorService } from '../services/ai/ai-orchestrator.service';

// Mock LLM Service: 실제 API 호출 없이 테스트용
class MockLLMService {
  async summarizeMeeting(transcripts: string[]): Promise<string> {
    return `### AI 회의 요약 (Mock)\n\n- 주제: 테스트 회의\n- 핵심 내용: ${transcripts.join(', ')}\n- 실행 항목: 확인 필요`;
  }
}

// Mock STT Service: 실제 API 호출 없이 테스트용
class MockSTTService {
  async transcribe(audioData: Buffer): Promise<string> {
    return '이것은 음성 인식 결과입니다.';
  }
}

const runTest = async () => {
  console.log('🚀 AI 파이프라인 통합 테스트 시작\n');

  try {
    // 1. DB 연결
    await dbConnector.connect();

    // 2. 서비스 초기화
    const roomService = new RoomService();
    const docService = new DocumentService();
    const pluginManager = new PluginManager(docService);

    // Mock AI 서비스
    const mockSttService = new MockSTTService() as any;
    const mockLlmService = new MockLLMService() as any;
    const aiOrchestrator = new AIOrchestratorService(mockSttService, mockLlmService);
    const aiIntegrationService = new AIIntegrationService(docService, aiOrchestrator);

    // 3. 방 및 문서 생성
    const room: IRoom = await roomService.createRoom({
      name: 'AI 테스트 방',
      ownerId: 'user_ai_test'
    });
    console.log(`✅ 방 생성: ${room.name} (${room._id})`);

    const doc: IDocument = await docService.createDocument({
      title: 'AI 테스트 문서',
      roomId: room._id!.toString(),
      ownerId: 'user_ai_test'
    });
    console.log(`✅ 문서 생성: ${doc.title} (${doc._id})`);

    // 4. 기존 블록 추가
    await pluginManager.addBlockToDocument(doc._id!.toString(), 'text', {
      content: '기존 회의록 내용',
      format: 'markdown'
    });
    console.log('✅ 기존 텍스트 블록 추가');

    const beforeCount = (await docService.getDocumentById(doc._id!.toString()))!.blocks.length;
    console.log(`📊 AI 요약 삽입 전 블록 수: ${beforeCount}`);

    // 5. AI 요약 생성 및 블록 삽입
    const mockTranscripts = [
      { speakerId: '1', speakerName: 'Alice', text: '프로젝트 진행 상황입니다.', timestamp: Date.now() },
      { speakerId: '2', speakerName: 'Bob', text: '다음 단계 논의가 필요합니다.', timestamp: Date.now() + 1000 }
    ];

    await aiIntegrationService.processFullMeetingToSummary(doc._id!.toString(), mockTranscripts as any);
    console.log('✅ AI 요약 블록 삽입 완료');

    // 6. 블록 수 확인
    const afterCount = (await docService.getDocumentById(doc._id!.toString()))!.blocks.length;
    console.log(`📊 AI 요약 삽입 후 블록 수: ${afterCount}`);

    if (afterCount === beforeCount + 1) {
      console.log('✅ PASS: AI 요약 블록이 정상적으로 추가되었습니다.');
    } else {
      console.error(`❌ FAIL: 블록 수 불일치. (기대: ${beforeCount + 1}, 실제: ${afterCount})`);
      process.exit(1);
    }

    // 7. 마크다운 Export
    const markdown = await docService.exportDocumentToMarkdown(doc._id!.toString());
    console.log('\n--- 마크다운 내용 (AI 요약 포함) ---');
    console.log(markdown);
    console.log('--- 마크다운 내용 종료 ---\n');

    if (markdown.includes('AI 회의 요약')) {
      console.log('✅ PASS: AI 요약 내용이 마크다운에 포함되어 있습니다.');
    } else {
      console.error('❌ FAIL: 마크다운에 AI 요약 내용이 없습니다.');
      process.exit(1);
    }

    console.log('\n🎉 AI 파이프라인 통합 테스트 성공!');

  } catch (error: any) {
    console.error('❌ 테스트 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await dbConnector.disconnect();
  }
};

runTest();
