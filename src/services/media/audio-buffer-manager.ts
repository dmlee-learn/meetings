import { EventEmitter } from 'events';
import { IAudioPacket } from './media-ingest.service';

/**
 * AudioBufferManager는 오디오 패킷을 버퍼링하고
 * 백프레셔(backpressure)를 관리하는 역할을 담당합니다.
 * 
 * - 오디오 데이터를 일정한 크기의 청크로 분할합니다.
 * - API 호출 주기를 제어하여 비용을 절감합니다.
 * - 버퍼가 가득 차면 가장 오래된 데이터를 버리는 정책을 지원합니다.
 */
export class AudioBufferManager extends EventEmitter {
  // 스트림 ID별 버퍼
  private buffers: Map<string, IAudioPacket[]> = new Map();
  
  // 설정
  private readonly MAX_BUFFER_SIZE: number = 100; // 최대 패킷 수
  private readonly FLUSH_INTERVAL_MS: number = 5000; // 5초마다 플러시
  private readonly MIN_AUDIO_DURATION_MS: number = 1000; // 최소 1초 분량만 API로 전송

  private flushTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
  }

  /**
   * 오디오 패킷을 버퍼에 추가합니다.
   */
  addPacket(packet: IAudioPacket): void {
    const { streamId } = packet;
    
    if (!this.buffers.has(streamId)) {
      this.buffers.set(streamId, []);
    }

    const buffer = this.buffers.get(streamId)!;
    buffer.push(packet);

    // 버퍼 크기가 초과되면 가장 오래된 패킷을 제거
    if (buffer.length > this.MAX_BUFFER_SIZE) {
      const removed = buffer.shift();
      if (removed) {
        console.warn(`[AudioBufferManager] 버퍼 초과: ${removed.participantId}의 패킷 ${removed.timestamp}을(를) 제거합니다.`);
      }
    }

    // 플러시 타이머 시작 (이미 존재하지 않는 경우에만)
    this.ensureFlushTimer(streamId);
  }

  /**
   * 버퍼에 축적된 오디오 패킷을 플러시합니다.
   * STT API로 전송할 준비가 된 청크를 반환합니다.
   */
  async flush(streamId: string): Promise<Buffer | null> {
    const buffer = this.buffers.get(streamId);
    if (!buffer || buffer.length === 0) {
      return null;
    }

    // 총 오디오 길이를 계산 (각 패킷을 20ms로 가정)
    const totalDurationMs = buffer.length * 20;
    if (totalDurationMs < this.MIN_AUDIO_DURATION_MS) {
      // 충분히 긴 오디오가 아니면 버퍼에 유지
      return null;
    }

    // 모든 패킷을 하나의 Buffer로 병합
    const mergedBuffer = Buffer.concat(buffer.map(p => p.data));
    
    // 버퍼 비우기
    this.buffers.set(streamId, []);
    
    // 플러시 이벤트 발화
    this.emit('audio_chunk_ready', {
      streamId,
      durationMs: totalDurationMs,
      packetCount: buffer.length,
      data: mergedBuffer
    });

    return mergedBuffer;
  }

  /**
   * 플러시 타이머를 보장합니다.
   */
  private ensureFlushTimer(streamId: string): void {
    if (this.flushTimers.has(streamId)) return;

    const timer = setInterval(async () => {
      await this.flush(streamId);
    }, this.FLUSH_INTERVAL_MS);

    this.flushTimers.set(streamId, timer);
  }

  /**
   * 특정 스트림에 대한 버퍼를 초기화합니다.
   */
  clearBuffer(streamId: string): void {
    this.buffers.delete(streamId);
    
    if (this.flushTimers.has(streamId)) {
      clearInterval(this.flushTimers.get(streamId));
      this.flushTimers.delete(streamId);
    }
    
    console.log(`[AudioBufferManager] 스트림 ${streamId}의 버퍼가 초기화되었습니다.`);
  }

  /**
   * 특정 스트림의 버퍼 통계 정보를 반환합니다.
   */
  getBufferStats(streamId: string): {
    packetCount: number;
    estimatedDurationMs: number;
    isFull: boolean;
  } {
    const buffer = this.buffers.get(streamId);
    if (!buffer) {
      return { packetCount: 0, estimatedDurationMs: 0, isFull: false };
    }

    return {
      packetCount: buffer.length,
      estimatedDurationMs: buffer.length * 20,
      isFull: buffer.length >= this.MAX_BUFFER_SIZE
    };
  }

  /**
   * 모든 스트림의 버퍼를 정리합니다.
   */
  clearAll(): void {
    for (const streamId of this.buffers.keys()) {
      this.clearBuffer(streamId);
    }
  }
}
