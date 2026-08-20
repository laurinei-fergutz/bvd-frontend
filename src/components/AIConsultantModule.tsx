import { useEffect, useMemo, useState } from 'react';

import {
  analyzeProcess,
  discoverProcessGraph,
  fetchLLMEngines,
  type AnalyzeProcessResponse,
  type AutomationInsight,
  type EventLogRow,
  type LLMEngine,
  type ProcessGraphResponse,
} from '../services/api';
import { computeCaseIdsByVariant, unionSelectedCaseIds } from '../utils/variantSelection';
import { useSettings } from '../context/SettingsContext';
import {
  IconBot,
  IconBrain,
  IconDocument,
  IconLock,
  IconSpinner,
  IconTarget,
  IconTrendingUp,
  IconXCircle,
} from './Icons';

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '70px',
  padding: '0.6rem',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  resize: 'vertical',
};

type Props = {
  graphData: ProcessGraphResponse | null;
  eventLogRows: EventLogRow[];
  checkedVariantIndices: Set<number>;
  onProcessedChange: (done: boolean) => void;
};

export default function AIConsultantModule({
  graphData,
  eventLogRows,
  checkedVariantIndices,
  onProcessedChange,
}: Props) {
  const { t, language } = useSettings();
  const [engines, setEngines] = useState<LLMEngine[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [enginesLoading, setEnginesLoading] = useState(true);
  const [enginesError, setEnginesError] = useState('');
  const [selectedEngine, setSelectedEngine] = useState('ollama');
  const [extraPrompt, setExtraPrompt] = useState('');

  const [result, setResult] = useState<AnalyzeProcessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const COMPLEXITY_LABEL: Record<AutomationInsight['complexity'], string> = {
    low: t('ai.complexity.low'),
    medium: t('ai.complexity.medium'),
    high: t('ai.complexity.high'),
  };

  const COMPLEXITY_COLOR: Record<AutomationInsight['complexity'], string> = {
    low: 'var(--accent-green)',
    medium: 'var(--accent-amber)',
    high: 'var(--danger)',
  };

  useEffect(() => {
    fetchLLMEngines()
      .then((res) => {
        setEngines(res.engines);
        setSystemPrompt(res.default_system_prompt);
        // Prefer Ollama (free, local, no key needed) when it's ready to go,
        // then fall back to any other configured engine.
        const preferred =
          res.engines.find((e) => e.id === 'ollama' && e.configured) ?? res.engines.find((e) => e.configured);
        if (preferred) setSelectedEngine(preferred.id);
      })
      .catch((err) => setEnginesError(err instanceof Error ? err.message : t('ai.enginesError')))
      .finally(() => setEnginesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A newly generated graph (or a change in which variants are checked)
  // invalidates whatever insights were derived from the previous scope.
  useEffect(() => {
    setResult(null);
    setError('');
  }, [graphData, checkedVariantIndices]);

  useEffect(() => {
    onProcessedChange(result !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const caseIdsByVariant = useMemo(
    () => (graphData ? computeCaseIdsByVariant(eventLogRows, graphData.variants) : []),
    [eventLogRows, graphData],
  );

  const totalVariants = graphData?.variants.length ?? 0;
  const totalCases = graphData?.metrics.total_cases ?? 0;
  const checkedCaseCount = graphData
    ? graphData.variants.reduce((sum, v, idx) => (checkedVariantIndices.has(idx) ? sum + v.case_count : sum), 0)
    : 0;
  const isScopedSelection = totalVariants > 0 && checkedVariantIndices.size < totalVariants;

  const handleAnalyze = async () => {
    if (!graphData) return;

    if (checkedVariantIndices.size === 0) {
      setError(t('ai.selectVariant'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      let graphToAnalyze = graphData;

      if (isScopedSelection) {
        const selectedIds = unionSelectedCaseIds(caseIdsByVariant, checkedVariantIndices);
        const scopedRows = eventLogRows.filter((row) => selectedIds.has(String(row.case_id)));
        if (scopedRows.length === 0) {
          throw new Error(t('ai.noMatchingCases'));
        }
        graphToAnalyze = await discoverProcessGraph(scopedRows, 'case_id', 'activity', 'timestamp');
      }

      const response = await analyzeProcess(graphToAnalyze, selectedEngine, extraPrompt || undefined);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.generateError'));
    } finally {
      setLoading(false);
    }
  };

  if (!graphData) {
    return (
      <div>
        <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconBot size={22} /> {t('ai.title')}
        </h2>
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border)',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <p
            style={{
              fontSize: '1.1rem',
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            <IconLock size={18} /> {t('ai.locked')}
          </p>
          <p>
            {t('ai.lockedMessagePrefix')} <strong>ProcessExplorer</strong> {t('ai.lockedMessageSuffix')}
          </p>
        </div>
      </div>
    );
  }

  const rpaInsights = result?.insights.filter((i) => i.category === 'rpa') ?? [];
  const aiAgentInsights = result?.insights.filter((i) => i.category === 'ai_agent') ?? [];

  return (
    <div>
      <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <IconBot size={22} /> {t('ai.title')}
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>{t('ai.subtitle')}</p>

      <div style={{ marginTop: '1.5rem' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
          {t('ai.engine')}
        </label>
        {enginesLoading ? (
          <p style={{ color: 'var(--text-tertiary)' }}>{t('ai.loadingEngines')}</p>
        ) : enginesError ? (
          <p style={{ color: 'var(--danger-light)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <IconXCircle size={15} /> {enginesError}
          </p>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {engines.map((engine) => {
              const active = engine.id === selectedEngine;
              return (
                <button
                  key={engine.id}
                  type="button"
                  disabled={!engine.configured}
                  onClick={() => setSelectedEngine(engine.id)}
                  title={engine.configured ? undefined : t('ai.configureApiKey')}
                  style={{
                    background: active ? 'var(--bg-active)' : 'var(--bg-surface)',
                    color: engine.configured ? (active ? 'var(--text-primary)' : 'var(--text-secondary)') : 'var(--muted)',
                    border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    padding: '0.6rem 1rem',
                    fontSize: '0.85rem',
                    cursor: engine.configured ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{engine.label}</div>
                  <div style={{ fontSize: '0.7rem', color: engine.configured ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
                    {engine.configured ? t('ai.configured') : t('ai.notConfigured')}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <details style={{ marginTop: '1.5rem' }}>
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
          }}
        >
          {systemPrompt}
        </pre>
      </details>

      <div style={{ marginTop: '1.5rem' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
          {t('ai.extraInstructions')} <span style={{ color: 'var(--text-tertiary)' }}>{t('ai.optional')}</span>
        </label>
        <textarea
          value={extraPrompt}
          onChange={(e) => setExtraPrompt(e.target.value)}
          placeholder={t('ai.extraPromptPlaceholder')}
          style={textareaStyle}
        />
      </div>

      {totalVariants > 0 && (
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            marginTop: '1.5rem',
            marginBottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <IconTarget size={14} /> {t('ai.scope')}{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{checkedVariantIndices.size}</strong> {t('ai.of')}{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{totalVariants}</strong> {t('ai.variants')} ·{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{checkedCaseCount}</strong> {t('ai.of')}{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{totalCases}</strong> {t('ai.casesSelectedIn')}{' '}
          <strong>ProcessExplorer</strong>
        </p>
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={loading || checkedVariantIndices.size === 0}
        style={{
          marginTop: '0.75rem',
          background: loading || checkedVariantIndices.size === 0 ? 'var(--muted)' : 'var(--accent-purple)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: loading || checkedVariantIndices.size === 0 ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {loading ? (
          <>
            <IconSpinner size={16} /> {t('ai.analyzing')}
          </>
        ) : (
          <>
            <IconBot size={17} /> {t('ai.generateInsights')}
          </>
        )}
      </button>
      {loading && selectedEngine === 'ollama' && (
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{t('ai.localModelHint')}</p>
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

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
            {t('ai.sessionGeneratedByPrefix')} <strong>{result.engine_used}</strong> {t('ai.sessionGeneratedByInfix')}{' '}
            {new Date(result.generated_at).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
            <InsightColumn
              title={
                <>
                  <IconBot size={16} /> {t('ai.rpaAutomation')}
                </>
              }
              accent="var(--accent-blue)"
              insights={rpaInsights}
              noRecommendations={t('ai.noRecommendations')}
              complexityLabel={COMPLEXITY_LABEL}
              complexityColor={COMPLEXITY_COLOR}
            />
            <InsightColumn
              title={
                <>
                  <IconBrain size={16} /> {t('ai.aiAgents')}
                </>
              }
              accent="var(--accent-purple-light)"
              insights={aiAgentInsights}
              noRecommendations={t('ai.noRecommendations')}
              complexityLabel={COMPLEXITY_LABEL}
              complexityColor={COMPLEXITY_COLOR}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InsightColumn({
  title,
  accent,
  insights,
  noRecommendations,
  complexityLabel,
  complexityColor,
}: {
  title: React.ReactNode;
  accent: string;
  insights: AutomationInsight[];
  noRecommendations: string;
  complexityLabel: Record<AutomationInsight['complexity'], string>;
  complexityColor: Record<AutomationInsight['complexity'], string>;
}) {
  return (
    <div>
      <h3
        style={{
          color: accent,
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        {title}
      </h3>
      {insights.length === 0 ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{noRecommendations}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {insights.map((insight, idx) => (
            <InsightCard
              key={idx}
              insight={insight}
              accent={accent}
              complexityLabel={complexityLabel}
              complexityColor={complexityColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({
  insight,
  accent,
  complexityLabel,
  complexityColor,
}: {
  insight: AutomationInsight;
  accent: string;
  complexityLabel: Record<AutomationInsight['complexity'], string>;
  complexityColor: Record<AutomationInsight['complexity'], string>;
}) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: `1px solid ${accent}55`, borderRadius: '8px', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{insight.title}</h4>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: complexityColor[insight.complexity],
            border: `1px solid ${complexityColor[insight.complexity]}`,
            borderRadius: '999px',
            padding: '0.1rem 0.55rem',
            whiteSpace: 'nowrap',
          }}
        >
          {complexityLabel[insight.complexity]}
        </span>
      </div>

      <p style={{ color: 'var(--text-body)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{insight.description}</p>

      <p
        style={{
          color: 'var(--accent-green)',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginTop: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        <IconTrendingUp size={14} /> {insight.estimated_efficiency_gain}
      </p>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
        {insight.business_justification}
      </p>

      {insight.related_activities.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.65rem' }}>
          {insight.related_activities.map((activity) => (
            <span
              key={activity}
              style={{
                background: 'var(--bg-surface-alt)',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                padding: '0.15rem 0.6rem',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
              }}
            >
              {activity}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
