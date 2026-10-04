import { describe, it, expect } from 'vitest';
import { riskFromBackend } from '@/lib/insure/server';

// "Unknown is never Positive Evidence" — and never neutral either. A risk band the
// backend did not send is NOT "MODERATE": showing it as one tells a person their
// risk was assessed as middling when nothing was assessed at all. An unknown
// snapshot is no snapshot (null), which the screen already words as "no profile".
describe('riskFromBackend — an unknown is never shown as a finding', () => {
  const valid = {
    overall: 78, band: 'LOW', note: 'from Analytics',
    dimensions: [{ key: 'dispute_rate', label: 'Dispute-free rate', value: 96, weight: 25 }],
  };

  it('maps a complete snapshot', () => {
    expect(riskFromBackend(valid)).toEqual({
      overall: 78, band: 'LOW', note: 'from Analytics',
      dimensions: [{ key: 'dispute_rate', label: 'Dispute-free rate', value: 96, weight: 25 }],
    });
  });

  it('a missing band is no snapshot — never MODERATE', () => {
    const { band: _band, ...noBand } = valid;
    expect(riskFromBackend(noBand)).toBeNull();
  });

  it('a band outside the three known ones is no snapshot', () => {
    expect(riskFromBackend({ ...valid, band: 'SAFE' })).toBeNull();
  });

  it('a missing overall is no snapshot — never 0', () => {
    const { overall: _overall, ...noOverall } = valid;
    expect(riskFromBackend(noOverall)).toBeNull();
    expect(riskFromBackend({ ...valid, overall: 'n/a' })).toBeNull();
  });

  it('a dimension without a value is dropped, not drawn as 0', () => {
    const r = riskFromBackend({
      ...valid,
      dimensions: [
        { key: 'activity_history', label: 'Activity history', weight: 20 },
        { key: 'dispute_rate', label: 'Dispute-free rate', value: 96, weight: 25 },
      ],
    });
    expect(r?.dimensions.map((d) => d.key)).toEqual(['dispute_rate']);
  });
});
