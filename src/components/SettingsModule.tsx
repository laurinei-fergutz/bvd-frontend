import { AVAILABLE_LANGUAGES, AVAILABLE_THEMES, useSettings, type Language, type ThemeMode } from '../context/SettingsContext';
import { IconBot, IconGlobe, IconMoon, IconSettings, IconSun } from './Icons';

const cardBase: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.85rem 1rem',
  fontSize: '0.85rem',
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  minWidth: '160px',
};

type OptionCardProps = {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  available: boolean;
  activeLabel: string;
  comingSoonLabel: string;
  comingSoonTitle: string;
  onClick: () => void;
};

function OptionCard({
  icon,
  label,
  active,
  available,
  activeLabel,
  comingSoonLabel,
  comingSoonTitle,
  onClick,
}: OptionCardProps) {
  return (
    <button
      type="button"
      disabled={!available}
      onClick={onClick}
      title={available ? undefined : comingSoonTitle}
      style={{
        ...cardBase,
        background: active ? 'var(--bg-active)' : 'var(--bg-surface)',
        borderColor: active ? 'var(--accent-blue)' : 'var(--border)',
        color: available ? (active ? 'var(--text-primary)' : 'var(--text-secondary)') : 'var(--muted)',
        cursor: available ? 'pointer' : 'not-allowed',
      }}
    >
      {icon}
      <span style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '0.7rem', color: available ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
          {available ? activeLabel : comingSoonLabel}
        </div>
      </span>
    </button>
  );
}

const sectionStyle: React.CSSProperties = {
  marginTop: '2rem',
};

const sectionTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '0.25rem',
};

export default function SettingsModule() {
  const { theme, setTheme, language, setLanguage, t } = useSettings();

  return (
    <div>
      <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <IconSettings size={22} /> {t('settings.title')}
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>{t('settings.subtitle')}</p>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <IconMoon size={16} /> {t('settings.appearance')}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0, fontSize: '0.85rem' }}>
          {t('settings.appearanceSubtitle')}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <OptionCard
            icon={<IconMoon size={17} />}
            label={t('settings.dark')}
            active={theme === 'dark'}
            available={AVAILABLE_THEMES.includes('dark' as ThemeMode)}
            activeLabel={t('settings.active')}
            comingSoonLabel={t('settings.comingSoon')}
            comingSoonTitle={t('settings.comingSoonTitle')}
            onClick={() => setTheme('dark')}
          />
          <OptionCard
            icon={<IconSun size={17} />}
            label={t('settings.light')}
            active={theme === 'light'}
            available={AVAILABLE_THEMES.includes('light' as ThemeMode)}
            activeLabel={t('settings.active')}
            comingSoonLabel={t('settings.comingSoon')}
            comingSoonTitle={t('settings.comingSoonTitle')}
            onClick={() => setTheme('light')}
          />
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <IconGlobe size={16} /> {t('settings.language')}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0, fontSize: '0.85rem' }}>
          {t('settings.languageSubtitle')}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <OptionCard
            icon={<IconGlobe size={17} />}
            label={t('settings.portuguese')}
            active={language === 'pt'}
            available={AVAILABLE_LANGUAGES.includes('pt' as Language)}
            activeLabel={t('settings.active')}
            comingSoonLabel={t('settings.comingSoon')}
            comingSoonTitle={t('settings.comingSoonTitle')}
            onClick={() => setLanguage('pt')}
          />
          <OptionCard
            icon={<IconGlobe size={17} />}
            label={t('settings.english')}
            active={language === 'en'}
            available={AVAILABLE_LANGUAGES.includes('en' as Language)}
            activeLabel={t('settings.active')}
            comingSoonLabel={t('settings.comingSoon')}
            comingSoonTitle={t('settings.comingSoonTitle')}
            onClick={() => setLanguage('en')}
          />
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <IconBot size={16} /> {t('settings.defaultEngine')}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0, fontSize: '0.85rem', maxWidth: '640px' }}>
          {t('settings.defaultEngineText')} <strong>AI Consultant</strong>
          {t('settings.defaultEngineTextSuffix')}
        </p>
      </section>
    </div>
  );
}
