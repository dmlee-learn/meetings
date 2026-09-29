import { chromium } from 'playwright';

const API = 'http://localhost:3000/api';
const URL = 'http://192.168.7.158:3002';

async function login(page, email) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.locator('input[type="email"]').pressSequentially(email, { delay: 20 });
  await page.locator('input[type="password"]').pressSequentially('password123', { delay: 20 });
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
}

// 방 선택: 팀 회의룸
async function selectRoom(page) {
  // 방 목록에서 "팀 회의룸" 클릭
  const roomBtn = page.locator('aside >> text=팀 회의룸').first();
  await roomBtn.waitFor({ timeout: 10000 });
  await roomBtn.click();
  await page.waitForTimeout(1000);
}

// 문서 패널 열기
async function openDocument(page) {
  const docToggle = page.locator('text=문서').first();
  await docToggle.waitFor({ timeout: 10000 });
  await docToggle.click();
  await page.waitForTimeout(1000);
}

// 첫 텍스트 블록 편집하고 내용 입력
async function editTextBlock(page, text) {
  // 첫 텍스트 블록 (읽기 모드 div) 클릭하여 편집 모드 진입
  const block = page.locator('[class*="prose"]').first();
  await block.waitFor({ timeout: 10000 });
  await block.click();
  await page.waitForTimeout(500);
  // textarea가 나타남
  const ta = page.locator('textarea').first();
  await ta.waitFor({ timeout: 5000 });
  await ta.click();
  // 기존 내용 삭제
  await ta.press('Control+A');
  await ta.press('Delete');
  await ta.pressSequentially(text, { delay: 20 });
  await page.waitForTimeout(500);
}

const browser = await chromium.launch({ headless: true });

// ── Alice ──
const ctxA = await browser.newContext();
const pageA = await ctxA.newPage();
console.log('=== Alice 로그인 ===');
await login(pageA, 'alice@example.com');
console.log('Alice 방 선택');
await selectRoom(pageA);
console.log('Alice 문서 열기');
await openDocument(pageA);

// ── Bob ──
const ctxB = await browser.newContext();
const pageB = await ctxB.newPage();
console.log('=== Bob 로그인 ===');
await login(pageB, 'bob@example.com');
console.log('Bob 방 선택');
await selectRoom(pageB);
console.log('Bob 문서 열기');
await openDocument(pageB);

// Alice 편집
console.log('=== Alice 블록 편집: "실시간 협업 성공" ===');
await editTextBlock(pageA, '실시간 협업 성공');

// 잠시 대기 후 Bob 화면 확인
await pageA.waitForTimeout(3000);
await pageB.waitForTimeout(3000);

const bobText = await pageB.evaluate(() => document.body.innerText.slice(0, 1000));
console.log('\n=== Bob 화면 (편집 동기화 확인) ===');
console.log(bobText);

// Alice 화면도 확인
const aliceText = await pageA.evaluate(() => document.body.innerText.slice(0, 1000));
console.log('\n=== Alice 화면 ===');
console.log(aliceText);

// Alice 화면에 텍스트 블록 편집 영역 (textarea) 확인
const aliceTa = await pageA.locator('textarea').count();
const bobTa = await pageB.locator('textarea').count();
console.log('\n[CHECK] Alice textarea 수:', aliceTa);
console.log('[CHECK] Bob textarea 수:', bobTa);

await browser.close();
console.log('\n=== 테스트 완료 ===');
