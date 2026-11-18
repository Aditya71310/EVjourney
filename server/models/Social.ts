import mongoose, { Schema, Types } from 'mongoose';

export interface IFollow {
  followerId: Types.ObjectId;
  followingId: Types.ObjectId;
  createdAt: Date;
}

const FollowSchema = new Schema<IFollow>(
  {
    followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    followingId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export interface IJourneyLike {
  journeyId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const JourneyLikeSchema = new Schema<IJourneyLike>(
  {
    journeyId: { type: Schema.Types.ObjectId, ref: 'Journey', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
JourneyLikeSchema.index({ journeyId: 1, userId: 1 }, { unique: true });

export interface IJourneySave {
  journeyId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const JourneySaveSchema = new Schema<IJourneySave>(
  {
    journeyId: { type: Schema.Types.ObjectId, ref: 'Journey', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
JourneySaveSchema.index({ journeyId: 1, userId: 1 }, { unique: true });

export interface IJourneyComment {
  journeyId: Types.ObjectId;
  userId: Types.ObjectId;
  parentId?: Types.ObjectId | null;
  text: string;
  createdAt: Date;
}

const JourneyCommentSchema = new Schema<IJourneyComment>(
  {
    journeyId: { type: Schema.Types.ObjectId, ref: 'Journey', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'JourneyComment', default: null },
    text: { type: String, required: true, trim: true, maxlength: 600 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export interface ICommentLike {
  commentId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const CommentLikeSchema = new Schema<ICommentLike>(
  {
    commentId: {
      type: Schema.Types.ObjectId,
      ref: 'JourneyComment',
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
CommentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true });

export const FollowModel =
  mongoose.models.Follow || mongoose.model<IFollow>('Follow', FollowSchema);
export const JourneyLikeModel =
  mongoose.models.JourneyLike ||
  mongoose.model<IJourneyLike>('JourneyLike', JourneyLikeSchema);
export const JourneySaveModel =
  mongoose.models.JourneySave ||
  mongoose.model<IJourneySave>('JourneySave', JourneySaveSchema);
export const JourneyCommentModel =
  mongoose.models.JourneyComment ||
  mongoose.model<IJourneyComment>('JourneyComment', JourneyCommentSchema);
export const CommentLikeModel =
  mongoose.models.CommentLike ||
  mongoose.model<ICommentLike>('CommentLike', CommentLikeSchema);
