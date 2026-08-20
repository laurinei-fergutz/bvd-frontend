import { IconRocket } from './Icons';

export default function TopBar() {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-shell)',
        flexShrink: 0,
      }}
    >
      <IconRocket size={28} strokeWidth={1.6} style={{ color: 'var(--accent-blue-light)' }} />
      <div>
        <p
          style={{
            margin: 0,
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: 'var(--accent-blue-light)',
            textTransform: 'uppercase',
          }}
        >
          AITICOS
        </p>
        <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          BVD <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>— Business Value Discovery</span>
        </p>
      </div>
    </header>
  );
}
