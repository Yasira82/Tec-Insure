// TEC Insure — Risk Protection Runtime (C-129) — read-only V1 data.
//
// Insure = System of Protection. This V1 is DELIBERATELY read-only: it PRESENTS
// risk scoring, and DESCRIBES the escrow / recovery / beneficiary surfaces —
// it moves NO Pi. Escrow is custody of user funds and is hard-gated to
// tec-payment-service (Kernel Invariant #8); no hold/release code ships until
// the 3 P0 gates (legal + payment-service custody + SYSTEM governance) are done
// (C-129 Custody Hard-Gate, mirrors FundX/C-113). Everything below is a curated
// SAMPLE — when live, risk data is computed by Analytics and Pi is custodied by
// payment-service; Insure never re-derives transaction truth or holds balances.

export type ProtectionKind = 'risk' | 'escrow' | 'recovery' | 'beneficiary';

// live-readonly = safe to show now (no custody) · gated = needs the 3 P0 gates
// before any real flow · planned = later phase.
export type ProtectionStatus = 'live-readonly' | 'gated' | 'planned';

export interface Protection {
  id:         string;
  kind:       ProtectionKind;
  title:      string;
  summary:    string;
  ownedBy:    string;          // the OWNING system — Insure coordinates, never owns custody
  status:     ProtectionStatus;
  howItWorks: string[];
}

export interface RiskDimension {
  key:    string;
  label:  string;
  value:  number;              // 0-100
  weight: number;              // relative contribution
}

export interface RiskScore {
  overall:    number;          // 0-100 (higher = lower risk)
  band:       'LOW' | 'MODERATE' | 'ELEVATED';
  dimensions: RiskDimension[];
  note:       string;
}

// ── Sample risk score (when live: computed by Analytics from Zone + Legend + activity) ──
export const RISK_SCORE: RiskScore = {
  overall: 78,
  band: 'LOW',
  note: 'Sample — computed by Analytics from Zone verification + Legend reputation + activity. Insure presents it; it never asserts it as financial truth.',
  dimensions: [
    { key: 'identity_verified', label: 'Identity verified (Hub + Zone)', value: 100, weight: 25 },
    { key: 'activity_history',  label: 'Activity history',               value: 72,  weight: 20 },
    { key: 'dispute_rate',      label: 'Dispute-free rate',              value: 96,  weight: 25 },
    { key: 'completion_rate',   label: 'Commitment completion rate',     value: 88,  weight: 15 },
    { key: 'legend_score',      label: 'Legend reputation signal',       value: 70,  weight: 15 },
  ],
};

// ── Protection surfaces (read-only descriptions) ──
export const PROTECTIONS: Protection[] = [
  {
    id: 'risk-score',
    kind: 'risk',
    title: 'Risk Score',
    summary: 'A per-user / per-transaction risk signal before you act — assessment, not a guarantee.',
    ownedBy: 'Analytics computes · Insure presents',
    status: 'live-readonly',
    howItWorks: [
      'Signals gathered: Hub + Zone identity, activity history, dispute-free rate, Legend reputation.',
      'Analytics computes a 0–100 score (higher = lower risk). Insure never re-derives it.',
      'Shown before a transaction so both sides see a counterparty risk band (aggregate only — details stay private).',
    ],
  },
  {
    id: 'escrow',
    kind: 'escrow',
    title: 'Escrow (Trust Deadlock Breaker)',
    summary: 'Hold Pi until conditions are met — "I won’t pay first / I won’t ship first" solved. Custody = payment-service only.',
    ownedBy: 'tec-payment-service (custody) · SYSTEM (governance)',
    status: 'gated',
    howItWorks: [
      'Buyer funds an escrow → payment-service custodies the Pi (never insure-service).',
      'Seller is notified and ships / delivers.',
      'On confirmation (or a governed dispute resolution), payment-service releases or refunds.',
      'GATED: no hold/release ships until legal review + payment-service custody + SYSTEM governance (C-129 P0).',
    ],
  },
  {
    id: 'dispute-resolution',
    kind: 'escrow',
    title: 'Dispute Resolution',
    summary: 'A structured, evidence-based path when an escrowed transaction is contested.',
    ownedBy: 'SYSTEM (governed workflow) · Alert (escalation)',
    status: 'gated',
    howItWorks: [
      'Either party opens a dispute — funds stay in payment-service custody (frozen state flag).',
      'Both sides submit evidence; a governed workflow decides.',
      'Resolution triggers a payment-service release or refund — full ActorContext + audit trail.',
    ],
  },
  {
    id: 'recovery-center',
    kind: 'recovery',
    title: 'Recovery Center',
    summary: 'Restore access to a lost account or locked asset — with anti-fraud delays.',
    ownedBy: 'tec-auth (identity) · asset-service (assets)',
    status: 'planned',
    howItWorks: [
      'Recovery requires Pi identity re-verification.',
      'A pre-authorized guardian can request emergency access.',
      'Emergency access has a 48-hour delay (anti-fraud).',
    ],
  },
  {
    id: 'beneficiary',
    kind: 'beneficiary',
    title: 'Beneficiary Management',
    summary: 'Designate who inherits access, and who to notify in a critical event — planning, not custody.',
    ownedBy: 'Insure (records) · tec-payment-service (any asset movement)',
    status: 'planned',
    howItWorks: [
      'Add beneficiaries by Pi identity with an access level (emergency / assets-only / full).',
      'Insure records the plan; it never moves funds on its own.',
      'Activation follows the same custody + audit rules as every financial action.',
    ],
  },
];

export const KIND_META: Record<ProtectionKind, { label: string; icon: string }> = {
  risk:        { label: 'Risk',        icon: '📊' },
  escrow:      { label: 'Escrow',      icon: '🤝' },
  recovery:    { label: 'Recovery',    icon: '🔑' },
  beneficiary: { label: 'Beneficiary', icon: '👪' },
};

export const STATUS_META: Record<ProtectionStatus, { label: string; tone: string }> = {
  'live-readonly': { label: 'Available (read-only)', tone: '#22C55E' },
  gated:           { label: 'Gated — P0 pending',    tone: '#FBBF24' },
  planned:         { label: 'Planned',               tone: '#8B5CF6' },
};

export function getProtection(id: string): Protection | null {
  return PROTECTIONS.find((p) => p.id === id) ?? null;
}
