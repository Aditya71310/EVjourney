import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IJourney extends Document {
  userId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  title: string;
  description: string;
  coverImage: string;
  startDate: Date;
  endDate: Date;
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  durationMinutes: number;
  startSOC: number;
  endSOC: number;
  visibility: 'Private' | 'Followers' | 'Public';
  status: 'Draft' | 'Published';
  createdAt: Date;
}

const JourneySchema = new Schema<IJourney>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: '', maxlength: 2000 },
    coverImage: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startLocation: { type: String, required: true, trim: true },
    endLocation: { type: String, required: true, trim: true },
    distanceKm: { type: Number, default: 0, min: 0 },
    durationMinutes: { type: Number, default: 0, min: 0 },
    startSOC: { type: Number, default: 100, min: 0, max: 100 },
    endSOC: { type: Number, default: 20, min: 0, max: 100 },
    visibility: {
      type: String,
      enum: ['Private', 'Followers', 'Public'],
      default: 'Private',
    },
    status: { type: String, enum: ['Draft', 'Published'], default: 'Published' },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

JourneySchema.index({ userId: 1, startDate: -1 });
JourneySchema.index({ visibility: 1, status: 1 });

export const JourneyModel =
  mongoose.models.Journey || mongoose.model<IJourney>('Journey', JourneySchema);
