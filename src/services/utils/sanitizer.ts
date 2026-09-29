/**
 * 데이터 검증 및 정제(Sanitization) 유틸리티.
 * 클라이언트에서 들어오는 데이터에 대한 XSS 및 인젝션 공격을 방지합니다.
 */

/**
 * HTML 특수 문자를 이스케이프하여 XSS 공격을 방지합니다.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 주어진 객체의 모든 문자열 필드를 정제(Sanitize)합니다.
 */
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (typeof value === 'string') {
      sanitized[key] = escapeHtml(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? escapeHtml(item) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * MongoDB 인젝션 및 노코드 필터 operator를 차단하기 위해
 * 사용자가 입력한 문자열 값의 특수한 operator가 포함되어 있는지 검사합니다.
 */
export function sanitizeNoSQLQuery(text: string): string {
  // $ 기호와 . 이 포함된 값은 노코드 인젝션 공격의 가능성
  if (text.includes('$') || text.includes('.')) {
    // 필요 시 로깅 및 차단
    console.warn('[Security] Potentially malicious NoSQL query detected and sanitized.');
    return text.replace(/[\$\.]/g, '');
  }
  return text;
}
