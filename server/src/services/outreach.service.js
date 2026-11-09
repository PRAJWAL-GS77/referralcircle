import { Outreach } from '../models/outreach.model.js';
import { Contact } from '../models/contact.model.js';
import { AppError } from '../middleware/error.middleware.js';
import {
  evaluateSentOutreachEligibility,
  evaluateReceivedOutreach,
  recomputeContactFromOutreachHistory,
  getEffectiveCooldownDays
} from './cooldown.service.js';

export const listContactOutreach = async (userId, contactId) => {
  const contact = await Contact.findOne({ _id: contactId, userId });
  if (!contact) {
    throw new AppError('Contact not found', 404, 'NOT_FOUND');
  }

  return Outreach.find({ contactId, userId }).sort({ sentAt: -1 }).lean();
};

export const createOutreach = async (userId, contactId, data, userSettings) => {
  const contact = await Contact.findOne({ _id: contactId, userId });
  if (!contact) {
    throw new AppError('Contact not found', 404, 'NOT_FOUND');
  }

  const serverNow = new Date();
  const sentAtDate = data.sentAt ? new Date(data.sentAt) : serverNow;

  // Outreach cannot be logged in the future
  if (sentAtDate.getTime() > serverNow.getTime() + 1000) {
    throw new AppError('Sent date cannot be in the future', 400, 'INVALID_DATE');
  }

  let outreach;

  if (data.direction === 'sent') {
    // Cooldown and max-follow-up checks ALWAYS use real server time, never client-supplied sentAt
    const evalResult = evaluateSentOutreachEligibility({
      contact,
      userSettings,
      override: data.override,
      overrideReason: data.overrideReason,
      now: serverNow
    });

    if (!evalResult.allowed) {
      throw new AppError(
        evalResult.message,
        evalResult.statusCode || 400,
        evalResult.code || 'COOLDOWN_ACTIVE',
        evalResult.details
      );
    }

    outreach = await Outreach.create({
      userId,
      contactId,
      direction: 'sent',
      kind: evalResult.kind,
      channel: data.channel,
      messageSummary: data.messageSummary,
      messageBody: data.messageBody || '',
      overrideReason: evalResult.usedOverride ? data.overrideReason.trim() : null,
      sentAt: sentAtDate
    });

    contact.status = evalResult.status;
    contact.followUpCount = evalResult.followUpCount;

    // Set lastOutreachAt and nextEligibleAt ONLY if sentAt is the latest outreach
    const isLatestOutreach =
      !contact.lastOutreachAt || sentAtDate.getTime() >= new Date(contact.lastOutreachAt).getTime();

    if (isLatestOutreach) {
      contact.lastOutreachAt = sentAtDate;
      const effectiveCooldown = getEffectiveCooldownDays(
        contact.cooldownDays,
        userSettings?.defaultCooldownDays
      );
      contact.nextEligibleAt = new Date(
        sentAtDate.getTime() + effectiveCooldown * 24 * 60 * 60 * 1000
      );
    }

    await contact.save();
  } else {
    // direction === 'received'
    const evalResult = evaluateReceivedOutreach({ sentAt: sentAtDate });

    outreach = await Outreach.create({
      userId,
      contactId,
      direction: 'received',
      kind: data.kind || evalResult.kind,
      channel: data.channel,
      messageSummary: data.messageSummary,
      messageBody: data.messageBody || '',
      sentAt: sentAtDate
    });

    contact.status = evalResult.status;
    contact.followUpCount = 0;
    contact.nextEligibleAt = null;

    const isLatestReply =
      !contact.lastReplyAt || sentAtDate.getTime() >= new Date(contact.lastReplyAt).getTime();
    if (isLatestReply) {
      contact.lastReplyAt = sentAtDate;
    }

    await contact.save();
  }

  return { outreach, contact };
};

export const deleteOutreach = async (userId, outreachId, userSettings) => {
  const outreach = await Outreach.findOneAndDelete({ _id: outreachId, userId });
  if (!outreach) {
    throw new AppError('Outreach record not found', 404, 'NOT_FOUND');
  }

  const contact = await Contact.findOne({ _id: outreach.contactId, userId });
  if (!contact) {
    throw new AppError('Associated contact not found', 404, 'NOT_FOUND');
  }

  const remainingOutreach = await Outreach.find({
    contactId: contact._id,
    userId
  })
    .sort({ sentAt: 1 })
    .lean();

  const effectiveCooldown = getEffectiveCooldownDays(
    contact.cooldownDays,
    userSettings?.defaultCooldownDays
  );

  const recomputedFields = recomputeContactFromOutreachHistory(
    remainingOutreach,
    effectiveCooldown
  );

  Object.assign(contact, recomputedFields);
  await contact.save();

  return {
    message: 'Outreach record deleted and contact recomputed successfully',
    contact
  };
};
