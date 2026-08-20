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

const COMPLEXITY_LABEL: Record<AutomationInsight['complexity'], string> = {
  low: 'Baixa complexidade',
  medium: 'Média complexidade',
  high: 'Alta complexidade',
};

const COMPLEXITY_COLOR: Record<AutomationInsight['complexity'], string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '70px',
  padding: '0.6rem',
  borderRadius: '6px',
  border: '1px solid #374151',
  background: '#111827',
  color: '#e5e7eb',
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
  const [engines, setEngines] = useState<LLMEngine[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [enginesLoading, setEnginesLoading] = useState(true);
  const [enginesError, setEnginesError] = useState('');
  const [selectedEngine, setSelectedEngine] = useState('ollama');
  const [extraPrompt, setExtraPrompt] = useState('');

  const [result, setResult] = useState<AnalyzeProcessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      .catch((err) => setEnginesError(err instanceof Error ? err.message : 'Erro ao carregar motores de IA'))
      .finally(() => setEnginesLoading(false));
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
      setError('Selecione ao menos uma variante do processo no ProcessExplorer antes de gerar os insights.');
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
          throw new Error('Nenhum caso corresponde às variantes selecionadas - ajuste a seleção no ProcessExplorer.');
        }
        graphToAnalyze = await discoverProcessGraph(scopedRows, 'case_id', 'activity', 'timestamp');
      }

      const response = await analyzeProcess(graphToAnalyze, selectedEngine, extraPrompt || undefined);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar insights');
    } finally {
      setLoading(false);
    }
  };

  if (!graphData) {
    return (
      <div>
        <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconBot size={22} /> Module 2: AI Process Consultant
        </h2>
        <div
          style={{
            background: '#111827',
            border: '1px dashed #374151',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            color: '#9ca3af',
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
            <IconLock size={18} /> Módulo bloqueado
          </p>
          <p>
            Gere um grafo no <strong>ProcessExplorer</strong> primeiro - o consultor de IA analisa as variantes,
            gargalos e métricas de lá.
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
        <IconBot size={22} /> Module 2: AI Process Consultant
      </h2>
      <p style={{ color: '#9ca3af' }}>
        O consultor virtual da plataforma: analisa o Gêmeo Digital do ProcessExplorer e recomenda onde aplicar RPA
        e Agentes de IA.
      </p>

      <div style={{ marginTop: '1.5rem' }}>
        <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
          Motor de IA
        </label>
        {enginesLoading ? (
          <p style={{ color: '#6b7280' }}>Carregando motores...</p>
        ) : enginesError ? (
          <p style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                  title={engine.configured ? undefined : 'Configure a API key correspondente para usar este motor'}
                  style={{
                    background: active ? '#1e293b' : '#111827',
                    color: engine.configured ? (active ? '#e5e7eb' : '#9ca3af') : '#4b5563',
                    border: `1px solid ${active ? '#3b82f6' : '#374151'}`,
                    borderRadius: '8px',
                    padding: '0.6rem 1rem',
                    fontSize: '0.85rem',
                    cursor: engine.configured ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{engine.label}</div>
                  <div style={{ fontSize: '0.7rem', color: engine.configured ? '#10b981' : '#6b7280' }}>
                    {engine.configured ? '● configurado' : '○ não configurado'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <details style={{ marginTop: '1.5rem' }}>
        <summary
          style={{ cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <IconDocument size={15} /> Ver Prompt Consultivo do Sistema
        </summary>
        <pre
          style={{
            background: '#111827',
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
        <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
          Instruções adicionais para o consultor <span style={{ color: '#6b7280' }}>(opcional)</span>
        </label>
        <textarea
          value={extraPrompt}
          onChange={(e) => setExtraPrompt(e.target.value)}
          placeholder="Ex: priorize recomendações de baixo custo de implementação"
          style={textareaStyle}
        />
      </div>

      {totalVariants > 0 && (
        <p
          style={{
            color: '#9ca3af',
            fontSize: '0.8rem',
            marginTop: '1.5rem',
            marginBottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <IconTarget size={14} /> Escopo da análise: <strong style={{ color: '#e5e7eb' }}>{checkedVariantIndices.size}</strong> de{' '}
          <strong style={{ color: '#e5e7eb' }}>{totalVariants}</strong> variantes ·{' '}
          <strong style={{ color: '#e5e7eb' }}>{checkedCaseCount}</strong> de{' '}
          <strong style={{ color: '#e5e7eb' }}>{totalCases}</strong> casos selecionados no{' '}
          <strong>ProcessExplorer</strong>
        </p>
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={loading || checkedVariantIndices.size === 0}
        style={{
          marginTop: '0.75rem',
          background: loading || checkedVariantIndices.size === 0 ? '#4b5563' : '#7c3aed',
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
            <IconSpinner size={16} /> Analisando com IA...
          </>
        ) : (
          <>
            <IconBot size={17} /> Gerar Insights com IA
          </>
        )}
      </button>
      {loading && selectedEngine === 'ollama' && (
        <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Modelo local rodando na CPU - pode levar alguns minutos, dependendo da carga da sua máquina.
        </p>
      )}

      {error && (
        <div
          style={{
            background: '#7f1d1d',
            color: '#fecaca',
            padding: '1rem',
            borderRadius: '8px',
            marginTop: '1rem',
            border: '1px solid #991b1b',
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
          <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>
            Sessão de Insights gerada por <strong>{result.engine_used}</strong> em{' '}
            {new Date(result.generated_at).toLocaleString('pt-BR')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
            <InsightColumn
              title={
                <>
                  <IconBot size={16} /> Automação RPA
                </>
              }
              accent="#3b82f6"
              insights={rpaInsights}
            />
            <InsightColumn
              title={
                <>
                  <IconBrain size={16} /> Agentes de IA
                </>
              }
              accent="#a855f7"
              insights={aiAgentInsights}
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
}: {
  title: React.ReactNode;
  accent: string;
  insights: AutomationInsight[];
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
        <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Nenhuma recomendação nesta categoria.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {insights.map((insight, idx) => (
            <InsightCard key={idx} insight={insight} accent={accent} />
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight, accent }: { insight: AutomationInsight; accent: string }) {
  return (
    <div style={{ background: '#111827', border: `1px solid ${accent}55`, borderRadius: '8px', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <h4 style={{ margin: 0, color: '#e5e7eb' }}>{insight.title}</h4>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: COMPLEXITY_COLOR[insight.complexity],
            border: `1px solid ${COMPLEXITY_COLOR[insight.complexity]}`,
            borderRadius: '999px',
            padding: '0.1rem 0.55rem',
            whiteSpace: 'nowrap',
          }}
        >
          {COMPLEXITY_LABEL[insight.complexity]}
        </span>
      </div>

      <p style={{ color: '#d1d5db', fontSize: '0.85rem', marginTop: '0.5rem' }}>{insight.description}</p>

      <p
        style={{
          color: '#10b981',
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

      <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
        {insight.business_justification}
      </p>

      {insight.related_activities.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.65rem' }}>
          {insight.related_activities.map((activity) => (
            <span
              key={activity}
              style={{
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '999px',
                padding: '0.15rem 0.6rem',
                fontSize: '0.72rem',
                color: '#9ca3af',
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
