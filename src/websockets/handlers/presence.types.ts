import { IPresenceState } from '../../services/presence.service';

/**
 * Interface for WebSocket event payloads related to Presence.
 * Follows the specification in developments_docs/guide/protocol-spec.md
 */
export interface IPresenceEventPayload {
  roomId: string;
  userId: string;
  state: IPresenceState;
}

/**
 * Defines the types of presence-related events that can be handled.
 */
export type PresenceEventType =
  | 'USER_BLOCK_FOCUS'
  | 'USER_CELL_FOCUS'
  | 'BROADCAST_BLOCK_PRESENCE'
  | 'CURSOR_MOVE'
  | 'USER_PRESENCE_JOIN'; // 방 참여 시 초기 presence 알림

export interface IPresenceHandler {
  handleEvent(type: PresenceEventType, payload: IPresenceEventPayload): Promise<void>;
}
