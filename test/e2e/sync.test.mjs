/**
 * E2E 실시간 동기화 테스트
 * - Alice와 Bob이 같은 방에 입장 후, Alice가 블록을 편집하면
 *   Bob 화면에 실시간으로 동기화되는지 확인
 *
 * 실행: node test/e2e/sync.test.mjs
 */
import { loginAs, enterRoom, setTextBlock, screenshot } from '../helpers.mjs';

console.log('=== Alice 로그인 ===');
const A = await loginAs('alice@example.com');
await enterRoom(A.page);

console.log('=== Bob 로그인 ===');
const B = await loginAs('bob@example.com');
await enterRoom(B.page);

// 초기 상태 확인
const aInit = await A.page.evaluate(() =>
  document.querySelector('[class*="prose"]')?.textContent?.slice(0, 80)
);
console.log('Alice 초기 첫 블록:', JSON.stringify(aInit));

// Alice: 텍스트 블록 편집
console.log('\n=== Alice: 텍스트 블록 편집 ===');
await setTextBlock(A.page, '실시간 협업 성공');
await A.page.waitForTimeout(3000);

// Bob 화면에서 동기화 확인
const bText = await B.page.evaluate(() =>
  document.querySelector('[class*="prose"]')?.textContent
);

const synced = bText?.includes('실시간 협업 성공');
console.log('\n=== Bob 화면 (동기화 확인) ===');
console.log(bText?.slice(0, 200));

if (synced) {
  console.log('✅ Alice 편집 → Bob 실시간 동기화 확인');
} else {
  console.error('❌ Bob 화면에 Alice 편집 내용이 동기화되지 않음');
  process.exitCode = 1;
}

// Bob도 편집 → Alice 동기화 확인
console.log('\n=== Bob: 텍스트 블록 편집 ===');
await setTextBlock(B.page, 'Bob이 보낸 내용');
await B.page.waitForTimeout(3000);

const aText = await A.page.evaluate(() =>
  Array.from(document.querySelectorAll('[class*="prose"]'))
    .map(el => el.textContent?.slice(0, 80))
);
const aliceHasBob = aText.some(t => t?.includes('Bob이 보낸 내용'));
console.log('Alice 블록들:', aText);

if (aliceHasBob) {
  console.log('✅ Bob 편집 → Alice 실시간 동기화 확인');
} else {
  console.error('❌ Alice 화면에 Bob 편집 내용이 동기화되지 않음');
  process.exitCode = 1;
}

await screenshot(A.page, 'sync-alice.png');
await screenshot(B.page, 'sync-bob.png');
await A.browser.close();
await B.browser.close();
console.log('\n=== 실시간 동기화 테스트 완료 ===');
