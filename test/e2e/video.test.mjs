/**
 * E2E 화상 채팅 테스트
 * - Alice와 Bob이 같은 방에 입장 후, 상대방의 영상이 표시되는지 확인
 *
 * 실행: node test/e2e/video.test.mjs
 */
import { chromium } from 'playwright';
import { loginAs, BASE_URL } from '../helpers.mjs';

console.log('=== Alice 브라우저 시작 ===');
const A = await loginAs('alice@example.com');
const B = await loginAs('bob@example.com');

// Alice: 방 선택 → 화상 시작
console.log('Alice: 팀 회의룸 선택');
await A.page.locator('text=팀 회의룸').first().click();
await A.page.waitForTimeout(1000);

// Alice: 화상 채팅 시작 (카메라/마이크 허용)
await A.page.context().grantPermissions(['camera', 'microphone'], { origin: BASE_URL });
await A.page.locator('text=🔴 시작').first().click();
await A.page.waitForTimeout(3000);

console.log('Alice: 화상 시작 완료, 로컬 영상 확인');
const aVideoCount = await A.page.locator('video').count();
console.log('Alice video 요소 수:', aVideoCount);

// Bob: 방 선택 → 화상 시작
console.log('Bob: 팀 회의룸 선택');
await B.page.locator('text=팀 회의룸').first().click();
await B.page.waitForTimeout(1000);

await B.page.context().grantPermissions(['camera', 'microphone'], { origin: BASE_URL });
await B.page.locator('text=🔴 시작').first().click();
await B.page.waitForTimeout(5000);

console.log('Bob: 화상 시작 완료, 로컬 + 원격 영상 확인');
const bVideoCount = await B.page.locator('video').count();
console.log('Bob video 요소 수:', bVideoCount);

// Bob 화면에 원격 영상 확인 (Alice의 영상)
await B.page.waitForTimeout(3000);
const bVideoCount2 = await B.page.locator('video').count();
console.log('Bob video 요소 수 (3초 후):', bVideoCount2);

if (bVideoCount2 > 1) {
  console.log('✅ Bob 화면에 Alice의 원격 영상 표시 확인');
} else {
  console.error('❌ Bob 화면에 원격 영상이 표시되지 않음');
}

// 스크린샷 저장
const { mkdirSync } = await import('fs');
const { join } = await import('path');
const screenshotDir = join(process.cwd(), 'test', 'screenshots');
mkdirSync(screenshotDir, { recursive: true });
await A.page.screenshot({ path: join(screenshotDir, 'video-alice.png') });
await B.page.screenshot({ path: join(screenshotDir, 'video-bob.png') });

await A.browser.close();
await B.browser.close();
console.log('\n=== 화상 채팅 테스트 완료 ===');
