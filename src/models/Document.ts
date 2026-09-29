import { Schema, model, models } from 'mongoose';

export interface IBlock {
  id: string;
  type: string;
  updatedAt: Date;
  data: Record<string, any>;
}

export interface IDocument {
  _id?: string;
  title: string;
  roomId: string; // Reference to Room
  ownerId: string; // Reference to User
  blocks: IBlock[];
  createdAt: Date;
  updatedAt: Date;
}

const BlockSchema = new Schema<IBlock>({
  id: { type: String, required: true },
  type: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
  data: { type: Schema.Types.Mixed, required: true }
}, { _id: false });

const DocumentSchema = new Schema<IDocument>({
  title: { type: String, required: true },
  roomId: { type: String, required: true, index: true },
  ownerId: { type: String, required: true },
  blocks: [BlockSchema]
}, { timestamps: true });

// 방(roomId)별로 문서를 빠르게 조회할 수 있도록 인덱스
DocumentSchema.index({ roomId: 1, updatedAt: -1 });

export const Document = models.Document || model<IDocument>('Document', DocumentSchema);
