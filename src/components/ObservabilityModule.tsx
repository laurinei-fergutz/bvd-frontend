import { useCallback, useEffect, useState } from 'react';

import {
  fetchObservabilityEvents,
  fetchObservabilitySummary,
  observabilityExportUrl,
  type ModuleSummary,
  type ObservabilitySummary,
  type PerfEvent,
} from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { IconActivity, IconAlertTriangle, IconDocument, IconSpinner } from './Icons';

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '1.5rem',
};

const statGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '1.25rem',
};

const buttonStyle: React.CSSProperties = {
  background: 'var(--bg-surface-alt)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.6rem 1.1rem',
  fontSize: '0.9rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  textDecoration: 'none',
};

function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem 1rem' }}>
      <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.8rem' }}>{label}</p>
      <p style={{ fontWeight: 'bold', fontSize: '1.25rem', margin: '0.15rem 0 0', wordBreak: 'break-word' }}>{value}</p>
      {hint && <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: '0.7rem' }}>{hint}</p>}
    </div>
  );
}

function ModuleBar({ summary, maxCount }: { summary: ModuleSummary; maxCount: number }) {
  const pct = Math.max(2, (summary.count / maxCount) * 100);
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{summary.module}</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          {summary.count}x · {formatDurationMs(summary.avg_duration_ms)} {'avg'} · {summary.error_rate_pct.toFixed(0)}% err
        </span>
      </div>
      <div style={{ height: '10px', borderRadius: '5px', background: 'var(--bg-surface)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: summary.error_rate_pct > 20 ? 'var(--danger-light)' : 'var(--accent-blue)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function ObservabilityModule() {
  const { t, language } = useSettings();
  const [summary, setSummary] = useState<ObservabilitySummary | null>(null);
  const [events, setEvents] = useState<PerfEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, eventsRes] = await Promise.all([
        fetchObservabilitySummary(500),
        fetchObservabilityEvents(100),
      ]);
      setSummary(summaryRes);
      setEvents(eventsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('obs.loadError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const locale = language === 'pt' ? 'pt-BR' : 'en-US';
  const maxModuleCount = summary && summary.by_module.length > 0 ? Math.max(...summary.by_module.map((m) => m.count)) : 1;

  return (
    <div>
      <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <IconActivity size={22} /> {t('obs.title')}
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>{t('obs.subtitle')}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
        <button type="button" onClick={load} disabled={loading} style={buttonStyle}>
          {loading ? <IconSpinner size={15} /> : <IconActivity size={15} />} {loading ? t('obs.refreshing') : t('obs.refresh')}
        </button>
        <a href={observabilityExportUrl()} style={buttonStyle}>
          <IconDocument size={15} /> {t('obs.export')}
        </a>
        {summary && (
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
            {t('obs.source')}: {summary.source === 'database' ? t('obs.source.database') : t('obs.source.log_file')}
          </span>
        )}
      </div>

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
          <IconAlertTriangle size={16} /> {error}
        </div>
      )}

      {summary && summary.total_events === 0 && !loading && (
        <div
          style={{
            ...cardStyle,
            marginTop: '1.5rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          {t('obs.noEvents')}
        </div>
      )}

      {summary && summary.total_events > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
          <div style={statGrid}>
            <StatCard label={t('obs.totalEvents')} value={String(summary.total_events)} />
            <StatCard label={t('obs.avgDuration')} value={formatDurationMs(summary.avg_duration_ms)} />
            <StatCard label={t('obs.p95Duration')} value={formatDurationMs(summary.p95_duration_ms)} />
            <StatCard label={t('obs.maxDuration')} value={formatDurationMs(summary.max_duration_ms)} />
            <StatCard label={t('obs.errorRate')} value={`${summary.error_rate_pct.toFixed(1)}%`} />
            <StatCard
              label={t('obs.slowestOperation')}
              value={summary.slowest_operation ?? '—'}
              hint={summary.slowest_duration_ms != null ? formatDurationMs(summary.slowest_duration_ms) : undefined}
            />
          </div>

          <section style={cardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{t('obs.byModule')}</h3>
            {summary.by_module.map((m) => (
              <ModuleBar key={m.module} summary={m} maxCount={maxModuleCount} />
            ))}
          </section>

          <section style={cardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{t('obs.recentEvents')}</h3>
            <div style={{ overflow: 'auto', maxHeight: '420px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', position: 'sticky', top: 0, background: 'var(--bg-surface)' }}>
                    <th style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{t('obs.column.timestamp')}</th>
                    <th style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{t('obs.column.module')}</th>
                    <th style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{t('obs.column.operation')}</th>
                    <th style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{t('obs.column.duration')}</th>
                    <th style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{t('obs.column.status')}</th>
                    <th style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{t('obs.column.source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.5rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                        {new Date(e.timestamp).toLocaleTimeString(locale)}
                      </td>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>{e.module}</td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-body)' }}>{e.operation}</td>
                      <td style={{ padding: '0.5rem' }}>{formatDurationMs(e.duration_ms)}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <span style={{ color: e.status === 'success' ? 'var(--accent-green)' : 'var(--danger-light)' }}>
                          {e.status === 'success' ? `● ${t('obs.status.success')}` : `● ${t('obs.status.error')}`}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-tertiary)' }}>{e.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
