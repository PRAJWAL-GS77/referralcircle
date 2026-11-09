import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export const ContactFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    role: '',
    email: '',
    linkedinUrl: '',
    phone: '',
    relationshipType: 'alumni',
    relationshipStrength: 'warm',
    howWeMet: '',
    tags: '',
    notes: '',
    cooldownDays: '',
    referralOutcome: 'none'
  });

  const [errors, setErrors] = useState({});

  // If editing, load contact data
  const { data: contactData, isLoading: isLoadingContact } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const res = await apiClient.get(`/contacts/${id}`);
      return res.data.data;
    },
    enabled: isEdit
  });

  useEffect(() => {
    if (contactData) {
      setFormData({
        name: contactData.name || '',
        company: contactData.company || '',
        role: contactData.role || '',
        email: contactData.email || '',
        linkedinUrl: contactData.linkedinUrl || '',
        phone: contactData.phone || '',
        relationshipType: contactData.relationshipType || 'alumni',
        relationshipStrength: contactData.relationshipStrength || 'warm',
        howWeMet: contactData.howWeMet || '',
        tags: contactData.tags ? contactData.tags.join(', ') : '',
        notes: contactData.notes || '',
        cooldownDays: contactData.cooldownDays !== null && contactData.cooldownDays !== undefined ? contactData.cooldownDays.toString() : '',
        referralOutcome: contactData.referralOutcome || 'none'
      });
    }
  }, [contactData]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) {
        const res = await apiClient.patch(`/contacts/${id}`, payload);
        return res.data.data;
      } else {
        const res = await apiClient.post('/contacts', payload);
        return res.data.data;
      }
    },
    onSuccess: (saved) => {
      toast.success(isEdit ? 'Contact updated' : 'Contact created');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
      navigate(`/contacts/${saved._id}`);
    },
    onError: (err) => {
      const apiErrors = err.response?.data?.error?.details;
      if (apiErrors && Array.isArray(apiErrors)) {
        const errMap = {};
        apiErrors.forEach((e) => {
          errMap[e.field] = e.message;
        });
        setErrors(errMap);
      }
      toast.error(err.response?.data?.error?.message || 'Failed to save contact');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Contact name is required';
    }

    if (formData.cooldownDays && (isNaN(Number(formData.cooldownDays)) || Number(formData.cooldownDays) < 1)) {
      newErrors.cooldownDays = 'Cooldown must be a positive number of days';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const payload = {
      name: formData.name.trim(),
      company: formData.company.trim(),
      role: formData.role.trim(),
      email: formData.email.trim() || undefined,
      linkedinUrl: formData.linkedinUrl.trim(),
      phone: formData.phone.trim(),
      relationshipType: formData.relationshipType,
      relationshipStrength: formData.relationshipStrength,
      howWeMet: formData.howWeMet.trim(),
      tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      notes: formData.notes.trim(),
      cooldownDays: formData.cooldownDays ? parseInt(formData.cooldownDays, 10) : null,
      referralOutcome: formData.referralOutcome
    };

    mutation.mutate(payload);
  };

  if (isEdit && isLoadingContact) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading contact details...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Top back button */}
      <div className="flex items-center gap-3">
        <Link
          to={isEdit ? `/contacts/${id}` : '/contacts'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isEdit ? 'Edit Contact' : 'Add New Contact'}
          </h1>
          <p className="text-xs text-slate-500">
            {isEdit ? 'Update relationship notes and status' : 'Log a new person in your referral network'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        {/* Core details */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Professional Information
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Satya Nadella"
                className={`w-full rounded-xl border bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 ${
                  errors.name ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500'
                }`}
              />
              {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="e.g. Microsoft"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Title</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g. Senior Software Engineer"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. satya@microsoft.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn Profile URL</label>
              <input
                type="url"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/satyanadella"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 555-0199"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Relationship & Cooldown */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Relationship Context & Outreach Cooldown
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship Type</label>
              <select
                value={formData.relationshipType}
                onChange={(e) => setFormData({ ...formData, relationshipType: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="alumni">Alumni</option>
                <option value="former_colleague">Former Colleague</option>
                <option value="professor">Professor</option>
                <option value="friend_referral">Friend Referral</option>
                <option value="cold_contact">Cold Contact</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship Strength</label>
              <select
                value={formData.relationshipStrength}
                onChange={(e) => setFormData({ ...formData, relationshipStrength: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="cold">Cold (Never met)</option>
                <option value="warm">Warm (Mutual connection/event)</option>
                <option value="strong">Strong (Close collaborator)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cooldown Days Override
              </label>
              <input
                type="number"
                min="1"
                value={formData.cooldownDays}
                onChange={(e) => setFormData({ ...formData, cooldownDays: e.target.value })}
                placeholder="Leave blank to use default (7)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Custom days between follow-ups.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">How We Met / Connection Story</label>
            <input
              type="text"
              value={formData.howWeMet}
              onChange={(e) => setFormData({ ...formData, howWeMet: e.target.value })}
              placeholder="e.g. Spoke after his panel at the 2025 Career Fair"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="Alumni, Seattle, DistributedSystems"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes & Conversation Background</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Personal interests, recent projects, mutual friends..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to={isEdit ? `/contacts/${id}` : '/contacts'}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition"
          >
            <Save className="h-4 w-4" />
            {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Contact'}
          </button>
        </div>
      </form>
    </div>
  );
};
