import { NextRequest, NextResponse } from 'next/server';
import { resolveOwnProtection } from '@/lib/insure/server';

// GET /api/bff/insure/protection — the Risk Protection surface (C-129), read-only.
// Insure is the System of Protection: it PRESENTS a risk score and DESCRIBES the
// escrow / recovery / beneficiary surfaces. It moves NO Pi — escrow custody is
// hard-gated to tec-payment-service (Invariant #8). Identity is derived from the
// `tec_user` session cookie server-side — NEVER a query param or body (P6). The
// owner is passed to the backend (the Insure read-surface). The protection surfaces
// are Insure's definitional catalog; risk is the user's OWN data → null with no
// session / unreachable backend, never a fabricated sample (C-135 §4). Risk is
// computed by Analytics; Insure never re-derives it.
function ownerFromSession(req: NextRequest): string | null {
  try {
    const raw = req.cookies.get('tec_user')?.value ?? '';
    if (!raw) return null;
    let u: Record<string, unknown>;
    try { u = JSON.parse(raw); } catch { u = JSON.parse(decodeURIComponent(raw)); }
    const owner = (u.piUsername ?? u.username) as string | undefined;
    return owner && owner.trim() ? owner : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const owner = ownerFromSession(req);
  const { risk, protections, source } = await resolveOwnProtection(owner);
  return NextResponse.json(
    { source, risk, protections },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  );
}
