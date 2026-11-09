import { Contact } from '../models/contact.model.js';
import { Outreach } from '../models/outreach.model.js';

export const getDashboardData = async (userId, userSettings) => {
  const now = new Date();
  const maxFollowUps = userSettings?.maxFollowUps ?? 5;

  // Aggregate counts by status
  const statusCountsRaw = await Contact.aggregate([
    { $match: { userId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const defaultStatusCounts = {
    not_contacted: 0,
    contacted: 0,
    awaiting_response: 0,
    replied: 0,
    referral_given: 0,
    declined: 0,
    no_response: 0
  };

  statusCountsRaw.forEach((item) => {
    if (item._id in defaultStatusCounts) {
      defaultStatusCounts[item._id] = item.count;
    }
  });

  const totalContacts = Object.values(defaultStatusCounts).reduce((a, b) => a + b, 0);

  // Due for follow up
  const dueForFollowUp = await Contact.find({
    userId,
    status: 'awaiting_response',
    nextEligibleAt: { $lte: now },
    followUpCount: { $lt: maxFollowUps }
  })
    .sort({ nextEligibleAt: 1 })
    .limit(10)
    .lean();

  // Upcoming eligible dates
  const upcomingEligible = await Contact.find({
    userId,
    status: 'awaiting_response',
    nextEligibleAt: { $gt: now }
  })
    .sort({ nextEligibleAt: 1 })
    .limit(5)
    .lean();

  // Recent activity (latest 10 outreach events)
  const recentActivity = await Outreach.find({ userId })
    .sort({ sentAt: -1 })
    .limit(10)
    .populate('contactId', 'name company role')
    .lean();

  return {
    totalContacts,
    countsByStatus: defaultStatusCounts,
    dueForFollowUp,
    upcomingEligible,
    recentActivity
  };
};
