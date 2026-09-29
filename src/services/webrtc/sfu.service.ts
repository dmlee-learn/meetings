import { createWorker } from 'mediasoup';
import type { Worker } from 'mediasoup/node/lib/WorkerTypes';
import type { Router } from 'mediasoup/node/lib/RouterTypes';
import type { WebRtcTransport } from 'mediasoup/node/lib/WebRtcTransportTypes';
import type { Producer } from 'mediasoup/node/lib/ProducerTypes';

/**
 * SfuService는 방(Room) 단위로 mediasoup의 Worker, Router, Transport, Producer, Consumer를 관리합니다.
 *
 * mediasoup v3 구조:
 * - Worker: 미디어 처리를 담당하는 별도 프로세스 (방당 1개 또는 공유)
 * - Router: 프로듀서를 컨슈머로 라우팅 (방당 1개)
 * - WebRtcTransport: 클라이언트와 서버 간 미디어/Data 채널 전송 (사용자별)
 * - Producer: 클라이언트가 방에 송신하는 미디어 (마이크/카메라)
 * - Consumer: 클라이언트가 다른 사용자의 미디어를 수신
 */
export class SfuService {
  private worker: any;
  private workerReady: Promise<void> | null = null;

  // roomId -> Router
  private routers: Map<string, Router> = new Map();
  // transportId -> WebRtcTransport
  private transports: Map<string, WebRtcTransport> = new Map();
  // roomId -> producerId -> Producer
  private producers: Map<string, Map<string, Producer>> = new Map();

  private newProducerListeners: Map<string, Map<string, (producer: Producer) => void>> = new Map();

  constructor() {
    this.workerReady = this.initWorker().catch((e) => {
      console.error('[SfuService] Worker 초기화 실패:', e);
      throw e;
    });
  }

  private async initWorker(): Promise<void> {
    const worker = await createWorker();
    this.worker = worker;
    console.log(`[SfuService] mediasoup Worker PID ${worker.pid}가 시작되었습니다.`);
  }

  private async ensureWorkerReady(): Promise<void> {
    if (!this.workerReady) throw new Error('Worker가 초기화되지 않았습니다.');
    await this.workerReady;
  }

