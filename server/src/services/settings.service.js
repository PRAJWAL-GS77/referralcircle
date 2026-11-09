import { User } from '../models/user.model.js';
import { Contact } from '../models/contact.model.js';
import { AppError } from '../middleware/error.middleware.js';

export const getSettings = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return user.settings;
};

export const updateSettings = async (userId, settingsUpdate) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const oldDefaultCooldown = user.settings.defaultCooldownDays;

  if (settingsUpdate.defaultCooldownDays !== undefined) {
    user.settings.defaultCooldownDays = settingsUpdate.defaultCooldownDays;
  }
  if (settingsUpdate.maxFollowUps !== undefined) {
    user.settings.maxFollowUps = settingsUpdate.maxFollowUps;
  }

  await user.save();

  // If defaultCooldownDays changed, recompute nextEligibleAt for affected contacts
  if (
    settingsUpdate.defaultCooldownDays !== undefined &&
    settingsUpdate.defaultCooldownDays !== oldDefaultCooldown
  ) {
    const newCooldown = settingsUpdate.defaultCooldownDays;
    const affectedContacts = await Contact.find({
      userId,
      cooldownDays: null,
      status: 'awaiting_response',
      lastOutreachAt: { $ne: null }
    });

    for (const contact of affectedContacts) {
      contact.nextEligibleAt = new Date(
        new Date(contact.lastOutreachAt).getTime() + newCooldown * 24 * 60 * 60 * 1000
      );
      await contact.save();
    }
  }

  return user.settings;
};
