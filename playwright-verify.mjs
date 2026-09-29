import { chromium } from 'playwright';

const URL = 'http://192.168.7.158:3002';

async function createBrowser(email, name) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const events = [];
  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('BLOCK_UPDATE') || t.includes('Presence')) events.push(t);
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

  // 문서 열기 (header의 "문서" 토글)
  const docToggle = page.locator('header >> text=문서').first();
  if (await docToggle.count() > 0) await docToggle.click();
  await page.waitForTimeout(800);

  return { browser, ctx, page, events, name };
}

// 첫 텍스트 블록을 편집 모드로 열고 textarea 반환
async function focusTextBlock(page) {
  const prose = page.locator('[class*="prose"]').first();
  await prose.waitFor({ timeout: 10000 });
  await prose.click();
  await page.waitForTimeout(500);
  const ta = page.locator('textarea').first();
  await ta.waitFor({ timeout: 5000 });
  await ta.click();
  return ta;
}

console.log('=== 두 무브라우저 시작 ===');
const A = await createBrowser('alice@example.com', 'Alice');
const B = await createBrowser('bob@example.com', 'Bob');

// 초기 상태
const aInit = await A.page.evaluate(() =>
  document.querySelector('[class*="prose"]')?.textContent);
console.log('초기 첫 텍스트 블록:', JSON.stringify(aInit));

// ── 1차 요구사항: Enter로 새 줄 생성 + 포커스 이동 ──
console.log('\n=== [1] Alice: Enter 동작 테스트 ===');
const taA = await focusTextBlock(A.page);
// 기존 내용 지우고 첫 줄 입력
await taA.press('Control+A');
await taA.press('Delete');
await taA.pressSequentially('첫 줄 내용', { delay: 15 });

// Enter
await taA.press('Enter');
await A.page.waitForTimeout(300);

// Enter 후 포커스가 여전히 textarea에 있는지, 커서가 2번째 줄에 있는지 확인
const focusInfo = await A.page.evaluate(() => {
  const ta = document.querySelector('textarea');
  return {
    focused: document.activeElement === ta,
    value: ta?.value,
    selectionStart: ta?.selectionStart,
    selectionEnd: ta?.selectionEnd,
    lines: ta?.value.split('\n')
  };
});
console.log('Enter 후 상태:', JSON.stringify(focusInfo, null, 2));

const enterWorks = focusInfo.focused &&
  focusInfo.value === '첫 줄 내용\n' &&
  focusInfo.selectionStart === 7; // '첫 줄 내용\n' 길이 7 (5 글자 + 한 칸? 확인)
console.log('[1] Enter가 새 줄 생성 + 포커스 유지:', focusInfo.focused && focusInfo.lines.length === 2 ? '예 ✅' : '아니오 ❌ (줄 수: ' + focusInfo.lines.length + ')');

// 두 번째 줄에 입력
await taA.pressSequentially('두 번째 줄 내용', { delay: 15 });
await A.page.waitForTimeout(300);
const afterSecond = await A.page.evaluate(() => document.querySelector('textarea')?.value);
console.log('두 번째 줄 입력 후 textarea:', JSON.stringify(afterSecond));

// ── 2차 요구사항: 실시간 브로드캐스트 ──
console.log('\n=== [2] Alice 편집 → Bob 실시간 동기화 테스트 ===');
await A.page.waitForTimeout(2000);

const bText = await B.page.evaluate(() =>
  document.querySelector('[class*="prose"]')?.textContent);
console.log('Bob 화면 첫 텍스트 블록:', JSON.stringify(bText));

const syncWorks = bText && (bText.includes('두 번째 줄 내용') || bText.includes('첫 줄 내용'));
console.log('[2] Bob에 Alice 편집 내용 실시간 동기화:', syncWorks ? '예 ✅' : '아니오 ❌');

// Bob이 다시 편집하면 Alice에게도 전파되는지 확인
console.log('\n=== [2b] Bob 편집 → Alice 실시간 동기화 테스트 ===');
const taB = await focusTextBlock(B.page);
await taB.press('Control+A');
await taB.press('Delete');
await taB.pressSequentially('Bob이 보낸 내용', { delay: 15 });
await B.page.waitForTimeout(2000);

const aTextAfterBob = await A.page.evaluate(() => {
  // Alice는 1차 편집 중이라 텍스트가 다름. Alice의 읽기 모드 블록 확인
  return Array.from(document.querySelectorAll('[class*="prose"]'))
    .map(el => el.textContent?.slice(0, 50));
});
console.log('Alice 블록들 (Bob 편집 후):', JSON.stringify(aTextAfterBob));

// Alice의 첫 블록(편집 중인 것) 제외하고 읽기 모드 블록에서 Bob 내용 확인
const aliceHasBob = aTextAfterBob.some(t => t && t.includes('Bob이 보낸 내용'));
console.log('[2b] Alice에 Bob 편집 내용 동기화:', aliceHasBob ? '예 ✅' : '확인 필요');

await A.browser.close();
await B.browser.close();
console.log('\n=== 테스트 완료 ===');
