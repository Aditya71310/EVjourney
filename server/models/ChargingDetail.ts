import mongoose, { Schema, Document, Types } from 'mongoose';

export type ConnectorType =
  | 'CCS2'
  | 'AC Type 2'
  | 'CHAdeMO'
  | 'AC Type 1'
  | 'Tesla'
  | 'Other';

export interface IChargingDetail extends Document {
  eventId: Types.ObjectId;
  chargerName: string;
  network: string;
  connectorType: ConnectorType;
  chargingType: 'AC' | 'DC';
  startSOC: number;
  endSOC: number;
  energyKwh: number;
  durationMinutes: number;
  cost: number;
  rating: number;
  review: string;
}

const ChargingDetailSchema = new Schema<IChargingDetail>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'TimelineEvent',
      required: true,
      unique: true,
      index: true,
    },
    chargerName: { type: String, required: true, trim: true },
    network: { type: String, default: 'Independent', trim: true },
    connectorType: {
      type: String,
      enum: ['CCS2', 'AC Type 2', 'CHAdeMO', 'AC Type 1', 'Tesla', 'Other'],
      default: 'CCS2',
    },
    chargingType: { type: String, enum: ['AC', 'DC'], default: 'DC' },
    startSOC: { type: Number, required: true, min: 0, max: 100 },
    endSOC: { type: Number, required: true, min: 0, max: 100 },
    energyKwh: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, default: 30, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    review: { type: String, default: '', maxlength: 800 },
  },
  { timestamps: true }
);

export const ChargingDetailModel =
  mongoose.models.ChargingDetail ||
  mongoose.model<IChargingDetail>('ChargingDetail', ChargingDetailSchema);
