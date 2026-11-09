import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { TableSkeleton } from '../components/common/Skeleton.jsx';
import { FileText, Plus, Edit, Trash2, Copy, X, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export const TemplatesPage = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('initial');
  const [body, setBody] = useState('');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await apiClient.get('/templates');
      return res.data.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingTemplate) {
        const res = await apiClient.patch(`/templates/${editingTemplate._id}`, payload);
        return res.data.data;
      } else {
        const res = await apiClient.post('/templates', payload);
        return res.data.data;
      }
    },
    onSuccess: () => {
      toast.success(editingTemplate ? 'Template updated' : 'Template created');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to save template');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete template');
    }
  });

  const openCreateModal = () => {
    setEditingTemplate(null);
    setTitle('');
    setKind('initial');
    setBody('');
    setModalOpen(true);
  };

  const openEditModal = (tpl) => {
    setEditingTemplate(tpl);
    setTitle(tpl.title);
    setKind(tpl.kind);
    setBody(tpl.body);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTemplate(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message body are required');
      return;
    }
    saveMutation.mutate({
      title: title.trim(),
      kind,
      body: body.trim()
    });
  };

  const insertPlaceholder = (tag) => {
    setBody((prev) => `${prev} {{${tag}}}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Outreach Message Templates
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personalized, reusable messages with automatic placeholder substitution.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Placeholder Reference Pill */}
      <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4 dark:border-brand-900/40 dark:bg-brand-950/40">
        <div className="flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-brand-950 dark:text-brand-200">
            <span className="font-semibold">Dynamic Placeholders:</span> Use{' '}
            <code className="rounded bg-brand-100 px-1 py-0.5 font-mono text-[11px] text-brand-800 dark:bg-brand-900 dark:text-brand-200">
              {'{{contactName}}'}
            </code>
            ,{' '}
            <code className="rounded bg-brand-100 px-1 py-0.5 font-mono text-[11px] text-brand-800 dark:bg-brand-900 dark:text-brand-200">
              {'{{company}}'}
            </code>
            ,{' '}
            <code className="rounded bg-brand-100 px-1 py-0.5 font-mono text-[11px] text-brand-800 dark:bg-brand-900 dark:text-brand-200">
              {'{{role}}'}
            </code>
            , and{' '}
            <code className="rounded bg-brand-100 px-1 py-0.5 font-mono text-[11px] text-brand-800 dark:bg-brand-900 dark:text-brand-200">
              {'{{myName}}'}
            </code>
            . When logging outreach, these will auto-populate with the contact's exact records.
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates found"
          description="Create your first message template to quickly draft cold messages and respectful follow-ups."
          action={
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <div
              key={tpl._id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      tpl.kind === 'initial'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : tpl.kind === 'followup'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {tpl.kind.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(tpl)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      title="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete template "${tpl.title}"?`)) {
                          deleteMutation.mutate(tpl._id);
                        }
                      }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{tpl.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-4 whitespace-pre-wrap font-sans bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {tpl.body}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Created {new Date(tpl.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tpl.body);
                    toast.success('Template copied to clipboard');
                  }}
                  className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-100 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Template Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 1-Week Polite Follow-up"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Outreach Stage
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="initial">Initial Outreach</option>
                  <option value="followup">Follow-up Message</option>
                  <option value="thank_you">Post-Call / Thank You</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Message Body <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-1">
                    {['contactName', 'company', 'role', 'myName'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertPlaceholder(tag)}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={6}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email or LinkedIn template text with {{placeholders}}..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition"
                >
                  {saveMutation.isPending ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
