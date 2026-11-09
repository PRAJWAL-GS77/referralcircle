import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema(
  {
    defaultCooldownDays: {
      type: Number,
      default: 7,
      min: 1
    },
    maxFollowUps: {
      type: Number,
      default: 5,
      min: 1
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    avatar: {
      type: String,
      default: ''
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    settings: {
      type: userSettingsSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model('User', userSchema);
