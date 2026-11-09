import { Contact } from '../models/contact.model.js';
import { Outreach } from '../models/outreach.model.js';

export const getAnalyticsData = async (userId) => {
  // 1. Channel stats (response rate by channel)
  const channelAgg = await Outreach.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: { channel: '$channel', direction: '$direction' },
        count: { $sum: 1 }
      }
    }
  ]);

  const channels = ['email', 'linkedin', 'whatsapp', 'phone', 'in_person', 'other'];
  const channelStats = {};

  channels.forEach((ch) => {
    channelStats[ch] = { channel: ch, sent: 0, received: 0, responseRate: 0 };
  });

  channelAgg.forEach((item) => {
    const ch = item._id.channel;
    const dir = item._id.direction;
    if (channelStats[ch]) {
      if (dir === 'sent') channelStats[ch].sent += item.count;
      if (dir === 'received') channelStats[ch].received += item.count;
    }
  });

  Object.values(channelStats).forEach((item) => {
    item.responseRate = item.sent > 0 ? Math.round((item.received / item.sent) * 100) : 0;
  });

  // 2. Contacts and Outcomes aggregation
  const allContacts = await Contact.find({ userId }).lean();

  const total = allContacts.length;
  const contacted = allContacts.filter((c) => c.status !== 'not_contacted').length;
  const replied = allContacts.filter((c) =>
    ['replied', 'referral_given'].includes(c.status)
  ).length;
  const referrals = allContacts.filter(
    (c) => c.status === 'referral_given' || ['referral_given', 'interview', 'offer'].includes(c.referralOutcome)
  ).length;
  const interviews = allContacts.filter((c) => ['interview', 'offer'].includes(c.referralOutcome)).length;
  const offers = allContacts.filter((c) => c.referralOutcome === 'offer').length;

  const statusFunnel = [
    { stage: 'Total Contacts', count: total },
    { stage: 'Contacted', count: contacted },
    { stage: 'Replied', count: replied },
    { stage: 'Referrals Given', count: referrals },
    { stage: 'Interviews', count: interviews },
    { stage: 'Offers', count: offers }
  ];

  const outcomes = {
    none: allContacts.filter((c) => c.referralOutcome === 'none').length,
    referral_given: allContacts.filter((c) => c.referralOutcome === 'referral_given').length,
    interview: allContacts.filter((c) => c.referralOutcome === 'interview').length,
    offer: offers
  };

  // 3. Average days to reply
  const replyDurations = allContacts
    .filter((c) => c.lastOutreachAt && c.lastReplyAt && new Date(c.lastReplyAt) >= new Date(c.lastOutreachAt))
    .map((c) => (new Date(c.lastReplyAt).getTime() - new Date(c.lastOutreachAt).getTime()) / (1000 * 60 * 60 * 24));

  const avgDaysToReply =
    replyDurations.length > 0
      ? Number((replyDurations.reduce((a, b) => a + b, 0) / replyDurations.length).toFixed(1))
      : 0;

  // 4. Outreach volume over past 8 weeks
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const outreachWeeklyRaw = await Outreach.aggregate([
    {
      $match: {
        userId,
        sentAt: { $gte: eightWeeksAgo }
      }
    },
    {
      $group: {
        _id: {
          week: { $isoWeek: '$sentAt' },
          year: { $isoWeekYear: '$sentAt' },
          direction: '$direction'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.week': 1 } }
  ]);

  return {
    responseRateByChannel: Object.values(channelStats),
    statusFunnel,
    outcomes,
    avgDaysToReply,
    outreachPerWeek: outreachWeeklyRaw
  };
};
