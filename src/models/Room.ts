import { Schema, model, models } from 'mongoose';

/**
 * 방 참여자별 역할(역할 기반 권한 관리, RBAC)
 */
export type Role = 'owner' | 'editor' | 'viewer';

export interface IParticipant {
  userId: string;
  role: Role;
  joinedAt: Date;
}

export interface IRoom {
  _id?: string;
  name: string;
  description?: string;
  passwordHash?: string; // bcrypt로 해시된 방 비밀번호
  hasPassword: boolean; // 비밀번호 설정 여부 (원본 데이터 저장용)
  ownerId: string; // Reference to User
  participants: IParticipant[];
  configuration: {
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
  };
  status: 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>({
  userId: { type: String, required: true },
  role: {
    type: String,
    enum: ['owner', 'editor', 'viewer'],
    default: 'viewer'
  },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const RoomSchema = new Schema<IRoom>({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  passwordHash: { type: String }, // bcrypt 해시 값
  hasPassword: { type: Boolean, default: false },
  ownerId: { type: String, required: true },
  participants: [ParticipantSchema],
  configuration: {
    isVideoEnabled: { type: Boolean, default: true },
    isAudioEnabled: { type: Boolean, default: true }
  },
  status: { type: String, enum: ['active', 'closed'], default: 'active' }
}, { timestamps: true });

export const Room = models.Room || model<IRoom>('Room', RoomSchema);
