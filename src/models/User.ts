import { Schema, model, models, Document as MongooseDocument } from 'mongoose';

export interface IProfile {
  name: string;
  avatarUrl?: string;
  color: string;
}

export interface IUser {
  _id?: string;
  email: string;
  username: string;
  passwordHash: string;
  profile: IProfile;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  profile: {
    name: { type: String, required: true },
    avatarUrl: { type: String },
    color: { type: String, default: '#000000' }
  }
}, { timestamps: true });

export const User = models.User || model<IUser>('User', UserSchema);
