import { Request, Response } from 'express';
import { RoomService } from '../services/core.service';
import { asyncHandler, AppError } from '../services/error.service';

/**
 * RoomController는 방 생성 및 참여 요청을 처리합니다.
 */
export class RoomController {
  constructor(private roomService: RoomService) {}

  /**
   * 새로운 방을 생성합니다.
   */
  createRoom = asyncHandler(async (req: any, res: Response) => {
    // req.user에서 userId 추출 (auth middleware가 설정)
    const userId = req.user.userId;
    if (!userId) {
      throw new AppError(401, '인증된 사용자만 방을 생성할 수 있습니다.');
    }

    // ownerId를 명시적으로 설정합니다.
    const room = await this.roomService.createRoom({
      name: req.body.name || '무제 방',
      description: req.body.description || '',
      password: req.body.password, // 방 비밀번호 (선택)
      ownerId: userId
    });
    
    res.status(201).json({
      status: 'success',
      data: room
    });
  });

  /**
   * 방 정보를 조회합니다.
   */
  getRoom = asyncHandler(async (req: Request, res: Response) => {
    const room = await this.roomService.getRoomById(req.params.id);
    if (!room) {
      throw new AppError(404, '방을 찾을 수 없습니다.');
    }
    
    res.status(200).json({
      status: 'success',
      data: room
    });
  });

  /**
   * 방 목록을 조회합니다.
   */
  listRooms = asyncHandler(async (req: Request, res: Response) => {
    const rooms = await this.roomService.listRooms();
    
    res.status(200).json({
      status: 'success',
      data: rooms
    });
  });

  /**
   * 방에 참여합니다.
   */
  joinRoom = asyncHandler(async (req: any, res: Response) => {
    const userId = req.user.userId;
    if (!userId) {
      throw new AppError(401, '인증된 사용자만 방에 참여할 수 있습니다.');
    }

    const room = await this.roomService.joinRoom(req.params.id, userId, req.body.password);
    if (!room) {
      throw new AppError(404, '방을 찾을 수 없습니다.');
    }
    
    res.status(200).json({
      status: 'success',
      data: room
    });
  });

  /**
   * 방에서 나갑니다. (DB의 참여자 목록에서 제거)
   */
  leaveRoom = asyncHandler(async (req: any, res: Response) => {
    const userId = req.user.userId;
    if (!userId) {
      throw new AppError(401, '인증된 사용자만 방에서 나갈 수 있습니다.');
    }

    const room = await this.roomService.leaveRoom(req.params.id, userId);
    
    // 방이 삭제된 경우 (마지막 참여자가 나간 경우) 204 No Content 반환
    if (!room) {
      res.status(204).send();
      return;
    }

    res.status(200).json({
      status: 'success',
      data: room
    });
  });

  /**
   * 방을 삭제합니다.
   */
  deleteRoom = asyncHandler(async (req: any, res: Response) => {
    const room = await this.roomService.deleteRoom(req.params.id);
    if (!room) {
      throw new AppError(404, '방을 찾을 수 없습니다.');
    }
    
    res.status(200).json({
      status: 'success',
      data: room
    });
  });
}