  /**
   * 방 초기화: 미디어 코덱을 지정해 Router를 생성합니다.
   */
  async initRoom(roomId: string): Promise<void> {
    if (this.routers.has(roomId)) return;
    await this.ensureWorkerReady();

    const router = await this.worker.createRouter({
      mediaCodecs: [
        { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1
          }
        },
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-id': '42e01f',
            'level-asymmetry-allowed': 1
          }
        }
      ]
    });

    this.routers.set(roomId, router);
    this.producers.set(roomId, new Map());

    router.on('@close', () => {
      this.routers.delete(roomId);
      this.producers.delete(roomId);
    });

    console.log(`[SfuService] 방 ${roomId}의 Router가 생성되었습니다.`);
  }

  /**
   * 클라이언트용 WebRtcTransport를 생성하고 IC/DTLS 파라미터를 반환합니다.
   */
  async createTransport(roomId: string, appData?: Record<string, any>): Promise<any> {
    await this.ensureWorkerReady();
    const router = this.routers.get(roomId);
    if (!router) {
      await this.initRoom(roomId);
    }
    const r = this.routers.get(roomId)!;

    const transport = await r.createWebRtcTransport({
      listenIps: ['127.0.0.1'],
      // 클라이언트가 서버의 실제 IP(또는 공인 IP)로 STUN을 대신 사용하도록 설정
      initialAvailableOutgoingBitrate: 1_000_000,
      appData: appData || {}
    });

    this.transports.set(transport.id, transport);

    transport.on('@close', () => {
      this.transports.delete(transport.id);
    });

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters,
    };
  }

  /**
   * 클라이언트가 전송한 DTLS 파라미터로 Transport를 연결(DTLS handshake)합니다.
   */
  async connectTransport(transportId: string, dtlsParameters: any): Promise<void> {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId}를 찾을 수 없습니다.`);
    await transport.connect({ dtlsParameters });
  }

  /**
   * 방의 Router RTP 기능을 반환합니다.
   */
  getRtpCapabilities(roomId: string): any {
    const router = this.routers.get(roomId);
    if (!router) {
      throw new Error(`방 ${roomId}의 Router가 초기화되지 않았습니다.`);
    }
    return router.rtpCapabilities;
  }

  /**
   * 프로듀서(미디어 송신)를 생성합니다.
   */
  async handleProducer(
    roomId: string,
    transportId: string,
    kind: 'audio' | 'video',
    rtpParameters: any
  ): Promise<string> {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId}를 찾을 수 없습니다.`);

    const producer = await transport.produce({
      kind,
      rtpParameters,
      paused: false
    });

    const producerMap = this.producers.get(roomId)!;
    producerMap.set(producer.id, producer);

    producer.on('@close', () => {
      producerMap.delete(producer.id);
    });

    // 새 프로듀서 생성 이벤트를 방 리스너로 전달 (모든 클라이언트)
    const listenerMap = this.newProducerListeners.get(roomId);
    if (listenerMap) {
      for (const listener of listenerMap.values()) {
        try {
          listener(producer);
        } catch (e) {
          console.error('[SfuService] 프로듀서 이벤트 전달 실패:', e);
        }
      }
    }

    console.log(`[SfuService] 방 ${roomId}에 프로듀서(${kind}, ${producer.id}) 추가됨.`);
    return producer.id;
  }

  /**
   * 새 프로듀서 이벤트 리스너를 등록합니다 (클라이언트별).
   */
  onNewProducer(clientId: string, roomId: string, listener: (producer: Producer) => void): void {
    if (!this.newProducerListeners.has(roomId)) {
      this.newProducerListeners.set(roomId, new Map());
    }
    this.newProducerListeners.get(roomId)!.set(clientId, listener);
  }

  /**
   * 방에 있는 프로듀서 목록을 반환합니다.
   */
  listProducers(roomId: string): { producerId: string; kind: string }[] {
    const producerMap = this.producers.get(roomId);
    if (!producerMap) return [];
    return Array.from(producerMap.values()).map((p) => ({
      producerId: p.id,
      kind: p.kind
    }));
  }

  /**
   * 프로듀서 이벤트 리스너를 제거합니다.
   */
  offNewProducer(clientId: string, roomId: string): void {
    this.newProducerListeners.get(roomId)?.delete(clientId);
  }

  /**
   * 다른 사용자의 프로듀서를 특정 Transport로 컨슈밍합니다.
   */
  async handleConsumer(
    roomId: string,
    targetTransportId: string,
    producerId: string,
    paused = false
  ): Promise<any> {
    const producerMap = this.producers.get(roomId);
    const producer = producerMap?.get(producerId);
    if (!producer) throw new Error(`프로듀서 ${producerId}를 찾을 수 없습니다.`);

    const targetTransport = this.transports.get(targetTransportId);
    if (!targetTransport) throw new Error(`Target Transport ${targetTransportId}를 찾을 수 없습니다.`);

    const consumer = await targetTransport.consume({
      producerId,
      rtpCapabilities: this.routers.get(roomId)!.rtpCapabilities,
      paused,
    });

    return {
      id: consumer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  /**
   * 프로듀서를 폐기합니다.
   */
  async closeProducer(roomId: string, producerId: string): Promise<void> {
    const producerMap = this.producers.get(roomId);
    const producer = producerMap?.get(producerId);
    if (producer) {
      producer.close();
      producerMap!.delete(producerId);
    }
  }

  /**
   * 방 정리: Router와 관련된 모든 Transport를 닫습니다.
   */
  async closeRoom(roomId: string): Promise<void> {
    const router = this.routers.get(roomId);
    if (router) {
      // 모든 프로듀서 제거
      const producerMap = this.producers.get(roomId);
      if (producerMap) {
        for (const p of producerMap.values()) p.close();
      }
      // 이 방의 Transport를 닫기 (transport는 roomId와 직접 매핑이 없으므로 전체 순회)
      router.close();
      this.routers.delete(roomId);
      this.producers.delete(roomId);
      this.newProducerListeners.delete(roomId);
    }
  }

  /**
   * 워크러 종료
   */
  async close(): Promise<void> {
    for (const roomId of this.routers.keys()) {
      await this.closeRoom(roomId);
    }
    if (this.worker) {
      this.worker.close();
    }
    console.log('[SfuService] SFU 종료됨.');
  }
}
