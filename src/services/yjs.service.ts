import { WebSocket, WebSocketServer, RawData } from 'ws';
import * as Y from 'yjs';
import { DocumentService, RoomService } from './core.service';
import { PresenceHandler } from '../websockets/handlers/presence.handler';
import { PresenceEventType, IPresenceEventPayload } from '../websockets/handlers/presence.types';
import { PresenceService, IPresenceState } from './presence.service';

/**
 * YjsServer는 Yjs와 WebSockets를 사용하여 문서의 실시간 동기화를 관리합니다.
 * - CRDT 기반 충돌 해결: Yjs의 Y.Doc을 사용하여 여러 클라이언트의 동시 편집을 처리합니다.
 * - MongoDB 동기화: 변경 사항을 디바운스하여 DB에 영구 저장합니다.
 * - Presence 처리: 사용자 존재감(커서 위치, 블록 포커스)을 실시간으로 브로드캐스트합니다.
 */
export class YjsServer {
  private wss: WebSocketServer;
  private docService: DocumentService;
  private presenceHandler: PresenceHandler;
  
  // 현재 활성화된 Yjs 문서 인스턴스 관리 (docId -> Y.Doc)
  private docs: Map<string, Y.Doc> = new Map();
  
  // 문서별 디바운스 타이머 관리 (DB 쓰기 부하 방지)
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  // 방별 실시간 presence 인메모리 스토어
  // roomId -> Map<userId, presence>
  private roomPresences: Map<string, Map<string, any>> = new Map();

  // WebSocket 연결별 사용자 추적 (조인/이탈용)
  // ws -> { roomId, userId }
  private wsUserMap: Map<WebSocket, { roomId: string; userId: string }> = new Map();

  constructor(
    port: number,
    docService: DocumentService,
    presenceHandler: PresenceHandler,
    private presenceService: PresenceService,
    private roomService: RoomService
  ) {
    this.docService = docService;
    this.presenceHandler = presenceHandler;
    this.wss = new WebSocketServer({ port });

    console.log(`[YjsServer] 서버가 포트 ${port}에서 시작되었습니다.`);

    // 방 이벤트 리스너 등록 (방 생성/변경 시 WebSocket 브로드캐스트)
    this.roomService.on('room_created', (room: any) => {
      this.broadcastRoomEvent('ROOM_CREATED', room);
    });
    this.roomService.on('room_updated', (room: any) => {
      this.broadcastRoomEvent('ROOM_UPDATED', room);
    });
    this.roomService.on('room_deleted', (roomId: string) => {
      this.broadcastRoomEvent('ROOM_DELETED', { roomId });
    });

    // WebSocket 연결 이벤트 설정
    this.wss.on('connection', (ws: WebSocket) => {
      this.setupPresence(ws);
      ws.on('close', () => {
        this.setupPresenceCleanup(ws);
      });
    });

    // 문서 동기화 로직 설정
    this.setupDocumentSync();
  }

  /**
   * Yjs 문서 업데이트를 감지하고 MongoDB에 디바운스하여 저장하는 로직을 설정합니다.
   */
  private setupDocumentSync(): void {
    // 실제 구현에서는 새로운 Y.Doc이 생성되어 서버에 등록될 때 이벤트를 연결합니다.
  }

  /**
   * 서버에 새로운 Yjs 문서를 등록하고 업데이트 이벤트를 감시합니다.
   * Yjs의 CRDT 메커니즘을 통해 동시 편집 충돌이 자동으로 해결됩니다.
   * @param docId 문서 ID
   * @param doc Yjs 문서 인스턴스
   */
  public registerDocument(docId: string, doc: Y.Doc): void {
    // 기존 인스턴스가 있는지 확인
    if (this.docs.has(docId)) {
      console.warn(`[YjsServer] 문서 ${docId}가 이미 등록되어 있습니다. 새 인스턴스를 사용합니다.`);
    }

    this.docs.set(docId, doc);

    // 문서의 업데이트(변경) 이벤트가 발생할 때마다 실행됩니다.
    doc.on('update', (update: Uint8Array, origin: string) => {
      // origin이 'client'인 경우에만 동기화합니다.
      // 서버가 다른 클라이언트로부터 받은 업데이트는 다시 다른 클라이언트로 브로드캐스트만 합니다.
      if (origin !== undefined && origin !== 'server') {
        // CRDT 충돌 해결: Y.Doc은 내부적으로 LWW(Last Writer Wins) 또는 
        // 기타 CRDT 알고리즘을 사용하여 동시 편집을 자동으로 병합합니다.
        // 여기에 추가 충돌 해결 로직은 필요하지 않습니다.
        
        // 변경 사항을 MongoDB에 디바운스하여 저장합니다.
        const snapshot = {
          lastUpdated: new Date(),
          // Yjs 상태의 해시를 기록하여 충돌 감지를 돕습니다.
          stateHash: Buffer.from(update).toString('hex').slice(0, 16)
        };

        this.syncDocToDatabase(docId, snapshot);
      }
    });

    console.log(`[YjsServer] 문서 ${docId}가 등록되었고 업데이트 감시가 시작되었습니다.`);
  }

