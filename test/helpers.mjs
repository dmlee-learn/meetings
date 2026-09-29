/**
 * Playwright 공통 헬퍼
 * - 로그인, 방 선택, 문서 열기, 블록 포커싱 등 공통 동작을 재사용
 * - TEST_HOST, PORT, FRONTEND_PORT: .env에서 읽어옴
 */
import { readFileSync } from 'fs';
import { join } from 'path';

// ── .env에서 TEST_HOST 읽어오기 ──
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env');
    const content = readFileSync(envPath, 'utf-8');
    const vars = {};
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) vars[m[1]] = m[2].trim();
    }
    return vars;
  } catch {
    return {};
  }
}

const env = loadEnv();
const TEST_HOST = env.TEST_HOST || 'http://localhost';
const PORT = env.PORT || '3000';
const FRONTEND_PORT = env.FRONTEND_PORT || '3002';
const BASE_URL = `${TEST_HOST}:${FRONTEND_PORT}`;
const API_URL = `${TEST_HOST}:${PORT}/api`;

/** 브라우저 + 컨텍스트 + 페이지 생성 후 로그인까지 완료 */
export async function loginAs(email = 'alice@example.com', password = 'password123') {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.locator('input[type="email"]').pressSequentially(email, { delay: 20 });
  await page.locator('input[type="password"]').pressSequentially(password, { delay: 20 });
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  return { browser, context, page };
}

/** 방 목록에서 지정된 방 이름 클릭 */
export async function selectRoom(page, roomName = '팀 회의룸') {
  const roomBtn = page.locator(`text=${roomName}`).first();
  await roomBtn.waitFor({ timeout: 10000 });
  await roomBtn.click();
  await page.waitForTimeout(1000);
}

/** 문서 패널 열기 (header의 "문서" 토글 또는 "공동 문서" 버튼) */
export async function openDocument(page) {
  const jointDocBtn = page.locator('button:has-text("공동 문서")');
  if (await jointDocBtn.count() > 0) {
    await jointDocBtn.click();
  } else {
    const docToggle = page.locator('header >> text=문서').first();
    await docToggle.click();
  }
  await page.waitForTimeout(1000);
}

/** 첫 텍스트 블록을 편집 모드로 열고 textarea 반환 */
export async function focusTextBlock(page) {
  const prose = page.locator('[class*="prose"]').first();
  await prose.waitFor({ timeout: 10000 });
  await prose.click();
  await page.waitForTimeout(500);
  const ta = page.locator('textarea').first();
  await ta.waitFor({ timeout: 5000 });
  await ta.click();
  return ta;
}

/** textarea에서 기존 내용 지우고 새 내용 입력 */
export async function setTextBlock(page, text) {
  const ta = await focusTextBlock(page);
  await ta.press('Control+A');
  await ta.press('Delete');
  await ta.pressSequentially(text, { delay: 15 });
  return ta;
}

/** 방 입장 → 문서 열기까지 한 번에 (loginAs 후 호출) */
export async function enterRoom(page, roomName = '팀 회의룸') {
  await selectRoom(page, roomName);
  await openDocument(page);
}

export { TEST_HOST, PORT, FRONTEND_PORT, BASE_URL, API_URL };
