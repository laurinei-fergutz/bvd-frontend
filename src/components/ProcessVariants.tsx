import type { ProcessVariant } from '../services/api';
import { IconTrophy } from './Icons';

type Props = {
  variants: ProcessVariant[];
  checkedIndices: Set<number>;
  onToggle: (index: number) => void;
};

export default function ProcessVariants({ variants, checkedIndices, onToggle }: Props) {
  if (variants.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {variants.map((variant, idx) => {
        const checked = checkedIndices.has(idx);
        return (
          <div
            key={idx}
            style={{
              background: '#111827',
              border: `1px solid ${idx === 0 ? '#10b981' : '#374151'}`,
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              opacity: checked ? 1 : 0.6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(idx)}
                  style={{ cursor: 'pointer' }}
                />
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: idx === 0 ? '#10b981' : '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  {idx === 0 ? (
                    <>
                      <IconTrophy size={14} /> Caminho Feliz
                    </>
                  ) : (
                    `Variante ${idx + 1}`
                  )}
                </span>
              </label>
              <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                {variant.case_count} {variant.case_count === 1 ? 'caso' : 'casos'} · {variant.percentage.toFixed(1)}%
              </span>
            </div>

            <div
              style={{
                height: '6px',
                borderRadius: '3px',
                background: '#1f2937',
                marginBottom: '0.6rem',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${variant.percentage}%`,
                  background: idx === 0 ? '#10b981' : '#3b82f6',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
              {variant.sequence.map((step, stepIdx) => (
                <span key={stepIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span
                    style={{
                      background: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '999px',
                      padding: '0.2rem 0.65rem',
                      color: '#e5e7eb',
                    }}
                  >
                    {step}
                  </span>
                  {stepIdx < variant.sequence.length - 1 && <span style={{ color: '#6b7280' }}>→</span>}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
