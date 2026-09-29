import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

/**
 * 인증 미들웨어는 요청 헤더의 JWT 토큰을 검증하여 
 * 유효한 사용자에게만 API 접근 권한을 부여합니다.
 */
export const createAuthMiddleware = (authService: AuthService) => {
  return (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: '인증 헤더가 누락되었거나 형식이 잘못되었습니다. (Bearer <token> 필요)'
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = authService.verifyToken(token);
      // 요청 객체에 사용자 정보를 저장하여 이후 컨트롤러에서 사용할 수 있게 합니다.
      req.user = decoded;
      next();
    } catch (error: any) {
      return res.status(401).json({
        status: 'error',
        message: error.message || '유효하지 않은 토큰입니다.'
      });
    }
  };
};

/**
 * 선택적 인증 미들웨어는 토큰이 없어도 접근은 허용하지만,
 * 유효한 토큰이 있을 경우 사용자 정보를 req.user에 설정합니다.
 */
export const createOptionalAuthMiddleware = (authService: AuthService) => {
  return (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = authService.verifyToken(token);
        req.user = decoded;
      } catch (error) {
        // 토큰이 유효하지 않아도 선택적 인증에서는 무시하고 진행합니다.
        console.warn('[OptionalAuth] 유효하지 않은 토큰을 무시합니다.');
      }
    }
    
    next();
  };
};
