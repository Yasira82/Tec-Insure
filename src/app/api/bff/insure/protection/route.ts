import { NextResponse } from 'next/server';
import { RISK_SCORE, PROTECTIONS } from '@/lib/insure/protection';

// GET /api/bff/insure/protection — the Risk Protection surface (C-129), read-only.
// Insure is the System of Protection: it PRESENTS a risk score and DESCRIBES the
// escrow / recovery / beneficiary surfaces. It moves NO Pi — escrow custody is
// hard-gated to tec-payment-service (Invariant #8). This V1 serves a curated
// SAMPLE (source:'sample'); when live it proxies the caller's OWN risk data
// (identity from the session cookie, never a param — P6), risk computed by
// Analytics, custody by payment-service.
export function GET() {
  return NextResponse.json(
    { source: 'sample', risk: RISK_SCORE, protections: PROTECTIONS },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  );
}
