import { AVAILABLE_LANGUAGES, AVAILABLE_THEMES, useSettings, type Language, type ThemeMode } from '../context/SettingsContext';
import { IconBot, IconGlobe, IconMoon, IconSettings, IconSun } from './Icons';

const cardBase: React.CSSProperties = {
  border: '1px solid #374151',
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
  onClick: () => void;
};

function OptionCard({ icon, label, active, available, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      disabled={!available}
      onClick={onClick}
      title={available ? undefined : 'Em breve'}
      style={{
        ...cardBase,
        background: active ? '#1e293b' : '#111827',
        borderColor: active ? '#3b82f6' : '#374151',
        color: available ? (active ? '#e5e7eb' : '#9ca3af') : '#4b5563',
        cursor: available ? 'pointer' : 'not-allowed',
      }}
    >
      {icon}
      <span style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '0.7rem', color: available ? '#10b981' : '#6b7280' }}>
          {available ? '● ativo' : '○ em breve'}
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
  const { theme, setTheme, language, setLanguage } = useSettings();

  return (
    <div>
      <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <IconSettings size={22} /> Configurações
      </h2>
      <p style={{ color: '#9ca3af' }}>
        Preferências da plataforma: visual, idioma e (em breve) o motor de IA padrão do AI Consultant.
      </p>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <IconMoon size={16} /> Aparência
        </h3>
        <p style={{ color: '#9ca3af', marginTop: 0, fontSize: '0.85rem' }}>
          Tema visual da interface - o modo claro está em desenvolvimento.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <OptionCard
            icon={<IconMoon size={17} />}
            label="Escuro"
            active={theme === 'dark'}
            available={AVAILABLE_THEMES.includes('dark' as ThemeMode)}
            onClick={() => setTheme('dark')}
          />
          <OptionCard
            icon={<IconSun size={17} />}
            label="Claro"
            active={theme === 'light'}
            available={AVAILABLE_THEMES.includes('light' as ThemeMode)}
            onClick={() => setTheme('light')}
          />
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <IconGlobe size={16} /> Idioma
        </h3>
        <p style={{ color: '#9ca3af', marginTop: 0, fontSize: '0.85rem' }}>
          Idioma dos textos da plataforma - o inglês está em desenvolvimento.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <OptionCard
            icon={<IconGlobe size={17} />}
            label="Português"
            active={language === 'pt'}
            available={AVAILABLE_LANGUAGES.includes('pt' as Language)}
            onClick={() => setLanguage('pt')}
          />
          <OptionCard
            icon={<IconGlobe size={17} />}
            label="English"
            active={language === 'en'}
            available={AVAILABLE_LANGUAGES.includes('en' as Language)}
            onClick={() => setLanguage('en')}
          />
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <IconBot size={16} /> Motor de IA padrão
        </h3>
        <p style={{ color: '#9ca3af', marginTop: 0, fontSize: '0.85rem', maxWidth: '640px' }}>
          Em breve: escolha aqui o motor de IA padrão (Ollama, Anthropic, OpenAI) para todo o AI Consultant. Por
          enquanto, o motor é selecionado diretamente no módulo <strong>AI Consultant</strong>, a cada análise.
        </p>
      </section>
    </div>
  );
}
