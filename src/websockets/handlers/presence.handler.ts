import { IPresenceHandler, IPresenceEventPayload, PresenceEventType } from './presence.types';
import { PresenceService } from '../../services/presence.service';

/**
 * PresenceHandler implements the IPresenceHandler interface.
 * It acts as the bridge between raw WebSocket events and the PresenceService.
 */
export class PresenceHandler implements IPresenceHandler {
  constructor(private presenceService: PresenceService) {}

  /**
   * Handles incoming WebSocket events for user presence.
   */
  async handleEvent(type: PresenceEventType, payload: IPresenceEventPayload): Promise<void> {
    const { roomId, userId, state } = payload;

    switch (type) {
      case 'USER_BLOCK_FOCUS':
        // When a user focuses on a block, update their presence state.
        await this.presenceService.updateUserPresence(roomId, userId, state);
        break;

      case 'USER_CELL_FOCUS':
        // 사용자가 스프레드시트 셀에 포커스하면 presence 상태 업데이트
        await this.presenceService.updateUserPresence(roomId, userId, state);
        break;

      case 'USER_PRESENCE_JOIN':
        // 사용자가 방에 참여하면 즉시 presence를 서버에 등록
        // (focusedBlockId가 null이어도 다른 사용자에게 표시됨)
        await this.presenceService.updateUserPresence(roomId, userId, state);
        break;

      case 'CURSOR_MOVE':
        // Cursor movement is high-frequency; in production, we might throttle this 
        // before calling the service to avoid overwhelming the network.
        if (state.cursorPosition) {
          await this.presenceService.updateUserPresence(roomId, userId, state);
        }
        break;

      case 'BROADCAST_BLOCK_PRESENCE':
        // This event is typically sent from the server to clients.
        // The handler can be used to process incoming broadcast signals if needed.
        console.log(`[PresenceHandler] Received broadcast for room ${roomId}`);
        break;

      default:
        console.warn(`[PresenceHandler] Unhandled presence event type: ${type}`);
    }
  }
}
