import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler, AppError } from '../services/error.service';

/**
 * AuthController는 사용자 등록 및 로그인 요청을 처리합니다.
 */
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 새로운 사용자를 등록합니다.
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { email, username, password, name } = req.body;
      
      if (!email || !username || !password) {
        throw new AppError(400, '이메일, 사용자 이름, 비밀번호는 필수입니다.');
      }

      const user = await this.authService.register({
        ...req.body,
        profile: {
          name: name || username
        }
      });
      res.status(201).json({
        status: 'success',
        data: user
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.error('Registration error:', error);
      throw new AppError(400, '회원가입 중 오류가 발생했습니다.');
    }
  });

  /**
   * 사용자를 인증하고 토큰을 발급합니다.
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        throw new AppError(400, '이메일과 비밀번호는 필수입니다.');
      }

      const result = await this.authService.login(req.body);
      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(401, '로그인 중 오류가 발생했습니다.');
    }
  });
}
