import { EventEmitter } from 'events';
import { ENV } from '../../config/env';

/**
 * STTService는 Deepgram 또는 OpenAI(Whisper) API를 사용하여
 * 오디오 데이터를 텍스트로 변환하는 서비스를 제공합니다.
 */
export class STTService {
  private apiKey: string;
  private provider: 'deepgram' | 'openai';

  constructor(provider: 'deepgram' | 'openai' = 'openai') {
    this.provider = provider;
    this.apiKey = provider === 'openai' 
      ? ENV.OPENAI?.API_KEY || '' 
      : process.env.DEEPGRAM_API_KEY || '';
      
    if (!this.apiKey) {
      throw new Error(`STT provider ${provider} API key is missing in environment variables.`);
    }
  }

  /**
   * 오디오 데이터를 수신하고 텍스트로 변환합니다.
   * @param audioData 오디오 바이너리 데이터
   * @returns 변환된 텍스트
   */
  async transcribe(audioData: Buffer): Promise<string> {
    if (this.provider === 'openai') {
      return this.callOpenAIWhisper(audioData);
    }
    // Deepgram 구현은 Deepgram WebSocket/REST API를 사용합니다.
    return this.callDeepgram(audioData);
  }

  /**
   * OpenAI Whisper API를 호출합니다.
   */
  private async callOpenAIWhisper(audioData: Buffer): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioData)]);
    formData.append('file', blob, 'audio.mp3');
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI STT API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.text;
  }

  /**
   * Deepgram API를 호출합니다.
   */
  private async callDeepgram(audioData: Buffer): Promise<string> {
    // Deepgram은 실시간 스트림 처리를 위해 WebSocket을 사용합니다.
    // 여기서는 REST API를 통한 일괄 처리를 예시로 구현합니다.
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/octet-stream',
        'Host': 'api.deepgram.com'
      },
      body: audioData.buffer as ArrayBuffer
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram STT API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.results.channels[0].alternatives[0].transcript;
  }
}
