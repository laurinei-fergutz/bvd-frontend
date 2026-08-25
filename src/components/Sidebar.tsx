import { useSettings } from '../context/SettingsContext';
import { IconSettings, IconSliders } from './Icons';

export type ModuleId = 'datamapper' | 'processexplorer' | 'aiconsultant' | 'roistudio' | 'settings';

type ModuleStatus = {
  id: ModuleId;
  icon: React.ReactNode;
  label: string;
  /** Omit for utility entries (e.g. Settings) that have no "processed" state. */
  done?: boolean;
};

type Props = {
  activeModule: ModuleId;
  onSelect: (module: ModuleId) => void;
  modules: ModuleStatus[];
};

function renderModuleButton(
  module: ModuleStatus,
  active: boolean,
  onSelect: (id: ModuleId) => void,
  doneTitle: { done: string; notDone: string },
) {
  return (
    <button
      type="button"
      onClick={() => onSelect(module.id)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.65rem 0.75rem',
        borderRadius: '8px',
        border: 'none',
        background: active ? 'var(--bg-active)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '0.9rem',
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        textAlign: 'left',
        borderLeft: active ? '3px solid var(--accent-blue)' : '3px solid transparent',
        transition: 'background 0.15s ease',
      }}
    >
      <span>{module.icon}</span>
      <span style={{ flex: 1 }}>{module.label}</span>
      {module.done !== undefined && (
        <span
          title={module.done ? doneTitle.done : doneTitle.notDone}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: module.done ? 'var(--accent-green)' : 'var(--muted)',
            boxShadow: module.done ? '0 0 6px var(--accent-green-glow)' : 'none',
            flexShrink: 0,
          }}
        />
      )}
    </button>
  );
}

export default function Sidebar({ activeModule, onSelect, modules }: Props) {
  const { t } = useSettings();
  const settingsModule: ModuleStatus = { id: 'settings', icon: <IconSettings size={16} />, label: t('sidebar.settings') };
  const doneTitle = { done: t('sidebar.processed'), notDone: t('sidebar.notProcessed') };
  const comingSoon = [{ icon: <IconSliders size={16} />, label: t('sidebar.commandCenter') }];

  return (
    <nav
      style={{
        width: '260px',
        flexShrink: 0,
        background: 'var(--bg-shell)',
        borderRight: '1px solid var(--border-subtle)',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        overflowY: 'auto',
      }}
    >
      <div>
        <p style={sectionLabelStyle}>{t('sidebar.modules')}</p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {modules.map((module) => (
            <li key={module.id}>{renderModuleButton(module, module.id === activeModule, onSelect, doneTitle)}</li>
          ))}
        </ul>
      </div>

      <div>
        <p style={sectionLabelStyle}>{t('sidebar.comingSoon')}</p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {comingSoon.map((module) => (
            <li key={module.label}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '8px',
                  color: 'var(--muted)',
                  fontSize: '0.9rem',
                  cursor: 'not-allowed',
                }}
              >
                <span style={{ opacity: 0.5 }}>{module.icon}</span>
                <span style={{ flex: 1 }}>{module.label}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          <li>{renderModuleButton(settingsModule, activeModule === 'settings', onSelect, doneTitle)}</li>
        </ul>
      </div>
    </nav>
  );
}

const sectionLabelStyle: React.CSSProperties = {
  margin: '0 0 0.5rem 0.75rem',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
};
