import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test_jwt_secret_key_1234567890123456';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

let contactsStore = [];
let outreachStore = [];
let usersStore = {};

const generateHexId = () =>
  Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const createMockContact = (data) => {
  const contact = {
    _id: data._id || generateHexId(),
    ...data,
    save: vi.fn().mockImplementation(async function () {
      const idx = contactsStore.findIndex((c) => c._id === this._id);
      if (idx !== -1) contactsStore[idx] = this;
      return this;
    })
  };
  return contact;
};

const createMockOutreach = (data) => {
  const item = {
    _id: data._id || generateHexId(),
    ...data,
    save: vi.fn().mockImplementation(async function () {
      const idx = outreachStore.findIndex((o) => o._id === this._id);
      if (idx !== -1) outreachStore[idx] = this;
      return this;
    })
  };
  return item;
};

vi.mock('../src/models/user.model.js', () => {
  return {
    User: {
      findById: vi.fn().mockImplementation((id) => {
        const u = usersStore[id.toString()];
        const userDoc = u
          ? {
              ...u,
              save: vi.fn().mockImplementation(async function () {
                usersStore[id.toString()] = this;
                return this;
              })
            }
          : null;

        return {
          select: vi.fn().mockResolvedValue(userDoc),
          then: (resolve, reject) => Promise.resolve(userDoc).then(resolve, reject)
        };
      })
    }
  };
});

vi.mock('../src/models/contact.model.js', () => {
  return {
    Contact: {
      find: vi.fn().mockImplementation((filter) => {
        let results = contactsStore.filter((c) => {
          if (filter.userId && c.userId.toString() !== filter.userId.toString()) return false;
          if (filter.status && c.status !== filter.status) return false;
          return true;
        });

        const queryObj = {
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue(results),
          then: (resolve, reject) => Promise.resolve(results).then(resolve, reject)
        };
        return queryObj;
      }),
      findOne: vi.fn().mockImplementation(async (filter) => {
        const c = contactsStore.find((item) => {
          const matchId = item._id.toString() === filter._id.toString();
          const matchUser = !filter.userId || item.userId.toString() === filter.userId.toString();
          return matchId && matchUser;
        });
        return c ? createMockContact(c) : null;
      }),
      aggregate: vi.fn().mockImplementation(async (pipeline) => {
        return [
          { _id: 'not_contacted', count: 2 },
          { _id: 'awaiting_response', count: 3 },
          { _id: 'replied', count: 1 }
        ];
      })
    }
  };
});

vi.mock('../src/models/outreach.model.js', () => {
  return {
    Outreach: {
      find: vi.fn().mockImplementation((filter) => {
        let results = outreachStore.filter((o) => {
          if (filter.userId && o.userId.toString() !== filter.userId.toString()) return false;
          if (filter.contactId && o.contactId.toString() !== filter.contactId.toString()) return false;
          return true;
        });

        const queryObj = {
          sort: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          populate: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue(results),
          then: (resolve, reject) => Promise.resolve(results).then(resolve, reject)
        };
        return queryObj;
      }),
      create: vi.fn().mockImplementation(async (data) => {
        const item = createMockOutreach(data);
        outreachStore.push(item);
        return item;
      }),
      findOneAndDelete: vi.fn().mockImplementation(async (filter) => {
        const idx = outreachStore.findIndex((item) => {
          const matchId = item._id.toString() === filter._id.toString();
          const matchUser = !filter.userId || item.userId.toString() === filter.userId.toString();
          return matchId && matchUser;
        });
        if (idx === -1) return null;
        const [removed] = outreachStore.splice(idx, 1);
        return removed;
      }),
      aggregate: vi.fn().mockImplementation(async (pipeline) => {
        return [
          { _id: { channel: 'linkedin', direction: 'sent' }, count: 5 },
          { _id: { channel: 'linkedin', direction: 'received' }, count: 2 },
          { _id: { channel: 'email', direction: 'sent' }, count: 4 },
          { _id: { channel: 'email', direction: 'received' }, count: 1 }
        ];
      })
    }
  };
});

import app from '../src/app.js';

