import React, { useState } from 'react';
import { X, Send, Inbox, AlertTriangle, ShieldAlert, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const LogOutreachModal = ({ contact, maxFollowUps = 5, isOpen, onClose, onSubmit, isSubmitting }) => {
  if (!isOpen || !contact) return null;

  const [direction, setDirection] = useState('sent');
  const [channel, setChannel] = useState('linkedin');
  const [messageSummary, setMessageSummary] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const followUpCount = contact.followUpCount || 0;
  const isMaxed = followUpCount >= maxFollowUps;

  // Calculate cooldown state
  const now = new Date().getTime();
  const nextEligibleTime = contact.nextEligibleAt ? new Date(contact.nextEligibleAt).getTime() : 0;
  const isCooldownActive =
    contact.status === 'awaiting_response' &&
    nextEligibleTime > now;
  const daysLeft = isCooldownActive
    ? Math.ceil((nextEligibleTime - now) / (24 * 60 * 60 * 1000))
    : 0;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!messageSummary.trim()) {
      toast.error('Message summary is required');
      return;
    }

    if (direction === 'sent') {
      if (isMaxed) {
        toast.error('Maximum 5 follow-ups reached');
        return;
      }
      if (isCooldownActive && !override) {
        toast.error(`Cooldown active. Follow-up available in ${daysLeft} days.`);
        return;
      }
      if (isCooldownActive && override && overrideReason.trim().length < 10) {
        toast.error('Override reason must be at least 10 characters.');
        return;
      }
    }

    onSubmit({
      direction,
      channel,
      messageSummary: messageSummary.trim(),
      messageBody: messageBody.trim(),
      override: direction === 'sent' && isCooldownActive ? override : false,
      overrideReason: direction === 'sent' && isCooldownActive && override ? overrideReason.trim() : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Log Outreach Activity</h3>
            <p className="text-xs text-slate-500">Contact: {contact.name} ({contact.company || 'N/A'})</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Direction toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('sent')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-sm font-medium border transition ${
                  direction === 'sent'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Send className="h-4 w-4" />
                Sent by me
              </button>
              <button
                type="button"
                onClick={() => setDirection('received')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-sm font-medium border transition ${
                  direction === 'received'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Inbox className="h-4 w-4" />
                Received from contact
              </button>
            </div>
          </div>

          {/* Cooldown & follow-up status banners for sent outreach */}
          {direction === 'sent' && (
            <>
              {isMaxed ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-rose-800">
                        Maximum Follow-ups Reached ({followUpCount} of {maxFollowUps})
                      </p>
                      <p className="text-xs text-rose-700 mt-1">
                        To preserve respectful professional etiquette, no further follow-ups can be logged for this contact until they reply.
                      </p>
                    </div>
                  </div>
                </div>
              ) : isCooldownActive ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Cooldown Active ({daysLeft} {daysLeft === 1 ? 'day' : 'days'} left)
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Follow-up scheduled for {new Date(contact.nextEligibleAt).toLocaleDateString()}. Sending repeated follow-ups too quickly harms relationships.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-amber-200/80 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={override}
                        onChange={(e) => setOverride(e.target.checked)}
                        className="rounded border-amber-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-xs font-semibold text-amber-950">
                        Override cooldown with valid reason
                      </span>
                    </label>

                    {override && (
                      <div className="mt-2.5">
                        <textarea
                          rows={2}
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="e.g. Recruiter explicitly asked for immediate project link (min 10 chars)..."
                          className="w-full rounded-lg border border-amber-300 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <p className="text-[11px] text-amber-800 mt-1">
                          {overrideReason.trim().length < 10
                            ? `Needs ${10 - overrideReason.trim().length} more characters`
                            : 'Valid justification entered'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-center gap-2.5">
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <p className="text-xs text-emerald-800 font-medium">
                    {followUpCount === 0
                      ? 'First outreach: Eligible to send now.'
                      : `Eligible for follow-up #${followUpCount + 1} (Cooldown expired).`}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Received guidance */}
          {direction === 'received' && (
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-3.5 flex items-center gap-2.5">
              <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <p className="text-xs text-purple-800 font-medium">
                Logging a received reply resets the follow-up count to 0 and clears any active cooldown.
              </p>
            </div>
          )}

          {/* Channel */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="linkedin">LinkedIn</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone / SMS</option>
              <option value="in_person">In Person / Meetup</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Message Summary <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={messageSummary}
              onChange={(e) => setMessageSummary(e.target.value)}
              placeholder="e.g. Sent introductory message via LinkedIn InMail"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Message Body (optional)
            </label>
            <textarea
              rows={3}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Full copy or notes of what was written/received..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                (direction === 'sent' && isMaxed) ||
                (direction === 'sent' && isCooldownActive && (!override || overrideReason.trim().length < 10))
              }
              className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting
                ? 'Logging...'
                : direction === 'sent' && isCooldownActive
                ? override && overrideReason.trim().length >= 10
                  ? 'Log with Override'
                  : `Available in ${daysLeft} days`
                : direction === 'sent'
                ? 'Log Sent Outreach'
                : 'Log Received Reply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
