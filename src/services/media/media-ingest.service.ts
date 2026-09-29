import { EventEmitter } from 'events';

/**
 * Interface for audio stream packet.
 */
export interface IAudioPacket {
  participantId: string;
  streamId: string;
  data: Buffer;
  timestamp: number;
}

/**
 * MediaIngestService는 SFU(LiveKit)에서 수신한 오디오 스트림을 관리합니다.
 * 또한 VAD(Voice Activity Detection)를 수행하여 불필요한 API 호출을 줄여줍니다.
 */
export class MediaIngestService extends EventEmitter {
  private activeStreams: Map<string, boolean> = new Map();

  /**
   * 오디오 패킷을 수신하고 처리합니다.
   */
  async handleIncomingAudio(packet: IAudioPacket): Promise<void> {
    // 1. VAD 수행 (조용한 구간은 무시)
    if (this.isSilence(packet.data)) {
      return;
    }

    // 2. AI 파이프라인으로 이벤트 발화
    this.emit('audio_data_ready', packet);
    console.log(`[MediaIngestService] 오디오 패킷 수신: ${packet.participantId} (크기: ${packet.data.length} bytes)`);
  }

  /**
   * 기본적인 VAD 구현.
   * 프로덕션 환경에서는 webrtc-vad 또는 specialized library 사용 권장.
   */
  private isSilence(data: Buffer): boolean {
    // 평균 진폭을 계산하여 노이즈 플로어 이하인지 판단
    if (data.length === 0) return true;
    
    let sum = 0;
    for (let i = 0; i < data.length; i += 2) {
      const value = data.readUInt16LE(i);
      sum += Math.abs(value - 0x8000); // DC offset 제거
    }
    
    const averageAmplitude = sum / (data.length / 2);
    const threshold = 50; // 임계값 조정 필요
    return averageAmplitude < threshold;
  }

  /**
   * 사용자가 퇴장하거나 방이 닫힐 때 스트림 리소스를 정리합니다.
   */
  async cleanupStream(streamId: string): Promise<void> {
    this.activeStreams.delete(streamId);
    console.log(`[MediaIngestService] 스트림 정리: ${streamId}`);
    // 실제 구현에서는 WebSocket 연결 종료 또는 버퍼 해제 로직 필요
  }
}