describe('Integration Tests: Outreach, Cooldown Enforcement, Dashboard & Analytics', () => {
  const user = {
    _id: '672cb5e634ab9c3491df2801',
    name: 'Sarah Connor',
    email: 'sarah@test.com',
    tokenVersion: 0,
    settings: { defaultCooldownDays: 7, maxFollowUps: 5 }
  };

  const token = jwt.sign({ userId: user._id, tokenVersion: 0 }, process.env.JWT_SECRET);

  beforeEach(() => {
    contactsStore = [];
    outreachStore = [];
    usersStore = { [user._id]: { ...user } };
  });

  describe('POST /api/contacts/:id/outreach', () => {
    it('allows first ever sent outreach (kind=initial)', async () => {
      const contactId = '672cb5e634ab9c3491df2810';
      contactsStore.push(
        createMockContact({
          _id: contactId,
          userId: user._id,
          name: 'Tech Recruiter',
          status: 'not_contacted',
          followUpCount: 0
        })
      );

      const res = await request(app)
        .post(`/api/contacts/${contactId}/outreach`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          direction: 'sent',
          channel: 'linkedin',
          messageSummary: 'Sent connection invite with note'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.kind).toBe('initial');
      expect(res.body.meta.contact.status).toBe('awaiting_response');
      expect(res.body.meta.contact.followUpCount).toBe(0);
      expect(res.body.meta.contact.nextEligibleAt).toBeDefined();
    });

    it('rejects follow-up when cooldown is active with 409 and COOLDOWN_ACTIVE code', async () => {
      const contactId = '672cb5e634ab9c3491df2811';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 4);

      contactsStore.push(
        createMockContact({
          _id: contactId,
          userId: user._id,
          name: 'Hiring Manager',
          status: 'awaiting_response',
          followUpCount: 1,
          lastOutreachAt: new Date(),
          nextEligibleAt: futureDate
        })
      );

      const res = await request(app)
        .post(`/api/contacts/${contactId}/outreach`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          direction: 'sent',
          channel: 'email',
          messageSummary: 'Checking in on referral'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('COOLDOWN_ACTIVE');
      expect(res.body.error.details.daysLeft).toBeGreaterThanOrEqual(1);
    });

    it('permits follow-up during cooldown when valid override is provided', async () => {
      const contactId = '672cb5e634ab9c3491df2812';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      contactsStore.push(
        createMockContact({
          _id: contactId,
          userId: user._id,
          name: 'VP of Engineering',
          status: 'awaiting_response',
          followUpCount: 1,
          lastOutreachAt: new Date(),
          nextEligibleAt: futureDate
        })
      );

      const res = await request(app)
        .post(`/api/contacts/${contactId}/outreach`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          direction: 'sent',
          channel: 'linkedin',
          messageSummary: 'Urgent follow-up regarding deadline',
          override: true,
          overrideReason: 'Recruiter reached out asking for my updated portfolio'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.overrideReason).toBe('Recruiter reached out asking for my updated portfolio');
      expect(res.body.meta.contact.followUpCount).toBe(2);
    });

    it('rejects 6th follow-up with 422 MAX_FOLLOWUPS_REACHED', async () => {
      const contactId = '672cb5e634ab9c3491df2813';
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      contactsStore.push(
        createMockContact({
          _id: contactId,
          userId: user._id,
          name: 'Contact With 5 Follow-ups',
          status: 'awaiting_response',
          followUpCount: 5,
          lastOutreachAt: pastDate,
          nextEligibleAt: pastDate
        })
      );

      const res = await request(app)
        .post(`/api/contacts/${contactId}/outreach`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          direction: 'sent',
          channel: 'email',
          messageSummary: 'Attempting 6th outreach'
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('MAX_FOLLOWUPS_REACHED');
    });

    it('resets follow-up count and cooldown when logging a received reply', async () => {
      const contactId = '672cb5e634ab9c3491df2814';
      contactsStore.push(
        createMockContact({
          _id: contactId,
          userId: user._id,
          name: 'Active Lead',
          status: 'awaiting_response',
          followUpCount: 3,
          lastOutreachAt: new Date(),
          nextEligibleAt: new Date()
        })
      );

      const res = await request(app)
        .post(`/api/contacts/${contactId}/outreach`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          direction: 'received',
          channel: 'email',
          messageSummary: 'Lead replied requesting my resume'
        });

      expect(res.status).toBe(201);
      expect(res.body.meta.contact.status).toBe('replied');
      expect(res.body.meta.contact.followUpCount).toBe(0);
      expect(res.body.meta.contact.nextEligibleAt).toBeNull();
    });
  });

  describe('DELETE /api/outreach/:id', () => {
    it('deletes outreach and recomputes contact fields', async () => {
      const contactId = '672cb5e634ab9c3491df2820';
      const outreachId = '672cb5e634ab9c3491df2821';

      contactsStore.push(
        createMockContact({
          _id: contactId,
          userId: user._id,
          name: 'Contact Test',
          status: 'awaiting_response',
          followUpCount: 1
        })
      );

      outreachStore.push(
        createMockOutreach({
          _id: outreachId,
          userId: user._id,
          contactId,
          direction: 'sent',
          kind: 'initial',
          channel: 'email',
          messageSummary: 'Hello',
          sentAt: new Date()
        })
      );

      const res = await request(app)
        .delete(`/api/outreach/${outreachId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.contact.status).toBe('not_contacted');
      expect(res.body.data.contact.followUpCount).toBe(0);
    });
  });

  describe('GET /dashboard & GET /analytics', () => {
    it('returns structured dashboard summary', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.countsByStatus).toBeDefined();
      expect(res.body.data.dueForFollowUp).toBeDefined();
      expect(res.body.data.upcomingEligible).toBeDefined();
      expect(res.body.data.recentActivity).toBeDefined();
    });

    it('returns analytics funnel and metrics', async () => {
      const res = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.responseRateByChannel).toBeInstanceOf(Array);
      expect(res.body.data.statusFunnel).toBeInstanceOf(Array);
      expect(res.body.data.outcomes).toBeDefined();
      expect(typeof res.body.data.avgDaysToReply).toBe('number');
    });
  });
});
