import mongoose from 'mongoose';

const outreachSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      index: true
    },
    direction: {
      type: String,
      enum: ['sent', 'received'],
      required: true
    },
    kind: {
      type: String,
      enum: ['initial', 'followup', 'reply'],
      required: true
    },
    channel: {
      type: String,
      enum: ['email', 'linkedin', 'whatsapp', 'phone', 'in_person', 'other'],
      required: true
    },
    messageSummary: {
      type: String,
      required: true,
      trim: true
    },
    messageBody: {
      type: String,
      default: ''
    },
    overrideReason: {
      type: String,
      default: null
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

outreachSchema.index({ contactId: 1, sentAt: -1 });

export const Outreach = mongoose.model('Outreach', outreachSchema);
