import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test_jwt_secret_key_1234567890123456';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

// In-memory mock store
let contactsStore = [];
let templatesStore = [];
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

const createMockTemplate = (data) => {
  const template = {
    _id: data._id || generateHexId(),
    ...data,
    save: vi.fn().mockImplementation(async function () {
      const idx = templatesStore.findIndex((t) => t._id === this._id);
      if (idx !== -1) templatesStore[idx] = this;
      return this;
    })
  };
  return template;
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
      countDocuments: vi.fn().mockImplementation(async (filter) => {
        return contactsStore.filter((c) => {
          if (filter.userId && c.userId.toString() !== filter.userId.toString()) return false;
          if (filter.status && c.status !== filter.status) return false;
          return true;
        }).length;
      }),
      create: vi.fn().mockImplementation(async (data) => {
        const c = createMockContact(data);
        contactsStore.push(c);
        return c;
      }),
      findOne: vi.fn().mockImplementation(async (filter) => {
        const c = contactsStore.find((item) => {
          const matchId = item._id.toString() === filter._id.toString();
          const matchUser = !filter.userId || item.userId.toString() === filter.userId.toString();
          return matchId && matchUser;
        });
        return c ? createMockContact(c) : null;
      }),
      findOneAndDelete: vi.fn().mockImplementation(async (filter) => {
        const idx = contactsStore.findIndex((item) => {
          const matchId = item._id.toString() === filter._id.toString();
          const matchUser = !filter.userId || item.userId.toString() === filter.userId.toString();
          return matchId && matchUser;
        });
        if (idx === -1) return null;
        const [removed] = contactsStore.splice(idx, 1);
        return removed;
      })
    }
  };
});

vi.mock('../src/models/template.model.js', () => {
  return {
    Template: {
      find: vi.fn().mockImplementation((filter) => {
        const results = templatesStore.filter(
          (t) => !filter.userId || t.userId.toString() === filter.userId.toString()
        );
        return {
          sort: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue(results)
        };
      }),
      create: vi.fn().mockImplementation(async (data) => {
        const t = createMockTemplate(data);
        templatesStore.push(t);
        return t;
      }),
      findOne: vi.fn().mockImplementation(async (filter) => {
        const t = templatesStore.find((item) => {
          const matchId = item._id.toString() === filter._id.toString();
          const matchUser = !filter.userId || item.userId.toString() === filter.userId.toString();
          return matchId && matchUser;
        });
        return t ? createMockTemplate(t) : null;
      }),
      findOneAndDelete: vi.fn().mockImplementation(async (filter) => {
        const idx = templatesStore.findIndex((item) => {
          const matchId = item._id.toString() === filter._id.toString();
          const matchUser = !filter.userId || item.userId.toString() === filter.userId.toString();
          return matchId && matchUser;
        });
        if (idx === -1) return null;
        const [removed] = templatesStore.splice(idx, 1);
        return removed;
      })
    }
  };
});

vi.mock('../src/models/outreach.model.js', () => {
  return {
    Outreach: {
      deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 })
    }
  };
});

import app from '../src/app.js';

