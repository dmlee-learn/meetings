/**
 * E2E 화상 채팅 테스트 (가상 카메라/마이크)
 * - Playwright의 가상 미디어 스트림을 사용해서 상대방 영상 테스트
 */
import { chromium } from 'playwright';
import { loginAs, BASE_URL } from '../helpers.mjs';

// 가상 카메라/마이크를 사용해서 브라우저 시작
async function startBrowserWithFakeMedia(email) {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });
  const context = await browser.newContext({
    permissions: ['camera', 'microphone']
  });
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.locator('input[type="email"]').pressSequentially(email, { delay: 20 });
  await page.locator('input[type="password"]').pressSequentially('password123', { delay: 20 });
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  return { browser, context, page };
}

console.log('=== Alice 브라우저 시작 (가상 카메라/마이크) ===');
const A = await startBrowserWithFakeMedia('alice@example.com');

console.log('=== Bob 브라우저 시작 (가상 카메라/마이크) ===');
const B = await startBrowserWithFakeMedia('bob@example.com');

// Alice: 방 선택 → 화상 시작
console.log('Alice: 팀 회의룸 선택');
await A.page.locator('text=팀 회의룸').first().click();
await A.page.waitForTimeout(1000);

await A.page.locator('text=🔴 시작').first().click();
await A.page.waitForTimeout(5000);

console.log('Alice: 화상 시작 완료');
const aVideoCount = await A.page.locator('video').count();
console.log('Alice video 요소 수:', aVideoCount);

// Bob: 방 선택 → 화상 시작
console.log('Bob: 팀 회의룸 선택');
await B.page.locator('text=팀 회의룸').first().click();
await B.page.waitForTimeout(1000);

await B.page.locator('text=🔴 시작').first().click();
await B.page.waitForTimeout(8000);

console.log('Bob: 화상 시작 완료');
const bVideoCount = await B.page.locator('video').count();
console.log('Bob video 요소 수:', bVideoCount);

// Bob 화면에 원격 영상 확인
await B.page.waitForTimeout(3000);
const bVideoCount2 = await B.page.locator('video').count();
console.log('Bob video 요소 수 (3초 후):', bVideoCount2);

if (bVideoCount2 > 1) {
  console.log('✅ Bob 화면에 Alice의 원격 영상 표시 확인');
} else {
  console.error('❌ Bob 화면에 원격 영상이 표시되지 않음');
}

await A.browser.close();
await B.browser.close();
console.log('\n=== 화상 채팅 테스트 완료 ===');
