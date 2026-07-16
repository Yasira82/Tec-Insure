// TEC Insure — protection surface detail (C-129), read-only, statically generated.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { PROTECTIONS, getProtection, KIND_META, STATUS_META } from '@/lib/insure/protection';

export function generateStaticParams() {
  return PROTECTIONS.map((p) => ({ id: p.id }));
}

export default async function ProtectionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = getProtection(id);
  if (!p) notFound();

  const k = KIND_META[p.kind];
  const s = STATUS_META[p.status];

  return (
    <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: '#e7e7ea', padding: '32px 22px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link href="/app" style={{ color: TEC_COLORS.gold, fontSize: 13, textDecoration: 'none' }}>← Back</Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <span style={{ fontSize: 30 }}>{k.icon}</span>
          <h1 style={{ color: TEC_COLORS.gold, margin: 0, fontSize: 24 }}>{p.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: s.tone, border: `1px solid ${s.tone}55`, borderRadius: 20, padding: '3px 10px' }}>{s.label}</span>
          <span style={{ fontSize: 12, opacity: 0.7, border: '1px solid #ffffff22', borderRadius: 20, padding: '3px 10px' }}>{k.label}</span>
        </div>

        <p style={{ marginTop: 16, lineHeight: 1.6, opacity: 0.9 }}>{p.summary}</p>
        <p style={{ opacity: 0.6, fontSize: 13 }}>Owned by: <strong>{p.ownedBy}</strong></p>

        <h2 style={{ color: TEC_COLORS.gold, fontSize: 16, marginTop: 26 }}>How it works</h2>
        <ol style={{ lineHeight: 1.7, opacity: 0.9, paddingLeft: 20 }}>
          {p.howItWorks.map((step, i) => <li key={i} style={{ marginBottom: 6 }}>{step}</li>)}
        </ol>

        {p.status === 'gated' && (
          <p style={{ marginTop: 20, fontSize: 12.5, opacity: 0.7, lineHeight: 1.6, borderLeft: `2px solid ${STATUS_META.gated.tone}`, paddingLeft: 12 }}>
            <strong>Gated (C-129 P0).</strong> This surface holds user funds, so no real flow ships until
            legal review + tec-payment-service custody + SYSTEM governance are all done. Until then it is a
            read-only description — Insure never custodies Pi (Kernel Invariant #8).
          </p>
        )}
      </div>
    </main>
  );
}
