import { useState } from 'react';

import { useSettings } from '../context/SettingsContext';
import { IconRocket } from './Icons';

const KEYFRAMES = `
@keyframes wsFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes wsFadeScale { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
@keyframes wsFloatIcon { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes wsFloat1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(34px, -46px); } }
@keyframes wsFloat2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-46px, 34px); } }
@keyframes wsFloat3 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(24px, 24px); } }
@keyframes wsGradientShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
`;

const wrapperStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #020817 0%, #0b1220 45%, #111827 75%, #0b1220 100%)',
  backgroundSize: '200% 200%',
  animation: 'wsGradientShift 14s ease infinite',
  transition: 'opacity 0.5s ease, transform 0.5s ease',
};

const blobBase: React.CSSProperties = {
  position: 'absolute',
  borderRadius: '50%',
  filter: 'blur(90px)',
  pointerEvents: 'none',
};

const contentStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  padding: '2rem',
  maxWidth: '560px',
};

const eyebrowStyle: React.CSSProperties = {
  margin: '1.5rem 0 0',
  fontSize: '0.85rem',
  fontWeight: 700,
  letterSpacing: '0.35em',
  color: '#60a5fa',
  textTransform: 'uppercase',
};

const titleStyle: React.CSSProperties = {
  margin: '0.5rem 0 0',
  fontSize: 'clamp(3rem, 9vw, 4.5rem)',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  lineHeight: 1,
  background: 'linear-gradient(90deg, #e5e7eb 0%, #93c5fd 50%, #c4b5fd 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

const subtitleStyle: React.CSSProperties = {
  margin: '0.75rem 0 0',
  fontSize: '1.15rem',
  fontWeight: 500,
  color: '#e5e7eb',
};

const descStyle: React.CSSProperties = {
  margin: '1rem 0 0',
  fontSize: '0.95rem',
  color: '#9ca3af',
  lineHeight: 1.6,
};

const buttonStyle: React.CSSProperties = {
  marginTop: '2.25rem',
  background: 'linear-gradient(90deg, #3b82f6, #7c3aed)',
  color: 'white',
  border: 'none',
  borderRadius: '999px',
  padding: '0.85rem 2.5rem',
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 10px 30px -8px #3b82f680',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

type Props = {
  onEnter: () => void;
};

export default function WelcomeScreen({ onEnter }: Props) {
  const { t } = useSettings();
  const [exiting, setExiting] = useState(false);
  const [hover, setHover] = useState(false);

  const handleEnter = () => {
    setExiting(true);
    window.setTimeout(onEnter, 450);
  };

  return (
    <div
      style={{
        ...wrapperStyle,
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(1.03)' : 'scale(1)',
      }}
    >
      <style>{KEYFRAMES}</style>

      <div style={{ ...blobBase, top: '-10%', left: '-8%', width: '440px', height: '440px', background: '#3b82f6', opacity: 0.32, animation: 'wsFloat1 15s ease-in-out infinite' }} />
      <div style={{ ...blobBase, bottom: '-14%', right: '-8%', width: '500px', height: '500px', background: '#7c3aed', opacity: 0.28, animation: 'wsFloat2 17s ease-in-out infinite' }} />
      <div style={{ ...blobBase, top: '35%', right: '8%', width: '300px', height: '300px', background: '#10b981', opacity: 0.16, animation: 'wsFloat3 19s ease-in-out infinite' }} />

      <div style={contentStyle}>
        <div style={{ animation: 'wsFadeScale 0.9s ease both, wsFloatIcon 3.2s ease-in-out 0.9s infinite' }}>
          <IconRocket size={62} strokeWidth={1.3} style={{ color: '#60a5fa', filter: 'drop-shadow(0 0 22px #3b82f699)' }} />
        </div>

        <p style={{ ...eyebrowStyle, animation: 'wsFadeUp 0.7s ease 0.35s both' }}>AITICOS</p>
        <h1 style={{ ...titleStyle, animation: 'wsFadeUp 0.7s ease 0.5s both' }}>BVD</h1>
        <p style={{ ...subtitleStyle, animation: 'wsFadeUp 0.7s ease 0.65s both' }}>Business Value Discovery</p>
        <p style={{ ...descStyle, animation: 'wsFadeUp 0.7s ease 0.8s both' }}>{t('welcome.description')}</p>

        <button
          type="button"
          onClick={handleEnter}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            ...buttonStyle,
            animation: 'wsFadeUp 0.7s ease 1s both',
            transform: hover ? 'translateY(-2px)' : 'translateY(0)',
            boxShadow: hover ? '0 14px 34px -8px #7c3aedaa' : buttonStyle.boxShadow,
          }}
        >
          {t('welcome.enter')}
        </button>
      </div>
    </div>
  );
}
