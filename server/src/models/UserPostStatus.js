import mongoose from 'mongoose';

const userPostStatusSchema = new mongoose.Schema(
  {
    userId: { type: String, ref: 'User', required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    status: { type: String, enum: ['done'], default: undefined },
    liked: { type: Boolean, default: false },
    commented: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

userPostStatusSchema.index({ userId: 1, postId: 1 }, { unique: true });

export default mongoose.model('UserPostStatus', userPostStatusSchema);
