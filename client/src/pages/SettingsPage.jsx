import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Settings as SettingsIcon, Shield, Download, LogOut, Trash2, Clock, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export const SettingsPage = () => {
  const queryClient = useQueryClient();
  const { user, logoutAll, logout, refreshUser } = useAuth();

  const [defaultCooldownDays, setDefaultCooldownDays] = useState(7);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiClient.get('/settings');
      return res.data.data;
    }
  });

  useEffect(() => {
    if (settingsData) {
      setDefaultCooldownDays(settingsData.defaultCooldownDays || 7);
    }
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.patch('/settings', payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Settings updated and active contact cooldowns recalculated');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refreshUser();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update settings');
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/settings');
    },
    onSuccess: () => {
      toast.success('Account and all associated referral data deleted');
      logout();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete account');
    }
  });

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const days = parseInt(defaultCooldownDays, 10);
    if (isNaN(days) || days < 1) {
      toast.error('Cooldown days must be at least 1');
      return;
    }
    updateMutation.mutate({ defaultCooldownDays: days });
  };

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Account & App Settings</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure outreach cooldown boundaries, session security, data export, and account lifecycle.
        </p>
      </div>

      {/* Cooldown Settings Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Clock className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Cooldown Rules</h2>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Cooldown (Days)
              </label>
              <input
                type="number"
                min="1"
                required
                value={defaultCooldownDays}
                onChange={(e) => setDefaultCooldownDays(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Applies to all contacts unless a custom per-contact override is set. Changing this recomputes active follow-up dates.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Maximum Follow-ups Limit
              </label>
              <input
                type="number"
                disabled
                value={settingsData?.maxFollowUps || 5}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500 cursor-not-allowed dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Fixed rule: 5 maximum follow-ups before the system locks to prevent spamming alumni.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition"
            >
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? 'Saving...' : 'Update Cooldown Rules'}
            </button>
          </div>
        </form>
      </div>

      {/* Data Management & Session Security Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Data & Session Security</h2>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Export Contact Records</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Download a clean, RFC-compliant CSV copy of all your contacts and outreach histories.
              </p>
            </div>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-sm transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Logout from All Devices</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Increments tokenVersion on server to immediately invalidate all issued JWT tokens across all browsers.
              </p>
            </div>
            <button
              onClick={logoutAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-sm transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout Everywhere
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 shadow-sm dark:border-rose-950 dark:bg-rose-950/20">
        <div className="flex items-center gap-2.5 mb-2">
          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          <h2 className="text-base font-bold text-rose-900 dark:text-rose-300">Danger Zone</h2>
        </div>
        <p className="text-xs text-rose-700 dark:text-rose-400 mb-4">
          Permanently delete your user profile, settings, templates, contacts, and all outreach logs. This action cannot be undone.
        </p>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition"
        >
          <Trash2 className="h-4 w-4" />
          Delete My Account
        </button>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Account Deletion</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Irreversible action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Please type <span className="font-mono font-bold text-rose-600">DELETE</span> to confirm that you want to permanently erase all your referral data.
            </p>

            <input
              type="text"
              value={deleteConfirmationInput}
              onChange={(e) => setDeleteConfirmationInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationInput('');
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmationInput !== 'DELETE' || deleteAccountMutation.isPending}
                onClick={() => deleteAccountMutation.mutate()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {deleteAccountMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
