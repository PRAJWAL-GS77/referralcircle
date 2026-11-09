import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/user.model.js';
import { Contact } from '../models/contact.model.js';
import { Template } from '../models/template.model.js';
import { Outreach } from '../models/outreach.model.js';

const seedDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL ERROR: Seeding is strictly prohibited in production environment!');
    process.exit(1);
  }

  await connectDB();
  console.log('Starting demo database seed...');

  // Upsert Demo User
  let demoUser = await User.findOne({ email: 'demo@referralcircle.com' });
  if (!demoUser) {
    demoUser = await User.create({
      googleId: 'demo_google_id_999999',
      email: 'demo@referralcircle.com',
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      tokenVersion: 0,
      settings: {
        defaultCooldownDays: 7,
        maxFollowUps: 5
      }
    });
    console.log('Created demo user: Alex Rivera (demo@referralcircle.com)');
  }

  const userId = demoUser._id;

  // Clear existing demo user contacts, templates, and outreach
  await Contact.deleteMany({ userId });
  await Template.deleteMany({ userId });
  await Outreach.deleteMany({ userId });

  // Seed default templates
  const defaultTemplates = [
    {
      userId,
      title: 'Alumni Cold Outreach',
      kind: 'initial',
      body: 'Hi {{contactName}},\n\nI hope you are doing well! I came across your profile through our university alumni network. I really admire your engineering journey at {{company}} as a {{role}}. I am currently exploring opportunities in this space and would love to ask you a couple of questions about the team culture.\n\nBest regards,\n{{myName}}'
    },
    {
      userId,
      title: 'Gentle 1-Week Follow-up',
      kind: 'followup',
      body: 'Hi {{contactName}},\n\nJust following up on my previous note. I understand you must be super busy with your work at {{company}}. If you have 5-10 minutes next week, I would be deeply grateful for a quick chat.\n\nThank you,\n{{myName}}'
    },
    {
      userId,
      title: 'Post-Call Thank You',
      kind: 'thank_you',
      body: 'Hi {{contactName}},\n\nThank you so much for taking the time to speak with me today about {{company}}! Your advice regarding the referral process and interviewing was incredibly insightful.\n\nWarmly,\n{{myName}}'
    }
  ];

  await Template.insertMany(defaultTemplates);
  console.log('Seeded 3 standard outreach templates.');

  const now = new Date();
  const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const daysAhead = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const contactsData = [
    {
      name: 'Priya Sharma',
      company: 'Google',
      role: 'Staff Software Engineer',
      email: 'priya.sharma@example.com',
      linkedinUrl: 'https://linkedin.com/in/priya-sharma',
      relationshipType: 'alumni',
      relationshipStrength: 'warm',
      howWeMet: 'Alumni mentorship summit 2024',
      tags: ['Alumni', 'Cloud', 'Tier1'],
      notes: 'Super open to referring students with distributed systems experience.',
      status: 'awaiting_response',
      referralOutcome: 'none',
      cooldownDays: null,
      followUpCount: 1,
      lastOutreachAt: daysAgo(9),
      nextEligibleAt: daysAgo(2) // Due for follow-up!
    },
    {
      name: 'David Chen',
      company: 'Stripe',
      role: 'Senior Product Manager',
      email: 'dchen@example.com',
      linkedinUrl: 'https://linkedin.com/in/davidchen',
      relationshipType: 'former_colleague',
      relationshipStrength: 'strong',
      howWeMet: 'Worked together during summer internship',
      tags: ['Fintech', 'Ex-Coworker'],
      notes: 'Offered to refer when PM or SWE positions open.',
      status: 'replied',
      referralOutcome: 'interview',
      cooldownDays: 5,
      followUpCount: 0,
      lastOutreachAt: daysAgo(14),
      lastReplyAt: daysAgo(1),
      nextEligibleAt: null
    },
    {
      name: 'Dr. Robert Miller',
      company: 'Stanford University',
      role: 'Professor of Computer Science',
      email: 'rmiller@example.edu',
      relationshipType: 'professor',
      relationshipStrength: 'strong',
      howWeMet: 'Advised my Database Systems capstone',
      tags: ['Academia', 'Recommendation'],
      status: 'contacted',
      referralOutcome: 'none',
      followUpCount: 0,
      lastOutreachAt: daysAgo(3),
      nextEligibleAt: daysAhead(4)
    },
    {
      name: 'Elena Rostova',
      company: 'Microsoft',
      role: 'Principal Engineering Manager',
      email: 'elena.rostova@example.com',
      relationshipType: 'cold_contact',
      relationshipStrength: 'cold',
      howWeMet: 'Cold reach on LinkedIn via mutual Azure post',
      tags: ['Azure', 'Cold'],
      status: 'not_contacted',
      referralOutcome: 'none'
    },
    {
      name: 'Marcus Johnson',
      company: 'Amazon',
      role: 'Software Development Engineer II',
      email: 'marcusj@example.com',
      relationshipType: 'friend_referral',
      relationshipStrength: 'warm',
      howWeMet: 'Introduced by my roommate Sam',
      tags: ['AWS', 'FriendReferral'],
      status: 'referral_given',
      referralOutcome: 'referral_given',
      lastOutreachAt: daysAgo(20),
      lastReplyAt: daysAgo(18),
      followUpCount: 0
    },
    {
      name: 'Ananya Patel',
      company: 'Meta',
      role: 'Software Engineer (Infra)',
      email: 'ananya.p@example.com',
      relationshipType: 'alumni',
      relationshipStrength: 'warm',
      howWeMet: 'University Hackathon judge',
      tags: ['Alumni', 'Infra'],
      status: 'awaiting_response',
      referralOutcome: 'none',
      lastOutreachAt: daysAgo(2),
      nextEligibleAt: daysAhead(5), // In active cooldown
      followUpCount: 1
    },
    {
      name: 'James Wilson',
      company: 'Netflix',
      role: 'Senior UI Engineer',
      email: 'jwilson@example.com',
      relationshipType: 'cold_contact',
      relationshipStrength: 'cold',
      tags: ['Frontend', 'Streaming'],
      status: 'declined',
      referralOutcome: 'none',
      notes: 'No junior openings this quarter.',
      lastOutreachAt: daysAgo(10),
      lastReplyAt: daysAgo(8)
    },
    {
      name: 'Sophia Martinez',
      company: 'Databricks',
      role: 'Solutions Architect',
      email: 'smartinez@example.com',
      relationshipType: 'other',
      relationshipStrength: 'cold',
      howWeMet: 'Tech meetup in Chicago',
      tags: ['Data', 'Meetup'],
      status: 'not_contacted'
    },
    {
      name: 'Kavita Iyer',
      company: 'Uber',
      role: 'Senior Backend Engineer',
      email: 'kavita.iyer@example.com',
      relationshipType: 'alumni',
      relationshipStrength: 'warm',
      tags: ['Alumni', 'RideShare'],
      status: 'replied',
      referralOutcome: 'offer',
      notes: 'Full-time offer received post final round!',
      lastOutreachAt: daysAgo(35),
      lastReplyAt: daysAgo(30)
    },
    {
      name: 'Liam O’Connor',
      company: 'Snowflake',
      role: 'Software Engineer',
      email: 'liam.oc@example.com',
      relationshipType: 'cold_contact',
      relationshipStrength: 'cold',
      tags: ['Database', 'Cold'],
      status: 'no_response',
      referralOutcome: 'none',
      followUpCount: 5,
      lastOutreachAt: daysAgo(40)
    },
    {
      name: 'Zainab Al-Mansoor',
      company: 'Airbnb',
      role: 'Full Stack Engineer',
      email: 'zainab@example.com',
      relationshipType: 'friend_referral',
      relationshipStrength: 'warm',
      tags: ['Product', 'Web'],
      status: 'awaiting_response',
      referralOutcome: 'none',
      lastOutreachAt: daysAgo(12),
      nextEligibleAt: daysAgo(5), // Due for follow-up
      followUpCount: 2
    },
    {
      name: 'Thomas Wright',
      company: 'Apple',
      role: 'CoreOS Systems Engineer',
      email: 'twright@example.com',
      relationshipType: 'former_colleague',
      relationshipStrength: 'strong',
      tags: ['Hardware', 'Kernel'],
      status: 'not_contacted'
    }
  ];

  for (const contactInfo of contactsData) {
    const contact = await Contact.create({
      ...contactInfo,
      userId
    });

    // Seed realistic outreach logs for contacted records
    if (contact.lastOutreachAt) {
      await Outreach.create({
        userId,
        contactId: contact._id,
        direction: 'sent',
        kind: 'initial',
        channel: 'linkedin',
        messageSummary: `Initial referral inquiry sent to ${contact.name}`,
        sentAt: contact.lastOutreachAt
      });
    }

    if (contact.lastReplyAt) {
      await Outreach.create({
        userId,
        contactId: contact._id,
        direction: 'received',
        kind: 'reply',
        channel: 'linkedin',
        messageSummary: `${contact.name} replied regarding career discussion`,
        sentAt: contact.lastReplyAt
      });
    }
  }

  console.log(`Seeded 12 realistic contacts with outreach histories for demo user.`);
  await mongoose.disconnect();
  console.log('Database disconnected. Seeding completed successfully.');
  process.exit(0);
};

seedDatabase().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
