import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { StatusBadge } from '../components/common/Badge.jsx';
import { CooldownChip } from '../components/common/CooldownChip.jsx';
import { TableSkeleton } from '../components/common/Skeleton.jsx';
import {
  Users,
  Clock,
  CheckCircle2,
  Trophy,
  AlertCircle,
  ExternalLink,
  Plus,
  Send,
  TrendingUp,
  Inbox
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

export const DashboardPage = () => {
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard');
      return res.data.data;
    }
  });

  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics');
      return res.data.data;
    }
  });

  const counts = dashboardData?.countsByStatus || {};
  const totalContacts = dashboardData?.totalContacts || 0;
  const dueList = dashboardData?.dueForFollowUp || [];
  const upcomingList = dashboardData?.upcomingEligible || [];
  const recentActivity = dashboardData?.recentActivity || [];

  const funnel = analyticsData?.statusFunnel || [];
  const channelRates = analyticsData?.responseRateByChannel || [];
  const outreachWeekly = (analyticsData?.outreachPerWeek || []).map((item) => ({
    week: `Wk ${item._id.week}`,
    count: item.count,
    direction: item._id.direction
  }));

  const referralsCount = (counts.referral_given || 0) + (analyticsData?.outcomes?.offer || 0) + (analyticsData?.outcomes?.interview || 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Referral Pipeline Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time outreach tracker, follow-up deadlines, and conversion analytics.
          </p>
        </div>
        <Link
          to="/contacts/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </Link>
      </div>

      {/* 4 Primary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Contacts
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {totalContacts}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {counts.not_contacted || 0} not yet contacted
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Awaiting Reply
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {counts.awaiting_response || 0}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            In outreach follow-up cycle
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Due For Follow-up
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {dueList.length}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Cooldown period expired
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Positive Outcomes
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {referralsCount}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Referrals, interviews & offers
          </p>
        </div>
      </div>

      {/* Due for Follow-up Highlight Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Ready for Follow-up (Action Required)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                These contacts have completed their waiting cooldown and are eligible for respectful re-outreach.
              </p>
            </div>
          </div>
          <Link
            to="/contacts?dueOnly=true"
            className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            View all ({dueList.length})
          </Link>
        </div>

        {isDashboardLoading ? (
          <TableSkeleton rows={3} />
        ) : dueList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
            No follow-ups due right now! All your outreach is either replied or in healthy cooldown.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {dueList.map((contact) => (
              <div
                key={contact._id}
                className="flex items-center justify-between py-3.5 hover:bg-slate-50/50 px-2 rounded-xl transition dark:hover:bg-slate-800/50"
              >
                <div>
                  <Link
                    to={`/contacts/${contact._id}`}
                    className="font-semibold text-xs text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
                  >
                    {contact.name}
                  </Link>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {contact.role || 'Role unassigned'} • {contact.company || 'N/A'} (Follow-up #{ (contact.followUpCount || 0) + 1 })
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <CooldownChip contact={contact} />
                  <Link
                    to={`/contacts/${contact._id}`}
                    className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 transition"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analytics Recharts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Funnel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Networking Pipeline Funnel</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Conversion stages from initial contact to offer</p>
          </div>
          <div className="h-64 w-full">
            {isAnalyticsLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading funnel...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Response Rate by Channel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Response Rate by Channel (%)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Effectiveness of communication channels</p>
          </div>
          <div className="h-64 w-full">
            {isAnalyticsLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading channel rates...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelRates} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="responseRate" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Recent Outreach Timeline</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Latest communications logged across contacts</p>

        {recentActivity.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No outreach events recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivity.map((item) => (
              <div key={item._id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      item.direction === 'sent'
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {item.direction === 'sent' ? <Send className="h-3.5 w-3.5" /> : <Inbox className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {item.messageSummary}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.contactId?.name ? `${item.contactId.name} (${item.contactId.company || 'N/A'})` : 'Contact'}{' '}
                      • {item.channel}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400">
                  {new Date(item.sentAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
