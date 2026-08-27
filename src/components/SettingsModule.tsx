import { useEffect, useState } from 'react';

import {
  AVAILABLE_LANGUAGES,
  AVAILABLE_THEMES,
  useSettings,
  type Language,
  type PromptMode,
  type ThemeMode,
} from '../context/SettingsContext';
import { fetchLLMEngines } from '../services/api';
import {
  IconActivity,
  IconAlertTriangle,
  IconBot,
  IconBrain,
  IconDocument,
  IconGlobe,
  IconMoon,
  IconSettings,
  IconSun,
} from './Icons';

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
  inactiveLabel: string;
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
  inactiveLabel,
  comingSoonLabel,
  comingSoonTitle,
  onClick,
}: OptionCardProps) {
  const statusLabel = !available ? comingSoonLabel : active ? activeLabel : inactiveLabel;
  const statusColor = available && active ? 'var(--accent-green)' : 'var(--text-tertiary)';

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
        <div style={{ fontSize: '0.7rem', color: statusColor }}>{statusLabel}</div>
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
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    promptMode,
    setPromptMode,
    observabilityEnabled,
    setObservabilityEnabled,
    t,
  } = useSettings();
  const [systemPrompt, setSystemPrompt] = useState('');
  const [systemPromptLoading, setSystemPromptLoading] = useState(true);
  const [systemPromptError, setSystemPromptError] = useState('');

  useEffect(() => {
    fetchLLMEngines()
      .then((res) => setSystemPrompt(res.default_system_prompt))
      .catch((err) => setSystemPromptError(err instanceof Error ? err.message : t('ai.enginesError')))
      .finally(() => setSystemPromptLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            inactiveLabel={t('settings.selectOption')}
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
            inactiveLabel={t('settings.selectOption')}
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
            inactiveLabel={t('settings.selectOption')}
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
            inactiveLabel={t('settings.selectOption')}
            comingSoonLabel={t('settings.comingSoon')}
            comingSoonTitle={t('settings.comingSoonTitle')}
            onClick={() => setLanguage('en')}
          />
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <IconActivity size={16} /> {t('settings.observability')}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0, fontSize: '0.85rem', maxWidth: '640px' }}>
          {t('settings.observabilitySubtitle')}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <OptionCard
            icon={<IconActivity size={17} />}
            label={t('settings.observabilityEnabled')}
            active={observabilityEnabled}
            available
            activeLabel={t('settings.active')}
            inactiveLabel={t('settings.selectOption')}
            comingSoonLabel={t('settings.comingSoon')}
            comingSoonTitle={t('settings.comingSoonTitle')}
            onClick={() => setObservabilityEnabled(true)}
          />
          <OptionCard
            icon={<IconAlertTriangle size={17} />}
            label={t('settings.observabilityDisabled')}
            active={!observabilityEnabled}
            available
            activeLabel={t('settings.active')}
            inactiveLabel={t('settings.selectOption')}
            comingSoonLabel={t('settings.comingSoon')}
            comingSoonTitle={t('settings.comingSoonTitle')}
            onClick={() => setObservabilityEnabled(false)}
          />
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <IconDocument size={16} /> {t('settings.promptSection')}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0, fontSize: '0.85rem' }}>
          {t('settings.promptSectionSubtitle')}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <OptionCard
            icon={<IconDocument size={17} />}
            label={t('settings.promptPredefined')}
            active={promptMode === 'predefined'}
            available
            activeLabel={t('settings.active')}
            inactiveLabel={t('settings.selectOption')}
            comingSoonLabel={t('settings.comingSoon')}
            comingSoonTitle={t('settings.comingSoonTitle')}
            onClick={() => setPromptMode('predefined' as PromptMode)}
          />
          <OptionCard
            icon={<IconBrain size={17} />}
            label={t('settings.promptLlamaGenerated')}
            active={promptMode === 'llama'}
            available
            activeLabel={t('settings.active')}
            inactiveLabel={t('settings.selectOption')}
            comingSoonLabel={t('settings.comingSoon')}
            comingSoonTitle={t('settings.comingSoonTitle')}
            onClick={() => setPromptMode('llama' as PromptMode)}
          />
        </div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: '0.6rem', maxWidth: '640px' }}>
          {t('settings.promptLlamaGeneratedDesc')}
        </p>

        {promptMode === 'llama' && (
          <p
            style={{
              color: 'var(--accent-amber)',
              fontSize: '0.8rem',
              marginTop: '0.5rem',
              maxWidth: '640px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.4rem',
            }}
          >
            <IconAlertTriangle size={14} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
            {t('settings.promptLlamaNotImplemented')}
          </p>
        )}

        <details style={{ marginTop: '1rem' }}>
          <summary
            style={{ cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <IconDocument size={15} /> {t('ai.viewSystemPrompt')}
          </summary>
          <pre
            style={{
              background: 'var(--bg-surface)',
              padding: '1rem',
              borderRadius: '4px',
              marginTop: '0.5rem',
              overflow: 'auto',
              maxHeight: '300px',
              fontSize: '0.75rem',
              whiteSpace: 'pre-wrap',
              color: 'var(--text-body)',
            }}
          >
            {systemPromptLoading ? t('settings.currentPromptLoading') : systemPromptError || systemPrompt}
          </pre>
        </details>
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
