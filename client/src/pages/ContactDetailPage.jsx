import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';
import { StatusBadge, OutcomeBadge } from '../components/common/Badge.jsx';
import { CooldownChip } from '../components/common/CooldownChip.jsx';
import { LogOutreachModal } from '../components/outreach/LogOutreachModal.jsx';
import { CardSkeleton } from '../components/common/Skeleton.jsx';
import {
  ArrowLeft,
  Mail,
  Linkedin,
  Phone,
  Send,
  Inbox,
  Edit,
  Trash2,
  Tag,
  Building,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ContactDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Fetch Contact
  const { data: contact, isLoading: isContactLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const res = await apiClient.get(`/contacts/${id}`);
      return res.data.data;
    }
  });

  // Fetch Outreach History
  const { data: outreachList = [], isLoading: isOutreachLoading } = useQuery({
    queryKey: ['outreach', id],
    queryFn: async () => {
      const res = await apiClient.get(`/contacts/${id}/outreach`);
      return res.data.data;
    }
  });

  // Log Outreach Mutation
  const logMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post(`/contacts/${id}/outreach`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Outreach logged successfully');
      setIsLogModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
      queryClient.invalidateQueries({ queryKey: ['outreach', id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to log outreach');
    }
  });

  // Delete Outreach Mutation
  const deleteOutreachMutation = useMutation({
    mutationFn: async (outreachId) => {
      await apiClient.delete(`/outreach/${outreachId}`);
    },
    onSuccess: () => {
      toast.success('Outreach event deleted and contact timing recomputed');
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
      queryClient.invalidateQueries({ queryKey: ['outreach', id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete outreach event');
    }
  });

  if (isContactLoading) {
    return <CardSkeleton />;
  }

  if (!contact) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Contact not found.</p>
        <Link to="/contacts" className="mt-2 text-xs text-brand-600 font-semibold underline dark:text-brand-400">
          Back to contacts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back and quick navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/contacts"
          aria-label="Back to contacts list"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Contacts</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to={`/contacts/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit Profile
          </Link>
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <Plus className="h-4 w-4" />
            Log Outreach
          </button>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{contact.name}</h1>
              <StatusBadge status={contact.status} />
              <OutcomeBadge outcome={contact.referralOutcome} />
            </div>

            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Building className="h-4 w-4 text-slate-400" />
              <span>{contact.role || 'Role unassigned'}</span>
              {contact.company && <span className="text-slate-400">• at {contact.company}</span>}
            </p>
          </div>

          <div>
            <CooldownChip contact={contact} />
          </div>
        </div>

        {/* Contact info grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6 sm:grid-cols-3 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Email</span>
            {contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                className="mt-0.5 font-medium text-brand-600 hover:underline dark:text-brand-400 flex items-center gap-1"
              >
                <Mail className="h-3.5 w-3.5" />
                {contact.email}
              </a>
            ) : (
              <span className="text-slate-400">Not provided</span>
            )}
          </div>

          <div>
            <span className="text-slate-400 block font-medium">LinkedIn</span>
            {contact.linkedinUrl ? (
              <a
                href={contact.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 font-medium text-brand-600 hover:underline dark:text-brand-400 flex items-center gap-1"
              >
                <Linkedin className="h-3.5 w-3.5" />
                View Profile
              </a>
            ) : (
              <span className="text-slate-400">Not provided</span>
            )}
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Phone</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {contact.phone || 'Not provided'}
            </span>
          </div>
        </div>

        {/* Context Details */}
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 sm:grid-cols-3 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Relationship</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
              {contact.relationshipType?.replace('_', ' ')} ({contact.relationshipStrength})
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Cooldown Setting</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {contact.cooldownDays ? `${contact.cooldownDays} days (Custom)` : 'Inheriting default (7 days)'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Follow-up Count</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {contact.followUpCount || 0} / 5 attempts
            </span>
          </div>
        </div>

        {contact.howWeMet && (
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
            <span className="text-slate-400 block font-medium">How We Met</span>
            <p className="mt-0.5 text-slate-700 dark:text-slate-300">{contact.howWeMet}</p>
          </div>
        )}

        {contact.tags && contact.tags.length > 0 && (
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
            <span className="text-slate-400 block font-medium mb-1.5">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Tag className="h-3 w-3 text-slate-400" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {contact.notes && (
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
            <span className="text-slate-400 block font-medium">Personal Notes</span>
            <p className="mt-0.5 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}
      </div>

      {/* Outreach Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Outreach History Timeline</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Chronological communication records</p>
          </div>
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Outreach Event
          </button>
        </div>

        {isOutreachLoading ? (
          <div className="p-4 text-center text-xs text-slate-400">Loading timeline...</div>
        ) : outreachList.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">No outreach events recorded yet.</p>
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="mt-2 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Log your initial outreach
            </button>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {outreachList.map((item) => {
              const isSent = item.direction === 'sent';
              return (
                <div key={item._id} className="relative group">
                  {/* Dot */}
                  <div
                    className={`absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 ${
                      isSent ? 'bg-brand-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isSent ? <Send className="h-2.5 w-2.5" /> : <Inbox className="h-2.5 w-2.5" />}
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition group-hover:bg-slate-50 group-hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:group-hover:bg-slate-800">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              isSent
                                ? 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {item.direction} • {item.channel}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(item.sentAt).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="mt-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                          {item.messageSummary}
                        </h4>
                      </div>

                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              'Delete this outreach event? Contact dates and follow-up counter will be automatically recomputed.'
                            )
                          ) {
                            deleteOutreachMutation.mutate(item._id);
                          }
                        }}
                        aria-label="Delete this outreach event"
                        className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 transition"
                        title="Delete outreach event"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {item.messageBody && (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 whitespace-pre-wrap">
                        {item.messageBody}
                      </p>
                    )}

                    {item.overrideReason && (
                      <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300">
                        <span className="font-semibold">Cooldown Override Reason:</span> {item.overrideReason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Outreach Modal */}
      <LogOutreachModal
        contact={contact}
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSubmit={(payload) => logMutation.mutate(payload)}
        isSubmitting={logMutation.isPending}
      />
    </div>
  );
};
