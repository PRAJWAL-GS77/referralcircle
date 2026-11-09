import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { StatusBadge, OutcomeBadge } from '../components/common/Badge.jsx';
import { CooldownChip } from '../components/common/CooldownChip.jsx';
import { TableSkeleton } from '../components/common/Skeleton.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { Search, Plus, Download, Filter, ChevronLeft, ChevronRight, UserPlus, ExternalLink, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const ContactsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [dueOnly, setDueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { q, status, relationshipType, dueOnly, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (status) params.append('status', status);
      if (relationshipType) params.append('relationshipType', relationshipType);
      if (dueOnly) params.append('dueOnly', 'true');
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const res = await apiClient.get(`/contacts?${params.toString()}`);
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/contacts/${id}`);
    },
    onSuccess: () => {
      toast.success('Contact deleted');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete contact');
    }
  });

  const handleExportCsv = async () => {
    try {
      const res = await apiClient.get('/export/contacts.csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ReferralCircle_Contacts_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Contacts exported to CSV');
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  const contacts = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Networking Contacts</h1>
          <p className="text-xs text-slate-500 mt-1">
            Organize outreach, inspect relationship history, and monitor cooldown status.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <Link
            to="/contacts/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, company, tag..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="not_contacted">Not Contacted</option>
              <option value="contacted">Contacted</option>
              <option value="awaiting_response">Awaiting Response</option>
              <option value="replied">Replied</option>
              <option value="referral_given">Referral Given</option>
              <option value="declined">Declined</option>
              <option value="no_response">No Response</option>
            </select>
          </div>

          {/* Relationship type */}
          <div>
            <select
              value={relationshipType}
              onChange={(e) => {
                setRelationshipType(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Relationships</option>
              <option value="alumni">Alumni</option>
              <option value="former_colleague">Former Colleague</option>
              <option value="professor">Professor</option>
              <option value="friend_referral">Friend Referral</option>
              <option value="cold_contact">Cold Contact</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Due follow-up toggle */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dueOnly}
                onChange={(e) => {
                  setDueOnly(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Show Due for Follow-up only
            </label>
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : contacts.length === 0 ? (
          <EmptyState
            title="No contacts found"
            description="No contacts match your query. Add a new contact or clear filter criteria."
            action={
              <Link
                to="/contacts/new"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition"
              >
                <UserPlus className="h-4 w-4" />
                Add First Contact
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Name & Role</th>
                  <th className="px-6 py-3.5">Company</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Cooldown / Timing</th>
                  <th className="px-6 py-3.5">Outcome</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {contacts.map((contact) => (
                  <tr
                    key={contact._id}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                    onClick={() => navigate(`/contacts/${contact._id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{contact.name}</div>
                      <div className="text-[11px] text-slate-400">{contact.role || 'Role unassigned'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800">{contact.company || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={contact.status} />
                    </td>
                    <td className="px-6 py-4">
                      <CooldownChip contact={contact} />
                    </td>
                    <td className="px-6 py-4">
                      <OutcomeBadge outcome={contact.referralOutcome} />
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/contacts/${contact._id}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          title="View Details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${contact.name}? This will remove all their outreach history.`)) {
                              deleteMutation.mutate(contact._id);
                            }
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Delete Contact"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 bg-white">
            <span className="text-xs text-slate-500">
              Showing page <span className="font-semibold text-slate-800">{meta.page}</span> of{' '}
              <span className="font-semibold text-slate-800">{meta.totalPages}</span> ({meta.total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
