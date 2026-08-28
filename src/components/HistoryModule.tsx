import { useEffect, useMemo, useState } from 'react';

import {
  fetchHistoryByFilename,
  fetchHistorySessions,
  type AnalysisSession,
  type EvolutionEntry,
} from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { IconAlertTriangle, IconHistory, IconSpinner, IconTarget, IconXCircle } from './Icons';

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '1.25rem 1.5rem',
};

const badgeStyle = (multiple: boolean): React.CSSProperties => ({
  fontSize: '0.7rem',
  fontWeight: 600,
  color: multiple ? 'var(--accent-purple-light)' : 'var(--text-tertiary)',
  border: `1px solid ${multiple ? 'var(--accent-purple-light)' : 'var(--border)'}`,
  borderRadius: '999px',
  padding: '0.15rem 0.6rem',
  whiteSpace: 'nowrap',
});

function VariantsBadge({ session }: { session: AnalysisSession }) {
  const { t } = useSettings();
  const multiple = session.selected_variants > 1;
  return (
    <span style={badgeStyle(multiple)}>
      {multiple ? t('history.variantsBadge.multiple', { count: session.selected_variants }) : t('history.variantsBadge.single')}
    </span>
  );
}

function EvolutionList({ evolution }: { evolution: Record<string, EvolutionEntry> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
      {Object.entries(evolution).map(([key, entry]) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{key}</span>
          <span
            style={{
              color:
                entry.pct_change == null
                  ? 'var(--text-tertiary)'
                  : entry.pct_change >= 0
                    ? 'var(--accent-green)'
                    : 'var(--danger-light)',
            }}
          >
            {entry.pct_change == null ? '—' : `${entry.pct_change >= 0 ? '+' : ''}${entry.pct_change.toFixed(1)}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function HistoryModule() {
  const { t, language } = useSettings();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [series, setSeries] = useState<{ sessions: AnalysisSession[]; evolutionBySessionId: Record<string, Record<string, EvolutionEntry>> } | null>(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState('');

  const locale = language === 'pt' ? 'pt-BR' : 'en-US';

  useEffect(() => {
    fetchHistorySessions()
      .then(setSessions)
      .catch((err) => setError(err instanceof Error ? err.message : t('history.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const groups = useMemo(() => {
    const byFilename = new Map<string, AnalysisSession[]>();
    for (const session of sessions) {
      const list = byFilename.get(session.filename) ?? [];
      list.push(session);
      byFilename.set(session.filename, list);
    }
    return Array.from(byFilename.entries())
      .map(([filename, runs]) => ({
        filename,
        runs: runs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      }))
      .sort((a, b) => new Date(b.runs[0].created_at).getTime() - new Date(a.runs[0].created_at).getTime());
  }, [sessions]);

  const openSeries = (filename: string) => {
    setSelectedFilename(filename);
    setSeries(null);
    setSeriesError('');
    setSeriesLoading(true);
    fetchHistoryByFilename(filename)
      .then((res) =>
        setSeries({
          sessions: res.sessions,
          evolutionBySessionId: Object.fromEntries(
            Object.entries(res.evolution_by_session_id).map(([id, evo]) => [String(id), evo]),
          ),
        }),
      )
      .catch((err) => setSeriesError(err instanceof Error ? err.message : t('history.loadError')))
      .finally(() => setSeriesLoading(false));
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <IconHistory size={22} /> {t('history.title')}
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>{t('history.subtitle')}</p>

      {loading && (
        <p style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1.5rem' }}>
          <IconSpinner size={16} /> {t('history.loading')}
        </p>
      )}

      {error && (
        <div
          style={{
            background: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            padding: '1rem',
            borderRadius: '8px',
            marginTop: '1rem',
            border: '1px solid var(--danger-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <IconXCircle size={18} /> {error}
        </div>
      )}

      {!loading && !error && selectedFilename === null && (
        <div style={{ marginTop: '1.5rem' }}>
          {groups.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--text-secondary)' }}>{t('history.noSessions')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {groups.map((group) => (
                <button
                  key={group.filename}
                  type="button"
                  onClick={() => openSeries(group.filename)}
                  style={{
                    ...cardStyle,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 700 }}>{group.filename}</p>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                      {t('history.runsCount', { count: group.runs.length })} · {t('history.lastRun')}{' '}
                      {new Date(group.runs[0].created_at).toLocaleString(locale)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <VariantsBadge session={group.runs[0]} />
                    <span style={{ color: 'var(--accent-blue)', fontSize: '0.85rem', fontWeight: 600 }}>
                      {t('history.viewSeries')} →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedFilename !== null && (
        <div style={{ marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setSelectedFilename(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-blue)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              padding: 0,
              marginBottom: '1rem',
            }}
          >
            ← {t('history.backToList')}
          </button>

          <h3 style={{ marginTop: 0 }}>{selectedFilename}</h3>

          {seriesLoading && (
            <p style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <IconSpinner size={16} />
            </p>
          )}

          {seriesError && (
            <div
              style={{
                background: 'var(--danger-bg)',
                color: 'var(--danger-text)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--danger-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <IconXCircle size={18} /> {seriesError}
            </div>
          )}

          {series && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {series.sessions.map((session) => {
                const evolution = series.evolutionBySessionId[String(session.id)];
                return (
                  <div key={session.id} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>{new Date(session.created_at).toLocaleString(locale)}</p>
                        <p style={{ margin: '0.2rem 0 0', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                          {t('history.column.engine')}: <strong>{session.ai_engine}</strong>
                        </p>
                      </div>
                      <VariantsBadge session={session} />
                    </div>

                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <p
                        style={{
                          margin: '0 0 0.25rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <IconTarget size={13} /> {t('history.evolutionTitle')}{' '}
                        {evolution && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({t('history.evolutionVsPrevious')})</span>}
                      </p>
                      {evolution ? (
                        <EvolutionList evolution={evolution} />
                      ) : (
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <IconAlertTriangle size={13} /> {t('history.firstRun')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
