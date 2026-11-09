import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    kind: {
      type: String,
      enum: ['initial', 'followup', 'thank_you'],
      required: true
    },
    body: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

templateSchema.index({ userId: 1, kind: 1 });

export const Template = mongoose.model('Template', templateSchema);
