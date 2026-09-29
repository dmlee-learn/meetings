import { Schema, model, models, Document as MongooseDocument } from 'mongoose';

export interface ITranscript {
  _id?: string;
  documentId: string; // Reference to Document
  roomId: string; // Reference to Room
  content: Array<{
    speakerId: string;
    speakerName: string;
    text: string;
    timestamp: Date;
  }>;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TranscriptItemSchema = new Schema({
  speakerId: { type: String, required: true },
  speakerName: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, required: true }
}, { _id: false });

const TranscriptSchema = new Schema<ITranscript>({
  documentId: { type: String, required: true, index: true },
  roomId: { type: String, required: true, index: true },
  content: [TranscriptItemSchema],
  summary: { type: String }
}, { timestamps: true });

export const Transcript = models.Transcript || model<ITranscript>('Transcript', TranscriptSchema);
