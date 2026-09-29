import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

page.on('console', msg => console.log(`[C] ${msg.text()}`));
page.on('pageerror', err => console.log(`[PAGE-ERROR] ${err.message}`));

await page.goto('http://192.168.7.158:3002', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('input[type="email"]', { timeout: 10000 });

// 페이지에서 직접 JS 실행
const result = await page.evaluate(() => {
  // React root가 있는지 확인
  const root = document.getElementById('__next');
  const rootExists = !!root;
  
  // window에서 Next.js 객체 확인
  const hasNext = typeof window.__NEXT_DATA__ !== 'undefined';
  
  // localStorage 확인
  const lsToken = localStorage.getItem('token');
  const lsUser = localStorage.getItem('user');
  
  return {
    rootExists,
    hasNext,
    lsToken: lsToken ? '있음' : '없음',
    lsUser: lsUser ? '있음' : '없음',
    hostname: window.location.hostname,
    userScriptCount: document.scripts.length
  };
});

console.log('\n=== 디버깅 결과 ===');
console.log(JSON.stringify(result, null, 2));

// input 클릭 후 state 확인
const emailInput = page.locator('input[type="email"]');
await emailInput.click();
await emailInput.pressSequentially('alice@example.com', { delay: 30 });
await page.locator('input[type="password"]').click();
await page.locator('input[type="password"]').pressSequentially('password123', { delay: 30 });

// 폼 submit 이벤트가 React로 전달되는지 확인
await page.evaluate(() => {
  const form = document.querySelector('form');
  if (form) {
    console.log('Form found:', form);
    // submit 이벤트 리스너 확인
    const events = getEventListeners ? getEventListeners(form) : 'unavailable';
    console.log('Events:', JSON.stringify(events));
  } else {
    console.log('No form found!');
  }
});

await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

console.log('\n페이지 텍스트:', await page.evaluate(() => document.body.innerText.slice(0, 300)));

await browser.close();
