import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// 콘솔 로그 수집
page.on('console', msg => {
  console.log(`[CONSOLE][${msg.type()}] ${msg.text()}`);
});

// 네트워크 요청/응답 수집 (3000, 3001 포트만)
page.on('request', req => {
  const url = req.url();
  if (url.includes(':3000') || url.includes(':3001')) {
    console.log(`[REQ] ${req.method()} ${url}`);
    if (req.method() === 'POST') {
      console.log(`[REQ-BODY] ${req.postData()}`);
    }
  }
});

page.on('requestfailed', req => {
  const url = req.url();
  if (url.includes(':3000') || url.includes(':3001')) {
    console.log(`[REQ-FAILED] ${req.method()} ${url} - ${req.failure()?.errorText}`);
  }
});

page.on('response', async resp => {
  const url = resp.url();
  if (url.includes(':3000') || url.includes(':3001')) {
    let body = '';
    try { body = await resp.text(); } catch {}
    console.log(`[RESP] ${resp.status()} ${url} - ${body.slice(0, 300)}`);
  }
});

// IP로 접속
const targetUrl = 'http://192.168.7.158:3002';
console.log(`\n=== 접속: ${targetUrl} ===`);
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

// 로그인 폼 확인
await page.waitForSelector('input[type="email"]', { timeout: 10000 });
console.log('\n=== 로그인 폼 발견 ===');

// React controlled input을 위해 type 사용 (fill 대신)
const emailInput = page.locator('input[type="email"]');
const passInput = page.locator('input[type="password"]');

await emailInput.click();
await emailInput.pressSequentially('alice@example.com', { delay: 50 });
console.log('[ACTION] 이메일 타이핑 완료');

await passInput.click();
await passInput.pressSequentially('password123', { delay: 50 });
console.log('[ACTION] 비밀번호 타이핑 완료');

// 입력값 확인
const emailVal = await emailInput.inputValue();
console.log('[VERIFY] 이메일 입력값:', emailVal);

// 로그인 버튼 클릭 (submit)
const submitBtn = page.locator('button[type="submit"]');
console.log('[VERIFY] submit 버튼:', await submitBtn.count(), '개');
await submitBtn.click();
console.log('[ACTION] 로그인 버튼 클릭 완료');

// 결과 대기
await page.waitForTimeout(8000);

// 현재 URL과 상태 확인
console.log('\n=== 현재 페이지 상태 ===');
console.log('URL:', page.url());

// 에러 메시지 확인
const errorEls = await page.$$('.text-red-500');
for (const el of errorEls) {
  const text = await el.textContent();
  if (text) console.log('[ERROR-MESSAGE]', text);
}

// 방 목록 확인
const roomEl = await page.$('aside');
if (roomEl) {
  const roomText = await roomEl.textContent();
  console.log('\n[ROOM-LIST]', roomText?.slice(0, 200));
} else {
  console.log('\n[NO-ASIDE] 방 목록 사이드바가 없습니다.');
}

// 페이지 메인 내용
const mainText = await page.evaluate(() => document.body.innerText.slice(0, 500));
console.log('\n[PAGE-TEXT]', mainText);

await browser.close();
console.log('\n=== 테스트 완료 ===');
