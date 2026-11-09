import { describe, it, expect } from 'vitest';
import {
  getEffectiveCooldownDays,
  calculateDaysLeft,
  isDueForFollowUp,
  evaluateSentOutreachEligibility,
  evaluateReceivedOutreach,
  recomputeContactFromOutreachHistory
} from '../src/services/cooldown.service.js';

describe('Unit Tests: Pure Cooldown Engine (cooldown.service.js)', () => {
  const baseContact = {
    _id: 'contact_123',
    status: 'awaiting_response',
    followUpCount: 1,
    cooldownDays: null,
    lastOutreachAt: new Date('2026-11-01T12:00:00.000Z'),
    nextEligibleAt: new Date('2026-11-08T12:00:00.000Z') // 7 days later
  };

  const userSettings = {
    defaultCooldownDays: 7,
    maxFollowUps: 5
  };

  it('1. Cooldown not yet passed: blocks follow-up with 409 and calculates daysLeft', () => {
    // Current time is 3 days before eligibility (2026-11-05)
    const now = new Date('2026-11-05T12:00:00.000Z');
    const result = evaluateSentOutreachEligibility({
      contact: baseContact,
      userSettings,
      now
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(409);
    expect(result.code).toBe('COOLDOWN_ACTIVE');
    expect(result.details.daysLeft).toBe(3);
    expect(result.details.nextEligibleAt).toBe(baseContact.nextEligibleAt.toISOString());
  });

  it('2. Exactly at boundary: allows follow-up when now === nextEligibleAt', () => {
    const boundaryTime = new Date('2026-11-08T12:00:00.000Z');
    const result = evaluateSentOutreachEligibility({
      contact: baseContact,
      userSettings,
      now: boundaryTime
    });

    expect(result.allowed).toBe(true);
    expect(result.kind).toBe('followup');
    expect(result.followUpCount).toBe(2);
    // nextEligibleAt should be boundaryTime + 7 days = 2026-11-15T12:00:00.000Z
    expect(result.nextEligibleAt.toISOString()).toBe('2026-11-15T12:00:00.000Z');
  });

  it('3. Per-contact override vs global: prefers contact.cooldownDays (3) over settings (7)', () => {
    const contactWithOverride = {
      ...baseContact,
      cooldownDays: 3
    };

    const effective = getEffectiveCooldownDays(
      contactWithOverride.cooldownDays,
      userSettings.defaultCooldownDays
    );
    expect(effective).toBe(3);

    const now = new Date('2026-11-10T10:00:00.000Z');
    const result = evaluateSentOutreachEligibility({
      contact: contactWithOverride,
      userSettings,
      now
    });

    expect(result.allowed).toBe(true);
    // 3 days after Nov 10 is Nov 13
    expect(result.nextEligibleAt.toISOString()).toBe('2026-11-13T10:00:00.000Z');
  });

  it('4. Override with valid reason (>= 10 chars): bypasses active cooldown', () => {
    const now = new Date('2026-11-05T12:00:00.000Z'); // Inside cooldown
    const result = evaluateSentOutreachEligibility({
      contact: baseContact,
      userSettings,
      override: true,
      overrideReason: 'Recruiter asked for updated resume urgently',
      now
    });

    expect(result.allowed).toBe(true);
    expect(result.usedOverride).toBe(true);
    expect(result.followUpCount).toBe(2);
  });

  it('5. Override with invalid reason (< 10 chars): rejects override and enforces cooldown', () => {
    const now = new Date('2026-11-05T12:00:00.000Z');
    const result = evaluateSentOutreachEligibility({
      contact: baseContact,
      userSettings,
      override: true,
      overrideReason: 'Too short', // 9 characters
      now
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(409);
    expect(result.code).toBe('COOLDOWN_ACTIVE');
  });

  it('6. Reply resets count and cooldown: direction=received resets to 0 and clears nextEligibleAt', () => {
    const replyDate = new Date('2026-11-06T15:30:00.000Z');
    const result = evaluateReceivedOutreach({ sentAt: replyDate });

    expect(result.allowed).toBe(true);
    expect(result.status).toBe('replied');
    expect(result.followUpCount).toBe(0);
    expect(result.nextEligibleAt).toBeNull();
    expect(result.lastReplyAt.toISOString()).toBe(replyDate.toISOString());
  });

  it('7. 6th follow-up blocked: followUpCount=5 >= maxFollowUps (5) returns 422 MAX_FOLLOWUPS_REACHED', () => {
    const maxedContact = {
      ...baseContact,
      followUpCount: 5,
      nextEligibleAt: new Date('2026-11-01T00:00:00.000Z') // eligible in past
    };

    const now = new Date('2026-11-10T12:00:00.000Z');
    const result = evaluateSentOutreachEligibility({
      contact: maxedContact,
      userSettings,
      override: true,
      overrideReason: 'Attempting to override max followups',
      now
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(422);
    expect(result.code).toBe('MAX_FOLLOWUPS_REACHED');
  });

  it('8. Deleting an outreach recomputes contact fields chronologically', () => {
    const t1 = new Date('2026-10-01T10:00:00.000Z');
    const t2 = new Date('2026-10-10T10:00:00.000Z');
    const t3 = new Date('2026-10-20T10:00:00.000Z');

    const history = [
      { direction: 'sent', kind: 'initial', sentAt: t1 },
      { direction: 'sent', kind: 'followup', sentAt: t2 },
      { direction: 'sent', kind: 'followup', sentAt: t3 }
    ];

    // Delete t3
    const afterDelete = history.slice(0, 2);
    const recomputed = recomputeContactFromOutreachHistory(afterDelete, 7);

    expect(recomputed.status).toBe('awaiting_response');
    expect(recomputed.followUpCount).toBe(1);
    expect(recomputed.lastOutreachAt.toISOString()).toBe(t2.toISOString());
    // nextEligibleAt = t2 + 7 days = 2026-10-17T10:00:00.000Z
    expect(recomputed.nextEligibleAt.toISOString()).toBe('2026-10-17T10:00:00.000Z');

    // Delete all
    const emptyRecomputed = recomputeContactFromOutreachHistory([], 7);
    expect(emptyRecomputed.status).toBe('not_contacted');
    expect(emptyRecomputed.followUpCount).toBe(0);
    expect(emptyRecomputed.lastOutreachAt).toBeNull();
    expect(emptyRecomputed.nextEligibleAt).toBeNull();
  });

  it('9. Timezone / UTC edge: comparisons are consistent across arbitrary UTC offsets', () => {
    // 2026-11-08T12:00:00.000Z in UTC
    // Represented in UTC+5:30: 2026-11-08T17:30:00.000+05:30
    // Represented in UTC-4:00: 2026-11-08T08:00:00.000-04:00
    const utcString = '2026-11-08T12:00:00.000Z';
    const offsetString = '2026-11-08T17:30:00.000+05:30';

    expect(new Date(utcString).getTime()).toBe(new Date(offsetString).getTime());

    const result = evaluateSentOutreachEligibility({
      contact: baseContact,
      userSettings,
      now: new Date(offsetString)
    });

    expect(result.allowed).toBe(true);
  });

  it('10. isDueForFollowUp accurately detects eligible contacts', () => {
    const dueContact = {
      status: 'awaiting_response',
      nextEligibleAt: new Date('2026-11-04T12:00:00.000Z'),
      followUpCount: 2
    };

    const notDueYet = {
      ...dueContact,
      nextEligibleAt: new Date('2026-11-12T12:00:00.000Z')
    };

    const now = new Date('2026-11-06T12:00:00.000Z');
    expect(isDueForFollowUp(dueContact, 5, now)).toBe(true);
    expect(isDueForFollowUp(notDueYet, 5, now)).toBe(false);
  });
});
