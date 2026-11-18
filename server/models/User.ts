import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  password: string;
  avatar: string;
  bio: string;
  city: string;
  country: string;
  coverScene: 'sunset' | 'coast' | 'forest';
  theme: 'dark' | 'light' | 'system';
  onboardingCompleted: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 40,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 300 },
    city: { type: String, default: '', trim: true },
    country: { type: String, default: '', trim: true },
    coverScene: {
      type: String,
      enum: ['sunset', 'coast', 'forest'],
      default: 'sunset',
    },
    theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
