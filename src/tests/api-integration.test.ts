/**
 * API 통합 테스트: 문서 생성 -> 블록 추가 -> Export -> Import -> 비교
 * 실제 HTTP 요청을 통해 전체 흐름을 검증합니다.
 */
import http from 'http';
import fs from 'fs';
import { dbConnector } from '../config/database';
import { RoomService, DocumentService, UserService } from '../services/core.service';
import { AuthService } from '../services/auth.service';
import { createRouter } from '../routes';
import { BackupService } from '../services/backup.service';
import { SfuService } from '../services/webrtc/sfu.service';
import { errorMiddleware } from '../middlewares/error-handler';
import express from 'express';

const runApiTest = async () => {
  console.log('🚀 API 통합 테스트 시작\n');

  let server: http.Server | null = null;
  let baseUrl: string;

  try {
    // 1. DB 연결
    await dbConnector.connect();
    console.log('✅ DB 연결 완료');

    // 2. 서비스 및 라우터 초기화
    const userService = new UserService();
    const authService = new AuthService(userService);
    const roomService = new RoomService();
    const docService = new DocumentService();
    const backupService = new BackupService();
    const sfuService = new SfuService();

    // Express 앱 설정
    const app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      next();
    });

    const router = createRouter(authService, roomService, docService, backupService, sfuService);
    app.use('/api', router);
    app.use(errorMiddleware);

    // 3. 서버 시작
    const PORT = 3456;
    const httpServer = await new Promise<http.Server>((resolve, reject) => {
      const s = app.listen(PORT, '127.0.0.1', () => resolve(s));
      s.on('error', reject);
    });
    server = httpServer;
    baseUrl = `http://127.0.0.1:${PORT}`;
    console.log(`✅ API 서버 시작: ${baseUrl}`);

    // 4. 사용자 등록 및 로그인
    const userResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'api-test-user',
        email: 'api-integration-test@example.com',
        password: 'password123'
      })
    });
    const userResult = await userResponse.json();
    console.log(`✅ 사용자 등록: ${userResult.data.username}`);

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'api-integration-test@example.com',
        password: 'password123'
      })
    });
    const loginResult = await loginResponse.json();
    const token = loginResult.data.token;
    console.log(`✅ 로그인 완료: ${token.substring(0, 30)}...`);

    // 5. 방 생성
    const roomResponse = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: 'API 통합 테스트 방' })
    });
    const roomResult = await roomResponse.json();
    const roomId = roomResult.data._id;
    console.log(`✅ 방 생성: ${roomResult.data.name} (${roomId})`);

    // 6. 문서 생성
    const docResponse = await fetch(`${baseUrl}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'API 통합 테스트 문서',
        roomId: roomId
      })
    });
    const docResult = await docResponse.json();
    const docId = docResult.data._id;
    console.log(`✅ 문서 생성: ${docResult.data.title} (${docId})`);

    // 7. 블록 추가
    // text 블록
    const textBlockResponse = await fetch(`${baseUrl}/api/documents/${docId}/blocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'text',
        data: { content: 'API 테스트를 위한 첫 번째 텍스트 블록입니다.', format: 'markdown' }
      })
    });
    const textBlockResult = await textBlockResponse.json();
    console.log(`✅ text 블록 추가: 총 ${textBlockResult.data.blocks.length}개 블록`);

    // mindmap 블록
    const mindmapBlockResponse = await fetch(`${baseUrl}/api/documents/${docId}/blocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'mindmap',
        data: {
          nodes: [
            { id: 'node_1', text: '중앙 노드', x: 100, y: 100, parentId: null },
            { id: 'node_2', text: '자식 노드 A', x: 200, y: 150, parentId: 'node_1' }
          ],
          rootNodeId: 'node_1'
        }
      })
    });
    const mindmapBlockResult = await mindmapBlockResponse.json();
    console.log(`✅ mindmap 블록 추가: 총 ${mindmapBlockResult.data.blocks.length}개 블록`);

    // spreadsheet 블록
    const sheetBlockResponse = await fetch(`${baseUrl}/api/documents/${docId}/blocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'spreadsheet',
        data: {
          cells: [
            { row: 0, col: 0, value: '항목' },
            { row: 0, col: 1, value: '수치' },
            { row: 1, col: 0, value: '테스트' },
            { row: 1, col: 1, value: 42 }
          ],
          rowCount: 10,
          colCount: 5
        }
      })
    });
    const sheetBlockResult = await sheetBlockResponse.json();
    console.log(`✅ spreadsheet 블록 추가: 총 ${sheetBlockResult.data.blocks.length}개 블록`);

    // 8. 마크다운 Export
    const exportResponse = await fetch(`${baseUrl}/api/documents/${docId}/export/markdown`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const markdown = await exportResponse.text();
    console.log(`\n📤 마크다운 Export 완료 (${markdown.length}자)`);

    // 테스트용 파일로 저장
    fs.writeFileSync('test-export.md', markdown, 'utf-8');
    console.log('✅ test-export.md 파일 저장 완료');

    if (!markdown.includes('API 테스트를 위한 첫 번째 텍스트')) {
      console.error('❌ FAIL: 마크다운에 text 블록 내용이 없습니다.');
      process.exit(1);
    }
    if (!markdown.includes('node_1') || !markdown.includes('node_2')) {
      console.error('❌ FAIL: 마크다운에 mindmap 노드가 없습니다.');
      process.exit(1);
    }
    if (!markdown.includes('항목') || !markdown.includes('42')) {
      console.error('❌ FAIL: 마크다운에 spreadsheet 데이터가 없습니다.');
      process.exit(1);
    }
    console.log('✅ PASS: 모든 블록 타입이 마크다운에 포함되어 있습니다.');

    // 9. 마크다운 Import (FormData 사용)
    const boundary = '----FormBoundary' + Date.now().toString(36);
    const bodyParts: string[] = [];
    bodyParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="roomId"\r\n\r\n${roomId}\r\n`);
    bodyParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test-export.md"\r\nContent-Type: text/markdown\r\n\r\n`);
    bodyParts.push(markdown);
    bodyParts.push(`\r\n--${boundary}--\r\n`);
    const importBody = bodyParts.join('');

    const importResponse = await fetch(`${baseUrl}/api/documents/import/markdown`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: importBody
    });
    const importResult = await importResponse.json();
    const importedDocId = importResult.data._id;
    console.log(`\n📥 마크다운 Import 완료: ${importResult.data.title} (${importedDocId})`);

    // 10. Import된 문서 확인
    const importedDocResponse = await fetch(`${baseUrl}/api/documents/${importedDocId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const importedDocResult = await importedDocResponse.json();
    const importedBlocks = importedDocResult.data.blocks;
    console.log(`📊 Import된 문서 블록 수: ${importedBlocks.length}`);

    if (importedBlocks.length !== 3) {
      console.error(`❌ FAIL: 블록 수 불일치. (기대: 3, 실제: ${importedBlocks.length})`);
      process.exit(1);
    }

    // 블록 타입 검증
    const types = importedBlocks.map((b: any) => b.type);
    if (!types.includes('text') || !types.includes('mindmap') || !types.includes('spreadsheet')) {
      console.error(`❌ FAIL: 블록 타입 불일치. ${types.join(', ')}`);
      process.exit(1);
    }
    console.log('✅ PASS: 모든 블록 타입이 정상적으로 Import되었습니다.');

    console.log('\n🎉 API 통합 테스트 성공!');
    console.log('---');
    console.log('생성된 파일: test-export.md (마크다운 내보내기 결과)');

  } catch (error: any) {
    console.error('❌ 테스트 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise<void>(resolve => server!.close(() => resolve()));
    }
    await dbConnector.disconnect();
    process.exit(0);
  }
};

runApiTest();
