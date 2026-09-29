import { ENV } from '../../config/env';

/**
 * LLMService는 OpenAI API를 사용하여 텍스트 요약 및 변환 작업을 수행합니다.
 */
export class LLMService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = ENV.OPENAI?.API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenAI API key is missing in environment variables.');
    }
    this.model = 'gpt-4o'; // or gpt-3.5-turbo
  }

  /**
   * 회의록을 받아 요약본을 생성합니다.
   * @param transcripts 화자별로 분리된 텍스트 배열
   */
  async summarizeMeeting(transcripts: string[]): Promise<string> {
    const prompt = `
      당신은 전문적인 회의록 요약 작성가입니다. 
      아래에提供的한 대화 내용을 분석하여 핵심 주제, 논의 내용 및 실행 항목(Action Items)을 포함하는 간결한 마크다운 형식의 요약을 작성해주세요.
      
      대화 내용:
      ${transcripts.join('\n')}
    `;

    const response = await this.callOpenAI(prompt);
    return response;
  }

  /**
   * OpenAI Chat Completion API를 호출합니다.
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that summarizes meetings.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI LLM API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  }
}
