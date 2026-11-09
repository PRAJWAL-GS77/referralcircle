import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    company: {
      type: String,
      default: '',
      trim: true
    },
    role: {
      type: String,
      default: '',
      trim: true
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true
    },
    linkedinUrl: {
      type: String,
      default: '',
      trim: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    relationshipType: {
      type: String,
      enum: ['alumni', 'former_colleague', 'professor', 'friend_referral', 'cold_contact', 'other'],
      default: 'other'
    },
    relationshipStrength: {
      type: String,
      enum: ['cold', 'warm', 'strong'],
      default: 'cold'
    },
    howWeMet: {
      type: String,
      default: ''
    },
    tags: {
      type: [String],
      default: []
    },
    notes: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: [
        'not_contacted',
        'contacted',
        'awaiting_response',
        'replied',
        'referral_given',
        'declined',
        'no_response'
      ],
      default: 'not_contacted'
    },
    referralOutcome: {
      type: String,
      enum: ['none', 'referral_given', 'interview', 'offer'],
      default: 'none'
    },
    cooldownDays: {
      type: Number,
      default: null
    },
    followUpCount: {
      type: Number,
      default: 0
    },
    lastOutreachAt: {
      type: Date,
      default: null
    },
    lastReplyAt: {
      type: Date,
      default: null
    },
    nextEligibleAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

contactSchema.index({ userId: 1, status: 1 });
contactSchema.index({ userId: 1, nextEligibleAt: 1 });
contactSchema.index(
  { name: 'text', company: 'text', tags: 'text' },
  { weights: { name: 5, company: 3, tags: 2 } }
);

export const Contact = mongoose.model('Contact', contactSchema);
