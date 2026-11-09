import React from 'react';

const statusConfig = {
  not_contacted: { label: 'Not Contacted', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  contacted: { label: 'Contacted', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  awaiting_response: { label: 'Awaiting Response', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  replied: { label: 'Replied', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  referral_given: { label: 'Referral Given', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  declined: { label: 'Declined', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  no_response: { label: 'No Response', bg: 'bg-gray-100 text-gray-500 border-gray-200' }
};

const outcomeConfig = {
  none: { label: 'No Outcome', bg: 'bg-slate-50 text-slate-500 border-slate-200' },
  referral_given: { label: 'Referral Given', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  interview: { label: 'Interview Scheduled', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
  offer: { label: 'Offer Received 🎉', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold' }
};

export const StatusBadge = ({ status }) => {
  const conf = statusConfig[status] || statusConfig.not_contacted;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${conf.bg}`}>
      {conf.label}
    </span>
  );
};

export const OutcomeBadge = ({ outcome }) => {
  const conf = outcomeConfig[outcome] || outcomeConfig.none;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${conf.bg}`}>
      {conf.label}
    </span>
  );
};
