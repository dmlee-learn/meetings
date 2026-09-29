import { Request, Response, NextFunction } from 'express';
import { AppError } from '../services/error.service';

/**
 * 전역 에러 처리 미들웨어.
 * 모든 API 라우트에서 발생한 에러를 최종적으로 포착하여
 * 일관된 JSON 형식의 에러 응답을 반환합니다.
 */
export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // 중복 응답 방지
  if (res.headersSent) {
    return next(err);
  }

  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  // AppError가 아닌 경우를 처리 (예: Mongoose, Express 내부 에러)
  if (!(err instanceof AppError)) {
    // Mongoose 캐스캐이드 에러
    if (err.name === 'CastError') {
      const castError = err as any;
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: `잘못된 ID 형식입니다: ${castError.value}`
        }
      });
    }

    // Mongoose 검증 에러
    if (err.name === 'ValidationError') {
      const validationError = err as any;
      const messages = Object.values(validationError.errors || {}).map((e: any) => e.message);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: messages.join(', ')
        }
      });
    }

    // JSON 파싱 에러
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'JSON 형식이 올바르지 않습니다.'
        }
      });
    }

    // 알 수 없는 서버 에러
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' ? '서버 내부 오류가 발생했습니다.' : err.message
      }
    });
  }

  // AppError인 경우: 상태 코드와 메시지를 그대로 사용
  return res.status(err.statusCode).json({
    success: false,
    error: {
      code: err.code || 'ERROR',
      message: err.message
    }
  });
};
