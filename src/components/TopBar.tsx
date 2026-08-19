export default function TopBar() {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1rem 2rem',
        borderBottom: '1px solid #1f2937',
        background: '#0b1220',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>🚀</span>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: '#60a5fa',
            textTransform: 'uppercase',
          }}
        >
          AITICOS
        </p>
        <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#e5e7eb' }}>
          BVD <span style={{ fontWeight: 400, color: '#9ca3af' }}>— Business Value Discovery</span>
        </p>
      </div>
    </header>
  );
}
