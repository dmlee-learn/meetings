/**
 * E2E 로그인 테스트
 * - 로그인 폼 입력 → 성공 → 방 목록 표시 확인
 *
 * 실행: node test/e2e/login.test.mjs
 */
import { loginAs, screenshot } from '../helpers.mjs';

const email = 'alice@example.com';
const { page, browser } = await loginAs(email);

// 방 목록 확인
const aside = await page.locator('aside').first();
const roomText = await aside.textContent();

if (roomText?.includes('팀 회의룸') || roomText?.includes('방 목록')) {
  console.log('✅ 로그인 성공: 방 목록 표시 확인');
} else {
  console.error('❌ 로그인 실패: 방 목록이 표시되지 않습니다.');
  process.exitCode = 1;
}

// 사용자 이름 확인
const userName = await page.locator('text=Alice').count();
if (userName > 0) {
  console.log('✅ 사용자 이름 표시 확인');
} else {
  console.error('❌ 사용자 이름이 표시되지 않습니다.');
  process.exitCode = 1;
}

await screenshot(page, 'login.png');
await browser.close();
console.log('=== 로그인 테스트 완료 ===');
