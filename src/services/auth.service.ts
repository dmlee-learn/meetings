import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserService } from './core.service';
import { ENV } from '../config/env';
import { User, IUser } from '../models/User';

/**
 * AuthService는 사용자 인증, 토큰 발급 및 비밀번호 관리를 담당합니다.
 */
export class AuthService {
  constructor(private userService: UserService) {}

  /**
   * 새로운 사용자를 등록합니다.
   * @param userData 사용자 정보
   */
  async register(userData: any): Promise<any> {
    // passwordHash 필드명을 모델에 맞춰 사용합니다.
    const password = userData.password;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Mongoose 모델 인스턴스에서 $, __ prefixed fields를 제거합니다.
    const { $, __, _doc, ...cleanUserData } = userData;
    
    const newUser = await this.userService.createUser({
      ...cleanUserData,
      passwordHash: hashedPassword
    });
    
    // 보안을 위해 비밀번호는 제외하고 반환합니다.
    const { passwordHash, ...userWithoutPassword } = (newUser as any).toObject ? (newUser as any).toObject() : newUser;
    return userWithoutPassword;
  }

  /**
   * 사용자 로그인을 처리하고 JWT 토큰을 발급합니다.
   * @param loginData 이메일 및 비밀번호
   */
  async login(loginData: { email: string; password: string }): Promise<{ user: any; token: string }> {
    const user = await this.userService.getUserByEmail(loginData.email);
    if (!user) {
      throw new Error('존재하지 않는 사용자입니다.');
    }

    const isPasswordValid = await bcrypt.compare(loginData.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }

    const token = this.generateToken(user._id?.toString() || '');
    
    // Mongoose 모델 인스턴스에서 $, __ prefixed fields를 제거합니다.
    const userObj = (user as any).toObject ? (user as any).toObject() : user;
    const { passwordHash, ...userWithoutPassword } = userObj;
    
    return {
      user: userWithoutPassword,
      token
    };
  }

  /**
   * JWT 토큰을 생성합니다.
   * @param userId 사용자 ID
   */
  private generateToken(userId: string): string {
    return jwt.sign({ userId }, ENV.JWT_SECRET, { expiresIn: '1d' });
  }

  /**
   * 토큰을 검증합니다.
   * @param token JWT 토큰
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, ENV.JWT_SECRET);
    } catch (error) {
      throw new Error('유효하지 않은 토큰입니다.');
    }
  }
}
