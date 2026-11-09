import { Contact } from '../models/contact.model.js';

const escapeCsvField = (field) => {
  if (field === null || field === undefined) return '';
  const stringValue = String(field);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const exportContactsToCsv = async (userId) => {
  const contacts = await Contact.find({ userId }).sort('name').lean();

  const headers = [
    'Name',
    'Company',
    'Role',
    'Email',
    'LinkedIn',
    'Phone',
    'Relationship Type',
    'Relationship Strength',
    'Status',
    'Referral Outcome',
    'Follow Up Count',
    'Cooldown Days Override',
    'Last Outreach Date (UTC)',
    'Last Reply Date (UTC)',
    'Next Eligible Date (UTC)',
    'Tags',
    'Notes'
  ];

  const rows = contacts.map((c) => [
    escapeCsvField(c.name),
    escapeCsvField(c.company),
    escapeCsvField(c.role),
    escapeCsvField(c.email),
    escapeCsvField(c.linkedinUrl),
    escapeCsvField(c.phone),
    escapeCsvField(c.relationshipType),
    escapeCsvField(c.relationshipStrength),
    escapeCsvField(c.status),
    escapeCsvField(c.referralOutcome),
    escapeCsvField(c.followUpCount),
    escapeCsvField(c.cooldownDays ?? ''),
    escapeCsvField(c.lastOutreachAt ? new Date(c.lastOutreachAt).toISOString() : ''),
    escapeCsvField(c.lastReplyAt ? new Date(c.lastReplyAt).toISOString() : ''),
    escapeCsvField(c.nextEligibleAt ? new Date(c.nextEligibleAt).toISOString() : ''),
    escapeCsvField(c.tags ? c.tags.join(';') : ''),
    escapeCsvField(c.notes)
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  return csvContent;
};
