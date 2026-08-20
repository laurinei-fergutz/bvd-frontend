import type { ProcessVariant } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { IconTrophy } from './Icons';

type Props = {
  variants: ProcessVariant[];
  checkedIndices: Set<number>;
  onToggle: (index: number) => void;
};

export default function ProcessVariants({ variants, checkedIndices, onToggle }: Props) {
  const { t } = useSettings();
  if (variants.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {variants.map((variant, idx) => {
        const checked = checkedIndices.has(idx);
        return (
          <div
            key={idx}
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${idx === 0 ? 'var(--accent-green)' : 'var(--border)'}`,
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
                    color: idx === 0 ? 'var(--accent-green)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  {idx === 0 ? (
                    <>
                      <IconTrophy size={14} /> {t('variants.happyPath')}
                    </>
                  ) : (
                    `${t('variants.variant')} ${idx + 1}`
                  )}
                </span>
              </label>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {variant.case_count} {variant.case_count === 1 ? t('variants.case') : t('variants.casesPlural')} ·{' '}
                {variant.percentage.toFixed(1)}%
              </span>
            </div>

            <div
              style={{
                height: '6px',
                borderRadius: '3px',
                background: 'var(--bg-surface-alt)',
                marginBottom: '0.6rem',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${variant.percentage}%`,
                  background: idx === 0 ? 'var(--accent-green)' : 'var(--accent-blue)',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
              {variant.sequence.map((step, stepIdx) => (
                <span key={stepIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span
                    style={{
                      background: 'var(--bg-surface-alt)',
                      border: '1px solid var(--border)',
                      borderRadius: '999px',
                      padding: '0.2rem 0.65rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {step}
                  </span>
                  {stepIdx < variant.sequence.length - 1 && (
                    <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
