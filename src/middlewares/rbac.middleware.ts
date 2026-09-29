import { Request, Response, NextFunction } from 'express';
import { RoomService } from '../services/core.service';
import { Role } from '../models/Room';
import { AppError } from '../services/error.service';

/**
 * RBAC 미들웨어 생성기.
 * 요청 대상 리소스가 Room 기반인지 Document 기반인지에 따라
 * 적절한 권한 검증을 수행합니다.
 *
 * 사용 예:
 *   const requirePermission = createRbacMiddleware(roomService);
 *   router.post('/rooms/:roomId/join', requirePermission('editor'), handler);
 */
export const createRbacMiddleware = (roomService: RoomService) => {
  return (requiredRole: Role) => {
    return async (req: any, res: Response, next: NextFunction) => {
      try {
        const userId = req.user?.userId;
        if (!userId) {
          throw new AppError(401, '인증된 사용자만 접근할 수 있습니다.');
        }

        // roomId 추출 (routeParams 또는 query)
        const roomId = req.params.roomId || req.params.id;
        if (!roomId) {
          throw new AppError(400, 'roomId가 제공되지 않았습니다.');
        }

        // 권한 검증
        await roomService.assertPermission(roomId, userId, requiredRole);
        next();
      } catch (error) {
        next(error);
      }
    };
  };
};
