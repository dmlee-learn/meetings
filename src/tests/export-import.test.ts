/**
 * 통합 테스트: 문서 생성 -> 블록 추가 -> 마크다운 Export -> Import -> 비교
 */
import { dbConnector } from '../config/database';
import { Room, IRoom } from '../models/Room';
import { Document, IDocument } from '../models/Document';
import { RoomService, DocumentService } from '../services/core.service';
import { PluginManager } from '../plugins/plugin-manager';

const runTest = async () => {
  console.log('🚀 통합 테스트 시작: 마크다운 Export/Import\n');

  try {
    // 1. DB 연결
    await dbConnector.connect();

    // 2. 서비스 초기화
    const roomService = new RoomService();
    const docService = new DocumentService();
    const pluginManager = new PluginManager(docService);

    // 3. 방 생성
    const room: IRoom = await roomService.createRoom({
      name: '테스트 방',
      ownerId: 'user_test_123',
      description: '마크다운 테스트용'
    });
    console.log(`✅ 방 생성: ${room.name} (${room._id})`);

    // 4. 문서 생성
    const doc: IDocument = await docService.createDocument({
      title: '통합 테스트 문서',
      roomId: room._id!.toString(),
      ownerId: 'user_test_123'
    });
    console.log(`✅ 문서 생성: ${doc.title} (${doc._id})`);

    // 5. 블록 추가
    // text 블록
    await pluginManager.addBlockToDocument(doc._id!.toString(), 'text', {
      content: 'これは統合テストです。\n2024.09.28 기준.',
      format: 'markdown'
    });
    console.log('✅ text 블록 추가');

    // mindmap 블록
    await pluginManager.addBlockToDocument(doc._id!.toString(), 'mindmap', {
      nodes: [
        { id: 'node_1', text: '근 노드', x: 100, y: 100, parentId: null },
        { id: 'node_2', text: '자식 노드', x: 200, y: 200, parentId: 'node_1' }
      ],
      rootNodeId: 'node_1'
    });
    console.log('✅ mindmap 블록 추가');

    // spreadsheet 블록
    await pluginManager.addBlockToDocument(doc._id!.toString(), 'spreadsheet', {
      cells: [
        { row: 0, col: 0, value: '이름' },
        { row: 0, col: 1, value: '나이' },
        { row: 1, col: 0, value: '홍길동' },
        { row: 1, col: 1, value: 30 }
      ],
      rowCount: 5,
      colCount: 4
    });
    console.log('✅ spreadsheet 블록 추가');

    // 6. 마크다운 Export
    const exportedDoc = await docService.getDocumentById(doc._id!.toString());
    const originalBlocksCount = exportedDoc!.blocks.length;
    console.log(`\n📤 Export 전 블록 수: ${originalBlocksCount}`);

    const markdown = await docService.exportDocumentToMarkdown(doc._id!.toString());
    console.log('--- 마크다운 내용 시작 ---');
    console.log(markdown);
    console.log('--- 마크다운 내용 종료 ---\n');

    // 7. 마크다운 Import
    const importedDoc: IDocument = await docService.importDocumentFromMarkdown(
      markdown,
      '가져온 테스트 문서',
      room._id!.toString(),
      'user_test_123'
    );
    console.log(`✅ Import 완료: ${importedDoc.title} (${importedDoc._id})`);
    console.log(`📥 Import 후 블록 수: ${importedDoc.blocks.length}`);

    // 8. 비교 검증
    if (originalBlocksCount === importedDoc.blocks.length) {
      console.log('\n✅ PASS: 블록 수가 일치합니다.');
    } else {
      console.error(`\n❌ FAIL: 블록 수가 일치하지 않습니다. (원본: ${originalBlocksCount}, 가져온: ${importedDoc.blocks.length})`);
      process.exit(1);
    }

    // 9. 블록 타입별 데이터 비교
    for (let i = 0; i < originalBlocksCount; i++) {
      const originalBlock = exportedDoc!.blocks[i];
      const importedBlock = importedDoc.blocks[i];

      if (originalBlock.type !== importedBlock.type) {
        console.error(`❌ FAIL: 블록 ${i} 타입 불일치. (원본: ${originalBlock.type}, 가져온: ${importedBlock.type})`);
        process.exit(1);
      }

      // text 블록은 content 비교
      if (originalBlock.type === 'text') {
        const originalContent = originalBlock.data.content;
        const importedContent = importedBlock.data.content;
        if (originalContent !== importedContent) {
          console.error(`❌ FAIL: 블록 ${i} (text) content 불일치.`);
          console.error(`  원본: ${originalContent}`);
          console.error(`  가져온: ${importedContent}`);
          process.exit(1);
        }
      }
      // mindmap 블록은 nodes 비교
      else if (originalBlock.type === 'mindmap') {
        const originalNodes = originalBlock.data.nodes;
        const importedNodes = importedBlock.data.nodes;
        if (JSON.stringify(originalNodes) !== JSON.stringify(importedNodes)) {
          console.error(`❌ FAIL: 블록 ${i} (mindmap) nodes 불일치.`);
          process.exit(1);
        }
      }
      // spreadsheet 블록은 cells 비교
      else if (originalBlock.type === 'spreadsheet') {
        const originalCells = originalBlock.data.cells;
        const importedCells = importedBlock.data.cells;
        if (JSON.stringify(originalCells) !== JSON.stringify(importedCells)) {
          console.error(`❌ FAIL: 블록 ${i} (spreadsheet) cells 불일치.`);
          process.exit(1);
        }
      }
    }

    console.log('✅ PASS: 모든 블록 데이터가 일치합니다.');
    console.log('\n🎉 통합 테스트 성공!');

  } catch (error: any) {
    console.error('❌ 테스트 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await dbConnector.disconnect();
  }
};

runTest();
