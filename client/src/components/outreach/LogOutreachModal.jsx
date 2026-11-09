import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { X, Send, Inbox, AlertTriangle, ShieldAlert, Clock, CheckCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export const LogOutreachModal = ({ contact, maxFollowUps = 5, isOpen, onClose, onSubmit, isSubmitting }) => {
  if (!isOpen || !contact) return null;

  const [direction, setDirection] = useState('sent');
  const [channel, setChannel] = useState('linkedin');
  const [messageSummary, setMessageSummary] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Fetch available templates
  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await apiClient.get('/templates');
      return res.data.data;
    },
    enabled: isOpen
  });

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

  const handleTemplateSelect = async (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    try {
      const res = await apiClient.get(`/templates/${templateId}/render?contactId=${contact._id}`);
      const rendered = res.data.data;
      setMessageBody(rendered.renderedBody);
      if (!messageSummary) {
        setMessageSummary(rendered.title);
      }
      toast.success('Template loaded and personalized');
    } catch (err) {
      toast.error('Failed to render template');
    }
  };

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
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-100 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Log Outreach Activity</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Contact: {contact.name} ({contact.company || 'N/A'})</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Direction toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('sent')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold border transition ${
                  direction === 'sent'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-950 dark:text-brand-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Send className="h-3.5 w-3.5" />
                Sent by me
              </button>
              <button
                type="button"
                onClick={() => setDirection('received')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold border transition ${
                  direction === 'received'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-950 dark:text-brand-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Inbox className="h-3.5 w-3.5" />
                Received reply
              </button>
            </div>
          </div>

          {/* Cooldown & follow-up status banners for sent outreach */}
          {direction === 'sent' && (
            <>
              {isMaxed ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/40">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                        Maximum Follow-ups Reached ({followUpCount} of {maxFollowUps})
                      </p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                        To preserve respectful professional etiquette, no further follow-ups can be logged for this contact until they reply.
                      </p>
                    </div>
                  </div>
                </div>
              ) : isCooldownActive ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3 dark:border-amber-900/60 dark:bg-amber-950/40">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Cooldown Active ({daysLeft} {daysLeft === 1 ? 'day' : 'days'} left)
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        Follow-up scheduled for {new Date(contact.nextEligibleAt).toLocaleDateString()}. Sending repeated follow-ups too quickly harms relationships.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-amber-200/80 pt-3 dark:border-amber-900/60">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={override}
                        onChange={(e) => setOverride(e.target.checked)}
                        className="rounded border-amber-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-xs font-semibold text-amber-950 dark:text-amber-200">
                        Override cooldown with valid reason
                      </span>
                    </label>

                    {override && (
                      <div className="mt-2.5">
                        <textarea
                          rows={2}
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="e.g. Recruiter explicitly asked for immediate portfolio link (min 10 chars)..."
                          className="w-full rounded-lg border border-amber-300 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-slate-850 dark:border-amber-700 dark:text-white"
                        />
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
                          {overrideReason.trim().length < 10
                            ? `Needs ${10 - overrideReason.trim().length} more characters`
                            : 'Valid justification entered'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                    {followUpCount === 0
                      ? 'First outreach: Eligible to send immediately.'
                      : `Eligible for follow-up #${followUpCount + 1} (Cooldown expired).`}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Template selection */}
          {direction === 'sent' && templates.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-brand-500" />
                Fill from Message Template (optional)
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Choose a template to auto-fill --</option>
                {templates.map((tpl) => (
                  <option key={tpl._id} value={tpl._id}>
                    [{tpl.kind}] {tpl.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Channel */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Message Summary <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={messageSummary}
              onChange={(e) => setMessageSummary(e.target.value)}
              placeholder="e.g. Sent introductory message via LinkedIn"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Message Body (optional)
            </label>
            <textarea
              rows={3}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Full copy or notes of what was written/received..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
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
              className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
