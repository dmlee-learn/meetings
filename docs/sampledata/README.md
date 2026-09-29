# 샘플 데이터 생성

이 폴더에는 서버에 샘플 계정, 방, 문서, 블록을 자동 생성하는 스크립트가 포함됩니다.

## 사용법

```bash
# 기본 (http://localhost:3000/api)
npx tsx docs/sampledata/create-sample-data.ts

# 다른 API URL 지정
npx tsx docs/sampledata/create-sample-data.ts http://my-server:3000/api
```

## 생성 내용

| 항목 | 상세 |
|------|------|
| **사용자** | alice@example.com / password123, bob@example.com / password123 |
| **방** | 팀 회의룸 |
| **문서** | 팀 회의록 - 2026 Q3 |
| **블록** | 텍스트 (회의 아젠다), 마인드맵 (프로젝트 구조), 스프레드시트 (태스크 트래커) |

## 주의사항

- `mongodb-memory-server`를 사용할 경우 서버 재시작 시 데이터가 초기화됩니다.
- 스크립트는 멱등적이지 않으므로 중복 실행 시 "이미 존재" 경고가 표시됩니다.
- `NODE_ENV=production`에서는 실제 MongoDB에 작성되므로 주의하세요.
