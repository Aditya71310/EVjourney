import mongoose, { Schema, Document, Types } from 'mongoose';

export type TimelineEventType =
  | 'Starting point'
  | 'Charging stop'
  | 'Food stop'
  | 'Hotel'
  | 'Scenic location'
  | 'Coffee stop'
  | 'Photograph'
  | 'Custom event'
  | 'Destination';

export interface ITimelineEvent extends Document {
  journeyId: Types.ObjectId;
  type: TimelineEventType;
  title: string;
  timestamp: Date;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  note: string;
  photos: string[];
  sequenceIndex: number;
}

const TimelineEventSchema = new Schema<ITimelineEvent>(
  {
    journeyId: { type: Schema.Types.ObjectId, ref: 'Journey', required: true, index: true },
    type: {
      type: String,
      enum: [
        'Starting point',
        'Charging stop',
        'Food stop',
        'Hotel',
        'Scenic location',
        'Coffee stop',
        'Photograph',
        'Custom event',
        'Destination',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    timestamp: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    note: { type: String, default: '', maxlength: 1500 },
    photos: { type: [String], default: [] },
    sequenceIndex: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

TimelineEventSchema.index({ journeyId: 1, sequenceIndex: 1 });

export const TimelineEventModel =
  mongoose.models.TimelineEvent ||
  mongoose.model<ITimelineEvent>('TimelineEvent', TimelineEventSchema);
