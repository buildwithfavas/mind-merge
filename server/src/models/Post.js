import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  url: { type: String, unique: true, required: true },
  title: { type: String, maxlength: 120 },
  addedByUserId: { type: String, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Indexes to optimize feed queries and sorting
postSchema.index({ createdAt: -1 });
postSchema.index({ addedByUserId: 1, createdAt: -1 });

export default mongoose.model('Post', postSchema);
