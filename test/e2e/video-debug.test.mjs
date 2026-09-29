/**
 * E2E 화상 채팅 테스트 (디버깅 버전)
 * - 브라우저 콘솔 로그를 확인해서 미디어 신호 문제를 디버깅
 */
import { chromium } from 'playwright';
import { loginAs, BASE_URL } from '../helpers.mjs';

const consoleLogs = { alice: [], bob: [] };

async function setupBrowser(name, email) {
  const { browser, context, page } = await loginAs(email);

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('VideoCall') || text.includes('Mediasoup') || text.includes('consume') || text.includes('producer') || text.includes('transport')) {
      consoleLogs[name].push(`[${msg.type()}] ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    consoleLogs[name].push(`[ERROR] ${err.message}`);
  });

  return { browser, context, page };
}

console.log('=== Alice 브라우저 시작 ===');
const A = await setupBrowser('alice', 'alice@example.com');

console.log('=== Bob 브라우저 시작 ===');
const B = await setupBrowser('bob', 'bob@example.com');

// Alice: 방 선택 → 화상 시작
console.log('Alice: 팀 회의룸 선택');
await A.page.locator('text=팀 회의룸').first().click();
await A.page.waitForTimeout(1000);

await A.page.context().grantPermissions(['camera', 'microphone'], { origin: BASE_URL });
await A.page.locator('text=🔴 시작').first().click();
await A.page.waitForTimeout(5000);

console.log('Alice: 화상 시작 완료');
console.log('Alice console logs:');
consoleLogs.alice.forEach(l => console.log('  ', l));

// Bob: 방 선택 → 화상 시작
console.log('Bob: 팀 회의룸 선택');
await B.page.locator('text=팀 회의룸').first().click();
await B.page.waitForTimeout(1000);

await B.page.context().grantPermissions(['camera', 'microphone'], { origin: BASE_URL });
await B.page.locator('text=🔴 시작').first().click();
await B.page.waitForTimeout(8000);

console.log('Bob: 화상 시작 완료');
console.log('Bob console logs:');
consoleLogs.bob.forEach(l => console.log('  ', l));

// Bob 화면에 원격 영상 확인
const bVideoCount = await B.page.locator('video').count();
console.log('Bob video 요소 수:', bVideoCount);

if (bVideoCount > 1) {
  console.log('✅ Bob 화면에 Alice의 원격 영상 표시 확인');
} else {
  console.error('❌ Bob 화면에 원격 영상이 표시되지 않음');
}

await A.browser.close();
await B.browser.close();
console.log('\n=== 화상 채팅 테스트 완료 ===');