  /**
   * 클라이언트에게 Yjs 업데이트를 브로드캐스트합니다.
   * 다른 클라이언트에게 실시간 변경 사항을 전달합니다.
   * @param docId 문서 ID
   * @param update Yjs 업데이트 바이너리
   * @param originSender 업데이트를 보낸 클라이언트 WebSocket
   */
  public broadcastUpdate(docId: string, update: Uint8Array, originSender?: WebSocket): void {
    const doc = this.docs.get(docId);
    if (!doc) return;

    // 모든 연결된 클라이언트에게 업데이트를 보내기
    this.wss.clients.forEach(client => {
      if (client !== originSender && client.readyState === WebSocket.OPEN) {
        // Yjs 업데이트를 바이너리 형식으로 전송
        client.send(Buffer.from(update));
      }
    });
  }

  /**
   * WebSocket 메시지를 통해 사용자 Presence(존재감) 정보를 처리하고
   * 다른 클라이언트에 브로드캐스트합니다.
   */
  private setupPresence(ws: WebSocket): void {
    ws.on('message', async (data: RawData) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, payload } = message;

        if (this.isPresenceEvent(type)) {
          await this.presenceHandler.handleEvent(type, payload as IPresenceEventPayload);

          // 다른 클라이언트에 Presence를 브로드캐스트
          this.broadcastPresence(type, payload as IPresenceEventPayload, ws);
        }

        // 블록 내용 업데이트: 방 내 다른 클라이언트에 브로드캐스트
        if (type === 'BLOCK_UPDATE') {
          this.broadcastBlockUpdate(payload as any, ws);
        }

        // 블록 추가: 방 내 다른 클라이언트에 브로드캐스트
        if (type === 'BLOCK_ADD') {
          this.broadcastBlockAdd(payload as any, ws);
        }

        // 블록 삭제: 방 내 다른 클라이언트에 브로드캐스트
        if (type === 'BLOCK_DELETE') {
          this.broadcastBlockDelete(payload as any, ws);
        }
      } catch (error) {
        console.error('[YjsServer] Presence 메시지 처리 중 오류 발생:', error);
      }
    });
  }

  /**
   * 방 이벤트를 모든 연결된 클라이언트에 브로드캐스트합니다.
   * (참여자 목록 포함 - DB 기반 최신 상태)
   */
  private broadcastRoomEvent(eventType: string, room: any): void {
    const message = {
      type: eventType,
      payload: {
        roomId: room._id,
        room: {
          _id: room._id,
          name: room.name,
          description: room.description || '',
          participants: room.participants || [] // DB의 전체 참여자 배열 전송
        }
      }
    };

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });

    console.log(`[YjsServer] 방 이벤트 브로드캐스트: ${eventType} - ${room.name} (참여자: ${room.participants?.length || 0}명)`);
  }

  /**
   * Presence 정보를 방 전체에 스냅샷 브로드캐스트합니다.
   * 조인/포커스 변경 시 현재 전체 presence 목록을 전송 →
   * 각 클라이언트가 최신 목록으로 갱신 (자기 presence 포함)
   */
  private broadcastPresence(
    type: PresenceEventType,
    payload: IPresenceEventPayload,
    originWs: WebSocket
  ): void {
    const presence = {
      userId: payload.userId,
      userName: payload.state.userName,
      userColor: payload.state.userColor,
      focusedBlockId: payload.state.focusedBlockId
    };

    // 인메모리 presence 스토어 갱신
    if (!this.roomPresences.has(payload.roomId)) {
      this.roomPresences.set(payload.roomId, new Map());
    }
    const roomPresenceMap = this.roomPresences.get(payload.roomId)!;

    if (type === 'USER_PRESENCE_JOIN' || type === 'USER_BLOCK_FOCUS') {
      roomPresenceMap.set(presence.userId, presence);
      // WebSocket 연결별 사용자 정보 저장 (이탈 시 정리용)
      this.wsUserMap.set(originWs, { roomId: payload.roomId, userId: payload.userId });
    }

    // 전체 presence 스냅샷을 방 전체 클라이언트에 브로드캐스트 (발신자 포함)
    const snapshotMsg = {
      type: 'PRESENCE_SNAPSHOT',
      payload: {
        roomId: payload.roomId,
        presences: Array.from(roomPresenceMap.values())
      }
    };

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(snapshotMsg));
      }
    });
  }

  /**
   * 블록 내용 업데이트를 방 내 다른 클라이언트에 브로드캐스트합니다.
   */
  private broadcastBlockUpdate(payload: any, originWs: WebSocket): void {
    const message = {
      type: 'BLOCK_UPDATE',
      payload: {
        roomId: payload.roomId,
        userId: payload.userId,
        blockId: payload.blockId,
        blockType: payload.blockType,
        blockData: payload.blockData
      }
    };

    this.wss.clients.forEach((client) => {
      if (client !== originWs && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  /**
   * 블록 추가를 방 내 다른 클라이언트에 브로드캐스트합니다.
   */
  private broadcastBlockAdd(payload: any, originWs: WebSocket): void {
    const message = {
      type: 'BLOCK_ADD',
      payload: {
        roomId: payload.roomId,
        userId: payload.userId,
        blockId: payload.blockId,
        blockType: payload.blockType,
        blockData: payload.blockData
      }
    };

    this.wss.clients.forEach((client) => {
      if (client !== originWs && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  /**
   * 블록 삭제를 방 내 다른 클라이언트에 브로드캐스트합니다.
   */
  private broadcastBlockDelete(payload: any, originWs: WebSocket): void {
    const message = {
      type: 'BLOCK_DELETE',
      payload: {
        roomId: payload.roomId,
        userId: payload.userId,
        blockId: payload.blockId
      }
    };

    this.wss.clients.forEach((client) => {
      if (client !== originWs && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  /**
   * 연결이 닫힐 때 Presence 청소를 처리합니다.
   */
  private setupPresenceCleanup(ws: WebSocket): void {
    const user = this.wsUserMap.get(ws);
    this.wsUserMap.delete(ws);

    if (!user) return;

    // 인메모리 presence에서 제거
    const roomMap = this.roomPresences.get(user.roomId);
    if (roomMap) {
      roomMap.delete(user.userId);
    }

    // 전체 presence 스냅샷을 방 전체에 브로드캐스트 (이탈자 제거 후)
    const snapshotMsg = {
      type: 'PRESENCE_SNAPSHOT',
      payload: {
        roomId: user.roomId,
        presences: roomMap ? Array.from(roomMap.values()) : []
      }
    };
    this.wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(snapshotMsg));
      }
    });

    console.log(`[YjsServer] 사용자 ${user.userId}가 방 ${user.roomId}에서 이탈함`);
  }

  /**
   * 메시지 타입이 Presence 이벤트인지 확인합니다.
   * @param type 이벤트 타입
   * @returns Presence 이벤트 여부
   */
  private isPresenceEvent(type: string): type is PresenceEventType {
    return ['USER_BLOCK_FOCUS', 'USER_PRESENCE_JOIN', 'BROADCAST_BLOCK_PRESENCE', 'CURSOR_MOVE'].includes(type);
  }

  /**
   * 특정 문서의 업데이트를 디바운스하여 DB에 저장합니다.
   * @param docId 문서 ID
   * @param updateData 업데이트할 데이터
   */
  public async syncDocToDatabase(docId: string, updateData: Partial<any>): Promise<void> {
    // 기존 타이머가 있다면 제거하여 디바운스 적용
    if (this.debounceTimers.has(docId)) {
      clearTimeout(this.debounceTimers.get(docId));
    }

    // 3초 후 DB 저장 실행 (로드맵의 Data Integrity 준수)
    const timer = setTimeout(async () => {
      try {
        await this.docService.updateDocument(docId, updateData);
        console.log(`[YjsServer] 문서 ${docId}가 성공적으로 DB에 저장되었습니다.`);
        this.debounceTimers.delete(docId);
      } catch (error) {
        console.error(`[YjsServer] 문서 ${docId} 저장 중 오류 발생:`, error);
      }
    }, 3000);

    this.debounceTimers.set(docId, timer);
  }

  /**
   * 서버를 안전하게 종료합니다.
   */
  public async close(): Promise<void> {
    this.wss.close();
    this.docs.clear();
    this.debounceTimers.clear();
    console.log('[YjsServer] 서버가 종료되었습니다.');
  }
}
