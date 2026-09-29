import { chromium } from 'playwright';

const URL = 'http://192.168.7.158:3002';

// 두 컨텍스트가 같은 방에 있고, WS 메시지 로깅
async function setupUser(ctxName, email) {
  const ctx = await (await chromium.launch({ headless: true })).newContext();
  const page = await ctx.newPage();

  const wsMessages = [];
  page.on('websocket', ws => {
    ws.on('framereceived', (frame) => {
      try {
        const msg = JSON.parse(frame.payload);
        if (msg.type === 'BLOCK_UPDATE' || msg.type === 'PRESENCE_UPDATE') {
          wsMessages.push({ direction: 'received', type: msg.type, blockId: msg.payload?.blockId });
        }
      } catch {}
    });
    ws.on('framesent', (frame) => {
      try {
        const msg = JSON.parse(frame.payload);
        if (msg.type === 'BLOCK_UPDATE') {
          wsMessages.push({ direction: 'sent', type: msg.type, blockId: msg.payload?.blockId });
        }
      } catch {}
    });
  });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.locator('input[type="email"]').pressSequentially(email, { delay: 15 });
  await page.locator('input[type="password"]').pressSequentially('password123', { delay: 15 });
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  // 팀 회의룸 선택
  await page.locator('aside >> text=팀 회의룸').first().click();
  await page.waitForTimeout(800);

  // 문서 열기
  const docToggle = page.locator('header >> text=문서').first();
  if (await docToggle.count() > 0) await docToggle.click();
  await page.waitForTimeout(800);

  // 모든 텍스트 블록 렌더링 확인
  const blocks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[class*="prose"]'))
      .map(el => el.textContent?.slice(0, 40));
  });

  return { page, wsMessages, ctx, blocks, ctxName };
}

const A = await setupUser('Alice', 'alice@example.com');
const B = await setupUser('Bob', 'bob@example.com');

console.log('Alice blocks:', JSON.stringify(A.blocks));
console.log('Bob blocks:', JSON.stringify(B.blocks));

// Alice: 첫 텍스트 블록 편집
console.log('\n=== Alice 첫 텍스트 블록 편집 시작 ===');
const firstProse = A.page.locator('[class*="prose"]').first();
await firstProse.click();
await A.page.waitForTimeout(500);
const ta = A.page.locator('textarea').first();
await ta.waitFor({ timeout: 5000 });
await ta.click();
await ta.press('Control+A');
await ta.press('Delete');
await ta.pressSequentially('실시간 동기화 테스트 OK', { delay: 15 });

// Enter로 줄바꿈 (1차 요구사항 확인)
await ta.press('Enter');
await A.page.waitForTimeout(300);
await ta.pressSequentially('두 번째 줄', { delay: 15 });

await A.page.waitForTimeout(3000);

console.log('\n=== WS 메시지 (Alice) ===');
A.wsMessages.forEach(m => console.log(JSON.stringify(m)));
console.log('\n=== WS 메시지 (Bob) ===');
B.wsMessages.forEach(m => console.log(JSON.stringify(m)));

// 최종 상태 확인
const aBlocks = await A.page.evaluate(() =>
  Array.from(document.querySelectorAll('textarea, [class*="prose"]'))
    .map(el => el.textContent || el.value || el.innerText).slice(0, 8));
const bBlocks = await B.page.evaluate(() =>
  Array.from(document.querySelectorAll('[class*="prose"]'))
    .map(el => el.textContent?.slice(0, 60)));

console.log('\n=== Alice 최종 블록 상태 ===');
aBlocks.forEach(b => console.log('  ', b));
console.log('\n=== Bob 최종 블록 상태 (동기화 확인) ===');
bBlocks.forEach(b => console.log('  ', b));

// Bob 화면에 "실시간 동기화 테스트 OK" 또는 "두 번째 줄" 포함 여부
const bobHasSync = bBlocks.some(b => b && (b.includes('실시간 동기화 테스트 OK') || b.includes('두 번째 줄')));
console.log('\n[결과] Bob에 Alice 편집 내용 동기화됨:', bobHasSync ? '예 ✅' : '아니오 ❌');

await A.page.context().browser().close();
await B.page.context().browser().close();
console.log('\n=== 테스트 완료 ===');
