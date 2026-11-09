/**
 * Pure functions implementing the core Cooldown & Outreach business rules.
 * All functions operate purely on input arguments with zero side-effects.
 */

export const getEffectiveCooldownDays = (contactCooldown, userDefaultCooldown) => {
  if (typeof contactCooldown === 'number' && contactCooldown > 0) {
    return contactCooldown;
  }
  if (typeof userDefaultCooldown === 'number' && userDefaultCooldown > 0) {
    return userDefaultCooldown;
  }
  return 7;
};

export const calculateDaysLeft = (nextEligibleAt, now = new Date()) => {
  if (!nextEligibleAt) return 0;
  const targetTime = new Date(nextEligibleAt).getTime();
  const currentTime = new Date(now).getTime();
  const diffMs = targetTime - currentTime;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
};

export const isDueForFollowUp = (contact, maxFollowUps = 5, now = new Date()) => {
  if (!contact || contact.status !== 'awaiting_response') return false;
  if (!contact.nextEligibleAt) return false;
  const currentTime = new Date(now).getTime();
  const eligibleTime = new Date(contact.nextEligibleAt).getTime();
  const count = contact.followUpCount || 0;
  return eligibleTime <= currentTime && count < maxFollowUps;
};

export const evaluateSentOutreachEligibility = ({
  contact,
  userSettings,
  override = false,
  overrideReason = '',
  now = new Date()
}) => {
  const effectiveCooldownDays = getEffectiveCooldownDays(
    contact.cooldownDays,
    userSettings?.defaultCooldownDays
  );
  const maxFollowUps = userSettings?.maxFollowUps ?? 5;
  const currentTime = new Date(now).getTime();

  // First ever sent outreach
  const isFirstSent = !contact.lastOutreachAt && (contact.status === 'not_contacted' || contact.followUpCount === 0);

  if (isFirstSent) {
    const nextEligibleDate = new Date(currentTime + effectiveCooldownDays * 24 * 60 * 60 * 1000);
    return {
      allowed: true,
      kind: 'initial',
      isInitial: true,
      followUpCount: 0,
      lastOutreachAt: new Date(currentTime),
      nextEligibleAt: nextEligibleDate,
      status: 'awaiting_response'
    };
  }

  // Follow-up outreach checks
  const currentFollowUps = contact.followUpCount || 0;
  if (currentFollowUps >= maxFollowUps) {
    return {
      allowed: false,
      statusCode: 422,
      code: 'MAX_FOLLOWUPS_REACHED',
      message: `Maximum follow-up limit of ${maxFollowUps} reached. No further follow-ups permitted.`
    };
  }

  if (contact.nextEligibleAt) {
    const eligibleTime = new Date(contact.nextEligibleAt).getTime();
    if (currentTime < eligibleTime) {
      // Cooldown is active
      const hasValidOverride =
        override === true &&
        typeof overrideReason === 'string' &&
        overrideReason.trim().length >= 10;

      if (!hasValidOverride) {
        const daysLeft = calculateDaysLeft(contact.nextEligibleAt, now);
        return {
          allowed: false,
          statusCode: 409,
          code: 'COOLDOWN_ACTIVE',
          message: `Cooldown active. Follow-up available in ${daysLeft} day(s).`,
          details: {
            nextEligibleAt: new Date(contact.nextEligibleAt).toISOString(),
            daysLeft
          }
        };
      }
    }
  }

  // Allowed follow-up
  const nextEligibleDate = new Date(currentTime + effectiveCooldownDays * 24 * 60 * 60 * 1000);
  return {
    allowed: true,
    kind: 'followup',
    isInitial: false,
    followUpCount: currentFollowUps + 1,
    lastOutreachAt: new Date(currentTime),
    nextEligibleAt: nextEligibleDate,
    status: 'awaiting_response',
    usedOverride: Boolean(override && overrideReason && overrideReason.trim().length >= 10)
  };
};

export const evaluateReceivedOutreach = ({ sentAt = new Date() }) => {
  const timestamp = new Date(sentAt);
  return {
    allowed: true,
    kind: 'reply',
    lastReplyAt: timestamp,
    status: 'replied',
    followUpCount: 0,
    nextEligibleAt: null
  };
};

export const recomputeContactFromOutreachHistory = (outreachList, effectiveCooldownDays = 7) => {
  if (!outreachList || outreachList.length === 0) {
    return {
      status: 'not_contacted',
      followUpCount: 0,
      lastOutreachAt: null,
      lastReplyAt: null,
      nextEligibleAt: null
    };
  }

  // Sort chronological ascending
  const sorted = [...outreachList].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));

  let status = 'not_contacted';
  let followUpCount = 0;
  let lastOutreachAt = null;
  let lastReplyAt = null;
  let nextEligibleAt = null;

  for (const item of sorted) {
    const itemDate = new Date(item.sentAt);

    if (item.direction === 'sent') {
      if (lastOutreachAt === null) {
        followUpCount = 0;
      } else {
        followUpCount += 1;
      }
      lastOutreachAt = itemDate;
      status = 'awaiting_response';
      nextEligibleAt = new Date(itemDate.getTime() + effectiveCooldownDays * 24 * 60 * 60 * 1000);
    } else if (item.direction === 'received' && item.kind === 'reply') {
      lastReplyAt = itemDate;
      status = 'replied';
      followUpCount = 0;
      nextEligibleAt = null;
    }
  }

  return {
    status,
    followUpCount,
    lastOutreachAt,
    lastReplyAt,
    nextEligibleAt
  };
};
