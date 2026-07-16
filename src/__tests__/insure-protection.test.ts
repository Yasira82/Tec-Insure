import { describe, it, expect } from 'vitest';
import {
  RISK_SCORE, PROTECTIONS, KIND_META, STATUS_META, getProtection,
} from '@/lib/insure/protection';

describe('TEC Insure — Risk Protection Runtime (C-129), read-only V1', () => {
  it('presents a risk score with weighted dimensions (Analytics computes, Insure presents)', () => {
    expect(RISK_SCORE.overall).toBeGreaterThan(0);
    expect(RISK_SCORE.overall).toBeLessThanOrEqual(100);
    expect(['LOW', 'MODERATE', 'ELEVATED']).toContain(RISK_SCORE.band);
    expect(RISK_SCORE.dimensions.length).toBeGreaterThanOrEqual(3);
    for (const d of RISK_SCORE.dimensions) {
      expect(d.value).toBeGreaterThanOrEqual(0);
      expect(d.value).toBeLessThanOrEqual(100);
      expect(d.weight).toBeGreaterThan(0);
    }
  });

  it('every protection names an OWNING system and a known kind + status', () => {
    for (const p of PROTECTIONS) {
      expect(p.ownedBy.length).toBeGreaterThan(0);
      expect(KIND_META[p.kind]).toBeTruthy();
      expect(STATUS_META[p.status]).toBeTruthy();
      expect(p.howItWorks.length).toBeGreaterThan(0);
    }
  });

  it('CUSTODY HARD-GATE: no escrow surface is ever live, and escrow custody = payment-service', () => {
    const escrows = PROTECTIONS.filter((p) => p.kind === 'escrow');
    expect(escrows.length).toBeGreaterThan(0);
    // escrow holds user funds → must never be 'live-readonly' (Invariant #8, C-129 P0)
    for (const e of escrows) expect(e.status).not.toBe('live-readonly');
    // the escrow surface itself must name payment-service as custodian (never insure-service)
    expect(getProtection('escrow')?.ownedBy.toLowerCase()).toContain('payment-service');
  });

  it('risk scoring is the only surface available read-only now (no custody involved)', () => {
    const risk = getProtection('risk-score');
    expect(risk?.status).toBe('live-readonly');
    expect(risk?.kind).toBe('risk');
  });

  it('getProtection resolves by id and fails closed for an unknown id', () => {
    expect(getProtection('escrow')?.title).toBe('Escrow (Trust Deadlock Breaker)');
    expect(getProtection('nope')).toBeNull();
  });

  it('covers the C-129 protection scope (risk · escrow · recovery · beneficiary)', () => {
    const kinds = new Set(PROTECTIONS.map((p) => p.kind));
    for (const kind of ['risk', 'escrow', 'recovery', 'beneficiary'] as const) {
      expect(kinds.has(kind), kind).toBe(true);
    }
  });
});