describe('Phase 2: Contacts, Templates, Settings, and Export', () => {
  const userA = {
    _id: '672cb5e634ab9c3491df2801',
    name: 'Alice Johnson',
    email: 'alice@test.com',
    tokenVersion: 0,
    settings: { defaultCooldownDays: 7, maxFollowUps: 5 }
  };

  const userB = {
    _id: '672cb5e634ab9c3491df2802',
    name: 'Bob Smith',
    email: 'bob@test.com',
    tokenVersion: 0,
    settings: { defaultCooldownDays: 7, maxFollowUps: 5 }
  };

  const tokenA = jwt.sign(
    { userId: userA._id, tokenVersion: 0 },
    process.env.JWT_SECRET
  );
  const tokenB = jwt.sign(
    { userId: userB._id, tokenVersion: 0 },
    process.env.JWT_SECRET
  );

  beforeEach(() => {
    contactsStore = [];
    templatesStore = [];
    usersStore = {
      [userA._id]: { ...userA },
      [userB._id]: { ...userB }
    };
  });

  describe('Contacts CRUD & Scoping', () => {
    it('should fail creation if name is missing (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ company: 'Google' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create and list contacts scoped to authenticated user', async () => {
      const createRes = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Sundar Pichai',
          company: 'Google',
          role: 'CEO',
          relationshipType: 'cold_contact',
          status: 'not_contacted'
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.name).toBe('Sundar Pichai');
      expect(createRes.body.data.userId).toBe(userA._id);

      const listRes = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);
      expect(listRes.body.meta.total).toBe(1);
    });

    it('should return 404 (NOT 403) when user B tries to read user A contact', async () => {
      const contactAId = '672cb5e634ab9c3491df2899';
      contactsStore.push(
        createMockContact({
          _id: contactAId,
          userId: userA._id,
          name: 'Secret Contact',
          company: 'Apple'
        })
      );

      // User B tries to read User A contact
      const res = await request(app)
        .get(`/api/contacts/${contactAId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toBe('Contact not found');
    });

    it('should return 404 when user B tries to delete user A contact', async () => {
      const contactAId = '672cb5e634ab9c3491df2899';
      contactsStore.push(
        createMockContact({
          _id: contactAId,
          userId: userA._id,
          name: 'Contact A'
        })
      );

      const res = await request(app)
        .delete(`/api/contacts/${contactAId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Templates CRUD & Rendering', () => {
    it('should create template and render placeholders with contact data', async () => {
      const contactId = '672cb5e634ab9c3491df2855';
      contactsStore.push(
        createMockContact({
          _id: contactId,
          userId: userA._id,
          name: 'Sarah Connor',
          company: 'Cyberdyne',
          role: 'Lead Architect'
        })
      );

      const templateRes = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Initial Note',
          kind: 'initial',
          body: 'Hello {{contactName}}, I noticed your work at {{company}} as a {{role}}. Best, {{myName}}'
        });

      expect(templateRes.status).toBe(201);
      const templateId = templateRes.body.data._id;

      const renderRes = await request(app)
        .get(`/api/templates/${templateId}/render?contactId=${contactId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(renderRes.status).toBe(200);
      expect(renderRes.body.data.renderedBody).toBe(
        'Hello Sarah Connor, I noticed your work at Cyberdyne as a Lead Architect. Best, Alice Johnson'
      );
    });

    it('should return 404 when user B accesses user A template', async () => {
      const templateAId = '672cb5e634ab9c3491df2877';
      templatesStore.push(
        createMockTemplate({
          _id: templateAId,
          userId: userA._id,
          title: 'Confidential Template',
          kind: 'initial',
          body: 'Secret body'
        })
      );

      const res = await request(app)
        .get(`/api/templates/${templateAId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Settings & CSV Export', () => {
    it('should read and update user settings', async () => {
      const getRes = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.defaultCooldownDays).toBe(7);

      const patchRes = await request(app)
        .patch('/api/settings')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ defaultCooldownDays: 14 });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.defaultCooldownDays).toBe(14);
    });

    it('should export contacts as CSV with correct headers and content', async () => {
      contactsStore.push(
        createMockContact({
          _id: '672cb5e634ab9c3491df2811',
          userId: userA._id,
          name: 'Jane Doe',
          company: 'Acme Corp',
          role: 'Engineer',
          email: 'jane@acme.com',
          relationshipType: 'alumni',
          relationshipStrength: 'warm',
          status: 'contacted',
          tags: ['Alumni', 'Tech']
        })
      );

      const res = await request(app)
        .get('/api/export/contacts.csv')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/contacts\.csv/);
      expect(res.text).toContain('Jane Doe');
      expect(res.text).toContain('Acme Corp');
      expect(res.text).toContain('Alumni;Tech');
    });
  });
});
