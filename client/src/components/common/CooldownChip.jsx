import React from 'react';
import { Clock, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';

export const CooldownChip = ({ contact, maxFollowUps = 5 }) => {
  if (!contact) return null;

  const followUpCount = contact.followUpCount || 0;
  const isMaxed = followUpCount >= maxFollowUps;

  if (isMaxed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
        <ShieldAlert className="h-3 w-3" />
        Max follow-ups reached ({followUpCount}/{maxFollowUps})
      </span>
    );
  }

  if (contact.status === 'not_contacted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle className="h-3 w-3" />
        Ready for initial outreach
      </span>
    );
  }

  if (contact.status === 'replied') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
        <CheckCircle className="h-3 w-3" />
        Replied (Cooldown reset)
      </span>
    );
  }

  if (contact.status === 'awaiting_response' && contact.nextEligibleAt) {
    const now = new Date().getTime();
    const eligibleTime = new Date(contact.nextEligibleAt).getTime();
    const diffMs = eligibleTime - now;

    if (diffMs <= 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 animate-pulse">
          <AlertCircle className="h-3 w-3" />
          Due for follow-up (#{followUpCount + 1})
        </span>
      );
    }

    const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        <Clock className="h-3 w-3" />
        Available in {daysLeft} {daysLeft === 1 ? 'day' : 'days'} ({new Date(contact.nextEligibleAt).toLocaleDateString()})
      </span>
    );
  }

  return null;
};
