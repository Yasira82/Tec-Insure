import {
  PROTECTIONS, getProtection,
  type Protection, type ProtectionKind, type ProtectionStatus,
  type RiskScore, type RiskDimension,
} from './protection';

// Server-only Insure backend access (C-129). Calls the real Insure read-surface
// (identity-service) via the gateway with the inter-service key, and maps the
// backend rows to the frontend shape. READ-ONLY (Custody Hard-Gate): there is no
// escrow/custody call here — Insure holds no Pi. Real data end-to-end (C-135 §4):
// the risk score is the user's OWN data (null unless live — never a fabricated
// sample); the protection surfaces are Insure's definitional catalog. NEW-A: the
// gateway URL is server-only (API_GATEWAY_URL) — never shipped to the client.
const GW = process.env.API_GATEWAY_URL ?? '';

const gwHeaders = () => ({
  'Content-Type': 'application/json',
  'x-request-id': crypto.randomUUID(),
  ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
});

// enum LIVE_READONLY → 'live-readonly'
const statusFromBackend = (v: unknown): ProtectionStatus =>
  String(v ?? '').toLowerCase().replace(/_/g, '-') as ProtectionStatus;

// backend (insure_protections) → frontend Protection (a read-only description).
export function protectionFromBackend(p: Record<string, unknown>): Protection {
  const how = Array.isArray(p.how_it_works) ? (p.how_it_works as unknown[]).map(String) : [];
  return {
    id:         String(p.slug ?? ''),
    kind:       String(p.kind ?? '').toLowerCase() as ProtectionKind,
    title:      String(p.title ?? ''),
    summary:    String(p.summary ?? ''),
    ownedBy:    String(p.owned_by ?? ''),
    status:     statusFromBackend(p.status),
    howItWorks: how,
  };
}

const RISK_BANDS: readonly RiskScore['band'][] = ['LOW', 'MODERATE', 'ELEVATED'];

/** A number the backend actually sent — never one filled in for it. */
const sent = (v: unknown): number | null =>
  v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);

// backend (insure_risk_profiles) → frontend RiskScore (presented, never re-derived).
//
// Unknown is never a finding (TEC evidence rule 1). This used to read a missing band
// as 'MODERATE' and a missing number as 0 — telling a person their risk had been
// assessed as middling when nothing had been assessed. An incomplete snapshot is no
// snapshot: null, which the screen words as "no risk profile yet". A dimension with
// no value is left out rather than drawn as an empty bar.
export function riskFromBackend(r: Record<string, unknown>): RiskScore | null {
  const band    = String(r.band ?? '') as RiskScore['band'];
  const overall = sent(r.overall);
  if (!RISK_BANDS.includes(band) || overall === null) return null;

  const dims = Array.isArray(r.dimensions) ? (r.dimensions as Record<string, unknown>[]) : [];
  return {
    overall,
    band,
    note: String(r.note ?? ''),
    dimensions: dims.flatMap((d): RiskDimension[] => {
      const value  = sent(d.value);
      const weight = sent(d.weight);
      return value === null || weight === null ? [] : [{
        key:   String(d.key ?? ''),
        label: String(d.label ?? ''),
        value,
        weight,
      }];
    }),
  };
}

export interface ResolvedProtectionSurface {
  risk:        RiskScore | null;   // the caller's OWN risk — null unless live
  protections: Protection[];       // Insure's definitional protection catalog
  source:      'live' | 'catalog';
}

// The caller's OWN risk snapshot + the protection catalog. Real data end-to-end
// (C-135 §4): the risk score is user data — null unless the live backend returns a
// snapshot (never a fabricated sample, even on a live-but-empty read). The
// protection surfaces are Insure's definitional catalog (shown always). `owner` is
// derived from the session by the BFF (never a client param, P6).
export async function resolveOwnProtection(owner: string | null): Promise<ResolvedProtectionSurface> {
  if (GW && owner) {
    try {
      const res = await fetch(`${GW}/api/identity/insure/risk/${encodeURIComponent(owner)}`, {
        headers: gwHeaders(), cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const rows = data?.data?.protections;
        const riskRow = data?.data?.risk;
        if (Array.isArray(rows)) {
          return {
            risk:        riskRow ? riskFromBackend(riskRow as Record<string, unknown>) : null,
            protections: rows.map((p) => protectionFromBackend(p as Record<string, unknown>)),
            source:      'live',
          };
        }
      }
    } catch { /* fall through to the definitional catalog (risk unknown) */ }
  }
  return { risk: null, protections: PROTECTIONS, source: 'catalog' };
}

export interface ResolvedProtection { protection: Protection | null; source: 'live' | 'catalog'; }

// One protection surface by id from the definitional catalog — live backend first,
// local catalog otherwise (the surfaces are Insure's own product content, not user
// data). A live 404 is authoritative (protection: null, source: 'live').
export async function resolveProtectionDetail(id: string): Promise<ResolvedProtection> {
  if (GW) {
    try {
      const res = await fetch(`${GW}/api/identity/insure/protection/${encodeURIComponent(id)}`, {
        headers: gwHeaders(), cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const p = data?.data?.protection;
        if (p) return { protection: protectionFromBackend(p as Record<string, unknown>), source: 'live' };
      }
      if (res.status === 404) return { protection: null, source: 'live' };
    } catch { /* fall through to the definitional catalog */ }
  }
  return { protection: getProtection(id), source: 'catalog' };
}
