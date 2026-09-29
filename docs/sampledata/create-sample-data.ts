/**
 * 샘플 데이터 생성 스크립트
 *
 * 사용법:
 *   npx tsx docs/sampledata/create-sample-data.ts [API_URL]
 *
 * 기본 API_URL: http://localhost:3000/api
 *
 * 이 스크립트는 다음을 생성합니다:
 * 1. 샘플 사용자 2명 (alice, bob)
 * 2. 방 1개 (팀 회의룸)
 * 3. 문서 1개 + 블록 3개 (텍스트, 마인드맵, 스프레드시트)
 */

const API_URL = process.argv[2] || `http://localhost:${process.env.PORT || '3000'}/api`;

// ─── 유틸리티 ────────────────────────────────────────────────

async function api(
  method: string,
  path: string,
  token?: string,
  body?: any
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '알 수 없는 오류' }));
    const errMsg = error.error?.message || error.message || `HTTP ${response.status}`;
    const errCode = error.error?.code || '';
    const err: any = new Error(`${method} ${path} 실패: ${errMsg}`);
    err.code = errCode;
    err.httpStatus = response.status;
    throw err;
  }

  return response.json();
}

function extractId(data: any): string {
  return data?._id || data?.data?._id || data?.data?.id || '';
}

function extractToken(data: any): string {
  return data?.token || data?.data?.token || '';
}

// ─── 메인 ───────────────────────────────────────────────────

