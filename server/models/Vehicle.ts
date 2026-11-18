import mongoose, { Schema, Types } from 'mongoose';

export interface IVehicle {
  userId: Types.ObjectId;
  brand: string;
  model: string;
  variant: string;
  batteryCapacity: number;
  colour: string;
  nickname: string;
  photo: string;
  isDefault: boolean;
  createdAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    variant: { type: String, default: '', trim: true },
    batteryCapacity: { type: Number, required: true, min: 5, max: 300 },
    colour: { type: String, default: 'Obsidian Black', trim: true },
    nickname: { type: String, default: '', trim: true },
    photo: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

VehicleSchema.index({ userId: 1, isDefault: -1 });

export const VehicleModel =
  mongoose.models.Vehicle || mongoose.model<IVehicle>('Vehicle', VehicleSchema);
