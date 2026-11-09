import { Contact } from '../models/contact.model.js';
import { Outreach } from '../models/outreach.model.js';
import { AppError } from '../middleware/error.middleware.js';

export const listContacts = async (userId, query, userSettings) => {
  const {
    q,
    status,
    tag,
    relationshipType,
    relationshipStrength,
    dueOnly,
    sort = '-createdAt',
    page = 1,
    limit = 10
  } = query;

  const filter = { userId };

  if (status) {
    filter.status = status;
  }

  if (tag) {
    filter.tags = tag;
  }

  if (relationshipType) {
    filter.relationshipType = relationshipType;
  }

  if (relationshipStrength) {
    filter.relationshipStrength = relationshipStrength;
  }

  if (dueOnly === 'true' || dueOnly === true) {
    const maxFollowUps = userSettings?.maxFollowUps ?? 5;
    filter.status = 'awaiting_response';
    filter.nextEligibleAt = { $lte: new Date() };
    filter.followUpCount = { $lt: maxFollowUps };
  }

  if (q && q.trim()) {
    const regex = new RegExp(q.trim(), 'i');
    filter.$or = [
      { name: regex },
      { company: regex },
      { role: regex },
      { tags: regex }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [contacts, total] = await Promise.all([
    Contact.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Contact.countDocuments(filter)
  ]);

  return {
    contacts,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  };
};

export const createContact = async (userId, data) => {
  const contact = await Contact.create({
    ...data,
    userId
  });
  return contact;
};

export const getContactById = async (userId, contactId) => {
  const contact = await Contact.findOne({ _id: contactId, userId });
  if (!contact) {
    throw new AppError('Contact not found', 404, 'NOT_FOUND');
  }
  return contact;
};

export const updateContact = async (userId, contactId, data, userSettings) => {
  const contact = await Contact.findOne({ _id: contactId, userId });
  if (!contact) {
    throw new AppError('Contact not found', 404, 'NOT_FOUND');
  }

  // If cooldownDays changed and contact is currently awaiting response with a prior outreach, recompute nextEligibleAt
  if (
    data.cooldownDays !== undefined &&
    data.cooldownDays !== contact.cooldownDays &&
    contact.status === 'awaiting_response' &&
    contact.lastOutreachAt
  ) {
    const effectiveCooldown = data.cooldownDays ?? userSettings?.defaultCooldownDays ?? 7;
    data.nextEligibleAt = new Date(
      new Date(contact.lastOutreachAt).getTime() + effectiveCooldown * 24 * 60 * 60 * 1000
    );
  }

  Object.assign(contact, data);
  await contact.save();
  return contact;
};

export const deleteContact = async (userId, contactId) => {
  const contact = await Contact.findOneAndDelete({ _id: contactId, userId });
  if (!contact) {
    throw new AppError('Contact not found', 404, 'NOT_FOUND');
  }

  // Clean up associated outreach logs
  await Outreach.deleteMany({ contactId, userId });
  return contact;
};
