import { RoomService, DocumentService, UserService } from './core.service';
import { EventEmitter } from 'events';

export interface IPresenceState {
  userId: string;
  userName: string;
  userColor: string;
  focusedBlockId: string | null;
  cursorPosition?: { x: number; y: number };
}

/**
 * PresenceService는 방(Room) 내부의 실시간 사용자 존재감(Presence)을 관리합니다.
 * 특정 블록에 대한 사용자 포커스 상태와 커서 위치를 저장하고 브로드캐스트 이벤트의 원천이 됩니다.
 */
export class PresenceService extends EventEmitter {
  // roomId -> 각 사용자별 상태 저장소 (roomId -> userId -> state)
  private presenceStates: Map<string, Map<string, IPresenceState>> = new Map();

  constructor(
    private roomService: RoomService,
    private docService: DocumentService
  ) {
    super();
  }

  /**
   * 특정 방의 사용자 존재감 상태를 업데이트합니다.
   */
  async updateUserPresence(roomId: string, userId: string, state: IPresenceState): Promise<void> {
    const room = await this.roomService.getRoomById(roomId);
    if (!room) {
      throw new Error(`방 ${roomId}을(를) 찾을 수 없습니다.`);
    }

    // 사용자가 실제로 해당 방에 참여 중인지 확인합니다.
    const participant = room.participants.find(p => p.userId === userId);
    if (!participant) {
      throw new Error(`사용자 ${userId}은(는) 방 ${roomId}의 참여자가 아닙니다.`);
    }

    // 방별, 사용자별 상태 맵을 갱신합니다.
    if (!this.presenceStates.has(roomId)) {
      this.presenceStates.set(roomId, new Map());
    }
    this.presenceStates.get(roomId)!.set(userId, state);

    // 브로드캐스트를 트리거하기 위해 이벤트를 발화합니다.
    this.emit('presence_updated', {
      roomId,
      userId,
      state
    });

    console.log(`[PresenceService] 사용자 ${state.userName}의 존재감 상태가 방 ${roomId}에서 업데이트되었습니다.`);
  }

  /**
   * 특정 사용자의 현재 존재감 상태를 조회합니다.
   */
  async getUserPresence(roomId: string, userId: string): Promise<IPresenceState | null> {
    const roomStates = this.presenceStates.get(roomId);
    if (!roomStates) return null;
    
    return roomStates.get(userId) || null;
  }

  /**
   * 방이 종료될 때 해당 방의 존재감 데이터를 정리합니다.
   */
  async cleanupRoom(roomId: string): Promise<void> {
    this.presenceStates.delete(roomId);
    this.emit('room_closed', roomId);
    console.log(`[PresenceService] 방 ${roomId}의 존재감 데이터가 정리되었습니다.`);
  }
}
