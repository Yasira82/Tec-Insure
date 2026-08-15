'use client';

// TEC Insure — Risk Protection home (C-129), read-only V1.
// Presents a risk score + the protection surfaces (escrow/recovery/beneficiary).
// Moves NO Pi: escrow custody is hard-gated to payment-service (Invariant #8).
import { useEffect, useState } from 'react';
import { InviteCard } from '@/components/referral/InviteCard';
import Link from 'next/link';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { PROTECTIONS, KIND_META, STATUS_META, type RiskScore, type Protection } from '@/lib/insure/protection';
import InsurePro from './components/InsurePro';

export default function InsureHome() {
  // The protection surfaces are Insure's definitional catalog (shown always). The
  // risk score is the caller's OWN data (C-135 §4): null until the live BFF returns
  // it — never a fabricated sample. Insure presents risk; it never re-derives it
  // (custody + computation stay with payment-service + Analytics).
  const [r, setRisk] = useState<RiskScore | null>(null);
  const [protections, setProtections] = useState<Protection[]>(PROTECTIONS);
  useEffect(() => {
    let alive = true;
    fetch('/api/bff/insure/protection', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        if (d.source === 'live' && d.risk) setRisk(d.risk);
        if (Array.isArray(d.protections)) setProtections(d.protections);
      })
      .catch(() => { /* keep the definitional catalog; risk stays unknown */ });
    return () => { alive = false; };
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: '#e7e7ea', padding: '32px 22px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <header style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 34 }}>🛡️</div>
          <h1 style={{ color: TEC_COLORS.gold, margin: '4px 0 2px', fontSize: 26 }}>TEC Insure</h1>
          <p style={{ opacity: 0.7, margin: 0, fontSize: 14 }}>
            Risk Protection Runtime — protection is infrastructure, not a product. Read-only preview.
          </p>
        </header>

        {/* Risk Score — the caller's OWN data; honest when not signed in */}
        {r ? (
          <section style={{ marginTop: 24, padding: 20, background: TEC_COLORS.surface, borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: STATUS_META['live-readonly'].tone }}>{r.overall}</div>
              <div>
                <div style={{ fontWeight: 700 }}>Risk Score · <span style={{ color: TEC_COLORS.gold }}>{r.band}</span></div>
                <div style={{ opacity: 0.6, fontSize: 12, maxWidth: 520 }}>{r.note}</div>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              {r.dimensions.map((d) => (
                <div key={d.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                    <span style={{ opacity: 0.85 }}>{d.label}</span>
                    <span style={{ color: TEC_COLORS.gold }}>{d.value}</span>
                  </div>
                  <div style={{ height: 6, background: '#ffffff14', borderRadius: 6 }}>
                    <div style={{ height: 6, width: `${d.value}%`, background: TEC_COLORS.goldDark, borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section style={{ marginTop: 24, padding: '28px 20px', background: TEC_COLORS.surface, borderRadius: 14, textAlign: 'center' }}>
            <div style={{ fontWeight: 700 }}>Your risk score</div>
            <p style={{ opacity: 0.65, fontSize: 13, lineHeight: 1.6, maxWidth: 460, margin: '6px auto 0' }}>
              Sign in with Pi to see your personal risk snapshot. Risk is computed by Analytics from real
              activity and presented here — it appears once you have a profile.
            </p>
          </section>
        )}

        {/* Protection surfaces */}
        <h2 style={{ color: TEC_COLORS.gold, fontSize: 16, marginTop: 32, marginBottom: 12 }}>Protection surfaces</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {protections.map((p) => {
            const k = KIND_META[p.kind]; const s = STATUS_META[p.status];
            return (
              <Link key={p.id} href={`/protection/${p.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ padding: 16, background: TEC_COLORS.surface, borderRadius: 12, border: '1px solid #ffffff10', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 20 }}>{k.icon}</span>
                    <span style={{ fontSize: 11, color: s.tone, border: `1px solid ${s.tone}55`, borderRadius: 20, padding: '2px 8px' }}>{s.label}</span>
                  </div>
                  <div style={{ color: '#e7e7ea', fontWeight: 700, marginTop: 10 }}>{p.title}</div>
                  <div style={{ opacity: 0.65, fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>{p.summary}</div>
                  <div style={{ opacity: 0.5, fontSize: 11, marginTop: 10 }}>Owned by: {p.ownedBy}</div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Custody boundary note */}
        <p style={{ opacity: 0.55, fontSize: 12, marginTop: 20, lineHeight: 1.6, borderLeft: `2px solid ${TEC_COLORS.gold}55`, paddingLeft: 12 }}>
          <strong>Custody boundary.</strong> Insure never holds your Pi. Escrow is custodied by
          tec-payment-service only (Kernel Invariant #8); real hold/release ships after legal review +
          payment-service custody + SYSTEM governance. Risk figures are computed by Analytics and are
          indicative — never financial truth.
        </p>

        {/* Insure Pro */}
        <h2 style={{ color: TEC_COLORS.gold, fontSize: 16, marginTop: 32, marginBottom: 12 }}>Upgrade</h2>
        <InsurePro />
        <InviteCard />
      </div>
    </main>
  );
}
