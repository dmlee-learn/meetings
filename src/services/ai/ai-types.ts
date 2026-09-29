export interface ITranscriptionResult {
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: number;
}

export interface IMeetingSummary {
  summaryText: string;
  actionItems: string[];
  keyTopics: string[];
}
