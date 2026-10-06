'use client';

import { SignInGate } from '@/components/pi/SignInGate';

// TEC Insure — Risk Protection home (C-129), read-only V1.
// Presents a risk score + the protection surfaces (escrow/recovery/beneficiary).
// Moves NO Pi: escrow custody is hard-gated to payment-service (Invariant #8).
// App shell: Home / Protection / Pro / Settings bottom nav.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { useTranslation } from '@/lib/i18n';
import { useMe } from '@/lib-client/hooks/useMe';
import { PROTECTIONS, KIND_META, STATUS_META, type RiskScore, type Protection } from '@/lib/insure/protection';
import InsurePro from './components/InsurePro';
import { BottomNav, type InsTab } from './components/BottomNav';
import { SettingsView } from './components/SettingsView';

function InsureHome() {
  const { t } = useTranslation();
  const me = useMe();
  const [tab, setTab] = useState<InsTab>('home');

  // The protection surfaces are Insure's definitional catalog (shown always). The
  // risk score is the caller's OWN data (C-135 §4): null until the live BFF returns
  // it — never a fabricated sample. Insure presents risk; it never re-derives it.
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

  const headerTitle =
    tab === 'protection' ? t.insure.nav.protection
    : tab === 'pro' ? t.insure.nav.pro
    : tab === 'settings' ? t.insure.nav.settings
    : t.insure.brand;

  return (
    <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: '#e7e7ea', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 22px calc(96px + env(safe-area-inset-bottom))' }}>
        <header style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 34 }}>🛡️</div>
          <h1 style={{ color: TEC_COLORS.gold, margin: '4px 0 2px', fontSize: 26 }}>{headerTitle}</h1>
          {tab === 'home' && <p style={{ opacity: 0.7, margin: 0, fontSize: 14 }}>{t.insure.tagline}</p>}
        </header>

        {tab === 'home' && (
          <>
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
                <div style={{ fontWeight: 700 }}>{t.insure.riskEmpty.heading}</div>
                {/* C10 — a signed-in (even Pro) user was told to "Sign in with Pi".
                    Nothing is said until /me answers. */}
                {!me.loading && (
                  <p style={{ opacity: 0.65, fontSize: 13, lineHeight: 1.6, maxWidth: 460, margin: '6px auto 0' }}>
                    {me.authenticated ? t.insure.riskEmpty.noProfile : t.insure.riskEmpty.signedOut}
                  </p>
                )}
              </section>
            )}

            {/* Custody boundary note */}
            <p style={{ opacity: 0.55, fontSize: 12, marginTop: 20, lineHeight: 1.6, borderLeft: `2px solid ${TEC_COLORS.gold}55`, paddingLeft: 12 }}>
              <strong>Your money stays safe.</strong> Insure never holds your Pi — any funds are
              held securely by the payment system. Escrow and claims will open once the
              proper legal and safety steps are complete. Risk figures shown are estimates,
              not financial advice.
            </p>
          </>
        )}

        {tab === 'protection' && (
          <>
            {/* Protection surfaces */}
            <h2 style={{ color: TEC_COLORS.gold, fontSize: 16, marginTop: 16, marginBottom: 12 }}>{t.insure.protectionSurfaces}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {protections.map((p) => {
                const k = KIND_META[p.kind]; const st = STATUS_META[p.status];
                return (
                  <Link key={p.id} href={`/protection/${p.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: 16, background: TEC_COLORS.surface, borderRadius: 12, border: '1px solid #ffffff10', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 20 }}>{k.icon}</span>
                        <span style={{ fontSize: 11, color: st.tone, border: `1px solid ${st.tone}55`, borderRadius: 20, padding: '2px 8px' }}>{st.label}</span>
                      </div>
                      <div style={{ color: '#e7e7ea', fontWeight: 700, marginTop: 10 }}>{p.title}</div>
                      <div style={{ opacity: 0.65, fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>{p.summary}</div>
                      <div style={{ opacity: 0.5, fontSize: 11, marginTop: 10 }}>Owned by: {p.ownedBy}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {tab === 'pro' && (
          <>
            <h2 style={{ color: TEC_COLORS.gold, fontSize: 16, marginTop: 16, marginBottom: 12 }}>{t.insure.upgrade}</h2>
            {/* Insure Pro — real Pi U2A payment (subscription). */}
            <InsurePro />
          </>
        )}

        {tab === 'settings' && <SettingsView />}
      </div>

      <BottomNav active={tab} onSelect={setTab} />
    </main>
  );
}

// The door: a sign-in button before any screen when there is no session
// (SignInGate — C-123 §10; owner, 2026-10-06). A visit from the Hub arrives
// signed in (§12) and goes straight through.
export default function InsureHomeGated() {
  return <SignInGate><InsureHome /></SignInGate>;
}
