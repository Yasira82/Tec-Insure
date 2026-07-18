import {
  RISK_SCORE, PROTECTIONS, getProtection,
  type Protection, type ProtectionKind, type ProtectionStatus,
  type RiskScore, type RiskDimension,
} from './protection';

// Server-only Insure backend access (C-129). Calls the real Insure read-surface
// (identity-service) via the gateway with the inter-service key, and maps the
// backend rows to the frontend shape. READ-ONLY (Custody Hard-Gate): there is no
// escrow/custody call here — Insure holds no Pi. Everything degrades to the curated
// sample so the page is never blank / never 500s. NEW-A: the gateway URL is
// server-only (API_GATEWAY_URL) — never shipped to the client.
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

// backend (insure_risk_profiles) → frontend RiskScore (presented, never re-derived).
export function riskFromBackend(r: Record<string, unknown>): RiskScore {
  const dims = Array.isArray(r.dimensions) ? (r.dimensions as Record<string, unknown>[]) : [];
  return {
    overall: Number(r.overall ?? 0),
    band:    String(r.band ?? 'MODERATE') as RiskScore['band'],
    note:    String(r.note ?? ''),
    dimensions: dims.map((d): RiskDimension => ({
      key:    String(d.key ?? ''),
      label:  String(d.label ?? ''),
      value:  Number(d.value ?? 0),
      weight: Number(d.weight ?? 0),
    })),
  };
}

export interface ResolvedProtectionSurface {
  risk:        RiskScore;
  protections: Protection[];
  source:      'live' | 'sample';
}

// The caller's OWN risk snapshot + the protection catalog — live backend first,
// curated sample as fallback. `owner` is derived from the session by the BFF (never
// a client param, P6). A live snapshot may be absent (new user) → keep the sample
// risk but use the live catalog.
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
            risk:        riskRow ? riskFromBackend(riskRow as Record<string, unknown>) : RISK_SCORE,
            protections: rows.map((p) => protectionFromBackend(p as Record<string, unknown>)),
            source:      'live',
          };
        }
      }
    } catch { /* fall through to the curated sample */ }
  }
  return { risk: RISK_SCORE, protections: PROTECTIONS, source: 'sample' };
}

export interface ResolvedProtection { protection: Protection | null; source: 'live' | 'sample'; }

// One protection surface by id — live backend first, sample fallback. A live 404 is
// authoritative (protection: null, source: 'live').
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
    } catch { /* fall through to the curated sample */ }
  }
  return { protection: getProtection(id), source: 'sample' };
}