async function main() {
  console.log(`\n📦 샘플 데이터 생성 스크립트`);
  console.log(`   API: ${API_URL}\n`);

  // ── Step 1: 사용자 생성 ────────────────────────────────────
  console.log('1️⃣  사용자 생성');

  const users = [
    { email: 'alice@example.com', username: 'alice', name: 'Alice', color: '#10b981' },
    { email: 'bob@example.com', username: 'bob', name: 'Bob', color: '#f59e0b' }
  ];

  let aliceToken = '';
  let bobToken = '';

  for (const user of users) {
    try {
      // 회원가입
      await api('POST', '/auth/register', undefined, {
        email: user.email,
        username: user.username,
        password: 'password123',
        name: user.name,
        color: user.color
      });
      console.log(`   ✅ 회원가입: ${user.email}`);
    } catch (e: any) {
      // 중복 키 에러(11000) 또는 일반 오류 시 이미 존재로 처리
      // (회원가입 실패 시에도 로그인은 성공할 수 있으므로)
      console.log(`   ➖ 회원가입 스킵: ${user.email} (${e.message?.slice(0, 50) || '이미 존재'})`);
    }

    // 로그인
    const loginData = await api('POST', '/auth/login', undefined, {
      email: user.email,
      password: 'password123'
    });
    const token = extractToken(loginData);

    if (user.username === 'alice') aliceToken = token;
    if (user.username === 'bob') bobToken = token;

    console.log(`   ✅ 로그인 성공: ${user.email}`);
  }

  // ── Step 2: 방 생성 ────────────────────────────────────────
  console.log('\n2️⃣  방 생성');

  const roomData = await api('POST', '/rooms', aliceToken, {
    name: '팀 회의룸',
    description: '프로젝트 회의 및 협업 공간'
  });
  const roomId = extractId(roomData);
  console.log(`   ✅ 방 생성: 팀 회의룸 (${roomId})`);

  // ── Step 3: 문서 생성 ──────────────────────────────────────
  console.log('\n3️⃣  문서 생성');

  const docData = await api('POST', '/documents', aliceToken, {
    title: '팀 회의록 - 2026 Q3',
    description: '프로젝트 진행 상태 점검 회의록',
    roomId
  });
  const docId = extractId(docData);
  console.log(`   ✅ 문서 생성: 팀 회의록 (${docId})`);

  // ── Step 4: 블록 생성 ──────────────────────────────────────
  console.log('\n4️⃣  블록 생성');

  // 4a. 텍스트 블록
  const textBlock = await api('POST', `/documents/${docId}/blocks`, aliceToken, {
    type: 'text',
    data: {
      content: '<h2>회의 아젠다</h2><ol><li>프로젝트 일정 점검</li><li>미디어소프 전환 완료</li><li>AI 회의록 파이프라인 검토</li><li>다음 스프린트 계획</li></ol><h2>의결 사항</h2><ul><li>미디어소프 전환 즉시 배포</li><li>AI 회의록 A/B 테스트 10월 시작</li></ul>',
      heading: '회의 아젠다',
      markdown: '## 회의 아젠다\n1. 프로젝트 일정 점검\n2. 미디어소프 전환 완료\n3. AI 회의록 파이프라인 검토\n4. 다음 스프린트 계획\n\n## 의결 사항\n- 미디어소프 전환 즉시 배포\n- AI 회의록 A/B 테스트 10월 시작'
    }
  });
  const textBlockId = extractId(textBlock);
  console.log(`   ✅ 텍스트 블록: 회의 아젠다 (${textBlockId})`);

  // 4b. 마인드맵 블록
  const mindmapBlock = await api('POST', `/documents/${docId}/blocks`, aliceToken, {
    type: 'mindmap',
    data: {
      rootId: 'root',
      nodes: [
        { id: 'root', label: '2026 Q3 프로젝트', parentId: null },
        { id: 'n1', label: '미디어소프 전환', parentId: 'root' },
        { id: 'n1a', label: 'SFU 서버', parentId: 'n1' },
        { id: 'n1b', label: '클라이언트 SDK', parentId: 'n1' },
        { id: 'n2', label: 'AI 회의록', parentId: 'root' },
        { id: 'n2a', label: 'STT 파이프라인', parentId: 'n2' },
        { id: 'n2b', label: '화자 분리', parentId: 'n2' },
        { id: 'n2c', label: 'LLM 요약', parentId: 'n2' },
        { id: 'n3', label: '실시간 협업', parentId: 'root' },
        { id: 'n3a', label: 'Yjs CRDT', parentId: 'n3' },
        { id: 'n3b', label: 'Presence', parentId: 'n3' }
      ],
      edges: [
        { id: 'e1', source: 'root', target: 'n1' },
        { id: 'e2', source: 'root', target: 'n2' },
        { id: 'e3', source: 'root', target: 'n3' },
        { id: 'e4', source: 'n1', target: 'n1a' },
        { id: 'e5', source: 'n1', target: 'n1b' },
        { id: 'e6', source: 'n2', target: 'n2a' },
        { id: 'e7', source: 'n2', target: 'n2b' },
        { id: 'e8', source: 'n2', target: 'n2c' },
        { id: 'e9', source: 'n3', target: 'n3a' },
        { id: 'e10', source: 'n3', target: 'n3b' }
      ]
    }
  });
  const mindmapBlockId = extractId(mindmapBlock);
  console.log(`   ✅ 마인드맵 블록: 2026 Q3 프로젝트 (${mindmapBlockId})`);

  // 4c. 스프레드시트 블록
  const sheetBlock = await api('POST', `/documents/${docId}/blocks`, aliceToken, {
    type: 'spreadsheet',
    data: {
      sheet: 'task-tracker',
      title: '태스크 트래커',
      headers: ['작업', '상태', '담당자', '마감일', '비고'],
      rows: [
        ['미디어소프 SFU 서버', '완료', 'Alice', '2026-09-23', 'v3.19.3 적용'],
        ['미디어소프 클라이언트', '완료', 'Alice', '2026-09-23', '브라우저 SDK'],
        ['Yjs 실시간 협업', '완료', 'Bob', '2026-09-20', 'CRDT + Awareness'],
        ['AI 스틸트 파이프라인', '진행중', 'Bob', '2026-09-30', 'Deepgram 연동'],
        ['화자 분리 (Diarization)', '계획중', 'Bob', '2026-10-10', 'pyannote 고려'],
        ['파일 에포트 (.docx)', '완료', 'Alice', '2026-09-15', 'docx 라이브러리'],
        ['파일 에포트 (.xlsx)', '완료', 'Alice', '2026-09-15', 'xlsx 라이브러리'],
        ['RBAC 권한 관리', '완료', 'Alice', '2026-09-18', 'owner/editor/viewer'],
        ['데이터 백업/복원', '완료', 'Alice', '2026-09-20', 'BackupService'],
        ['E2E 테스트', '계획중', 'Bob', '2026-10-15', 'Playwright']
      ]
    }
  });
  const sheetBlockId = extractId(sheetBlock);
  console.log(`   ✅ 스프레드시트 블록: 태스크 트래커 (${sheetBlockId})`);

  // ── Step 5: 검증 ──────────────────────────────────────────
  console.log('\n5️⃣  검증');

  const verifyDoc = await api('GET', `/documents/${docId}`, aliceToken);
  const blocks = verifyDoc?.data?.blocks || verifyDoc?.blocks || [];
  console.log(`   문서 블록 수: ${blocks.length}`);
  for (const block of blocks) {
    console.log(`   - ${block.type}: ${block.data?.heading || block.data?.title || block.data?.rootId || '무제'}`);
  }

  const verifyRooms = await api('GET', '/rooms', aliceToken);
  const rooms = verifyRooms?.data || [];
  console.log(`   방 수: ${rooms.length}`);
  for (const room of rooms) {
    console.log(`   - ${room.name} (참여자: ${room.participants?.length || 0}명)`);
  }

  // ── 요약 ──────────────────────────────────────────────────
  console.log(`\n✅ 샘플 데이터 생성 완료!\n`);
  console.log(`   계정: alice@example.com / password123`);
  console.log(`   계정: bob@example.com   / password123`);
  console.log(`   방:   팀 회의룸`);
  console.log(`   문서: 팀 회의록 - 2026 Q3`);
  console.log(`   블록: 텍스트, 마인드맵, 스프레드시트`);
  console.log(`\n   프론트엔드: http://localhost:3002`);
  console.log(`   API:         ${API_URL}\n`);
}

main().catch((err) => {
  console.error('\n❌ 오류:', err.message);
  process.exit(1);
});
