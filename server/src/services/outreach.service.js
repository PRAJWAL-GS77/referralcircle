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

  const now = new Date();
  const sentAtDate = data.sentAt ? new Date(data.sentAt) : now;

  // Outreach cannot be logged in the future
  if (sentAtDate.getTime() > now.getTime() + 1000) {
    throw new AppError('Sent date cannot be in the future', 400, 'INVALID_DATE');
  }

  let outreach;

  if (data.direction === 'sent') {
    const evalResult = evaluateSentOutreachEligibility({
      contact,
      userSettings,
      override: data.override,
      overrideReason: data.overrideReason,
      now: sentAtDate
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
      sentAt: evalResult.lastOutreachAt
    });

    contact.status = evalResult.status;
    contact.followUpCount = evalResult.followUpCount;
    contact.lastOutreachAt = evalResult.lastOutreachAt;
    contact.nextEligibleAt = evalResult.nextEligibleAt;
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
      sentAt: evalResult.lastReplyAt
    });

    contact.status = evalResult.status;
    contact.lastReplyAt = evalResult.lastReplyAt;
    contact.followUpCount = 0;
    contact.nextEligibleAt = null;
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
