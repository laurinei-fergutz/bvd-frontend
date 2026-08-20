import { IconDollarSign, IconSettings, IconSliders } from './Icons';

export type ModuleId = 'datamapper' | 'processexplorer' | 'aiconsultant' | 'settings';

type ModuleStatus = {
  id: ModuleId;
  icon: React.ReactNode;
  label: string;
  /** Omit for utility entries (e.g. Settings) that have no "processed" state. */
  done?: boolean;
};

type ComingSoonModule = {
  icon: React.ReactNode;
  label: string;
};

const COMING_SOON: ComingSoonModule[] = [
  { icon: <IconDollarSign size={16} />, label: 'ROI Studio' },
  { icon: <IconSliders size={16} />, label: 'Command Center' },
];

type Props = {
  activeModule: ModuleId;
  onSelect: (module: ModuleId) => void;
  modules: ModuleStatus[];
};

function renderModuleButton(module: ModuleStatus, active: boolean, onSelect: (id: ModuleId) => void) {
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
        background: active ? '#1e293b' : 'transparent',
        color: active ? '#e5e7eb' : '#9ca3af',
        fontSize: '0.9rem',
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        textAlign: 'left',
        borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
        transition: 'background 0.15s ease',
      }}
    >
      <span>{module.icon}</span>
      <span style={{ flex: 1 }}>{module.label}</span>
      {module.done !== undefined && (
        <span
          title={module.done ? 'Já processado' : 'Ainda não processado'}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: module.done ? '#10b981' : '#4b5563',
            boxShadow: module.done ? '0 0 6px #10b98199' : 'none',
            flexShrink: 0,
          }}
        />
      )}
    </button>
  );
}

export default function Sidebar({ activeModule, onSelect, modules }: Props) {
  const settingsModule: ModuleStatus = { id: 'settings', icon: <IconSettings size={16} />, label: 'Configurações' };

  return (
    <nav
      style={{
        width: '260px',
        flexShrink: 0,
        background: '#0b1220',
        borderRight: '1px solid #1f2937',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        overflowY: 'auto',
      }}
    >
      <div>
        <p style={sectionLabelStyle}>Módulos</p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {modules.map((module) => (
            <li key={module.id}>{renderModuleButton(module, module.id === activeModule, onSelect)}</li>
          ))}
        </ul>
      </div>

      <div>
        <p style={sectionLabelStyle}>Em breve</p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {COMING_SOON.map((module) => (
            <li key={module.label}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '8px',
                  color: '#4b5563',
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

      <div style={{ borderTop: '1px solid #1f2937', paddingTop: '1rem' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          <li>{renderModuleButton(settingsModule, activeModule === 'settings', onSelect)}</li>
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
  color: '#6b7280',
  textTransform: 'uppercase',
};
