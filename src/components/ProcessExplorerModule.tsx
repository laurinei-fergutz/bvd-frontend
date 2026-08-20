import { useEffect, useRef, useState } from 'react';

import {
  discoverProcessGraph,
  validateEventLog,
  type EventLogRow,
  type MapperUploadPreviewResponse,
  type ProcessGraphResponse,
  type SanitizationReport,
} from '../services/api';
import ProcessGraph, { formatDuration } from './ProcessGraph';
import ProcessVariants from './ProcessVariants';
import ZoomPanViewport from './ZoomPanViewport';
import {
  IconAlertTriangle,
  IconCode,
  IconFilter,
  IconImage,
  IconLayers,
  IconLock,
  IconSave,
  IconSpinner,
  IconWorkflow,
  IconXCircle,
} from './Icons';
import { downloadJson, downloadSvgAsImage, downloadTextFile, graphToMermaidText } from '../utils/exportUtils';
import {
  applyFilters,
  distinctValues,
  isColumnNumeric,
  EMPTY_FILTERS,
  type EventLogFilters,
} from '../utils/eventLogFilters';

const GRAPH_BACKGROUND = '#0b1220';
const NO_RESOURCE = '__none__';
const NO_EXTRA_FILTER = '__none__';

const exportButtonStyle: React.CSSProperties = {
  background: '#1f2937',
  color: '#e5e7eb',
  border: '1px solid #374151',
  borderRadius: '6px',
  padding: '0.4rem 0.9rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  borderRadius: '6px',
  border: '1px solid #374151',
  background: '#111827',
  color: '#e5e7eb',
};

const labelStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '0.875rem',
  display: 'block',
  marginBottom: '0.25rem',
};

type Props = {
  mapperResult: MapperUploadPreviewResponse | null;
  onGraphGenerated: (
    graph: ProcessGraphResponse | null,
    eventLogRows: EventLogRow[],
    checkedVariantIndices: Set<number>,
  ) => void;
};

export default function ProcessExplorerModule({ mapperResult, onGraphGenerated }: Props) {
  const [caseIdCol, setCaseIdCol] = useState('');
  const [activityCol, setActivityCol] = useState('');
  const [timestampCol, setTimestampCol] = useState('');
  const [resourceCol, setResourceCol] = useState(NO_RESOURCE);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resourceFilterValues, setResourceFilterValues] = useState<string[]>([]);
  const [extraFilterColumn, setExtraFilterColumn] = useState(NO_EXTRA_FILTER);
  const [extraFilterMin, setExtraFilterMin] = useState('');
  const [extraFilterMax, setExtraFilterMax] = useState('');
  const [extraFilterSelected, setExtraFilterSelected] = useState<string[]>([]);

  const [report, setReport] = useState<SanitizationReport | null>(null);
  const [filteredRowCount, setFilteredRowCount] = useState<number | null>(null);
  const [graphData, setGraphData] = useState<ProcessGraphResponse | null>(null);
  const [eventLogRows, setEventLogRows] = useState<EventLogRow[]>([]);
  const [checkedVariants, setCheckedVariants] = useState<Set<number>>(new Set());
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState('');
  const [exportError, setExportError] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  // Re-derive the column picks and reset filters whenever a new file comes
  // in from DataMapper - prefer the backend's suggestions, falling back to
  // the first column.
  useEffect(() => {
    if (!mapperResult) return;

    const columns = Object.keys(mapperResult.rows[0] ?? {});
    setCaseIdCol(mapperResult.suggested_case_id_col ?? columns[0] ?? '');
    setActivityCol(mapperResult.suggested_activity_col ?? columns[0] ?? '');
    setTimestampCol(mapperResult.suggested_timestamp_col ?? columns[0] ?? '');
    setResourceCol(mapperResult.suggested_resource_col ?? NO_RESOURCE);
    setDateFrom('');
    setDateTo('');
    setResourceFilterValues([]);
    setExtraFilterColumn(NO_EXTRA_FILTER);
    setExtraFilterMin('');
    setExtraFilterMax('');
    setExtraFilterSelected([]);
    setReport(null);
    setFilteredRowCount(null);
    setGraphData(null);
    setEventLogRows([]);
    setCheckedVariants(new Set());
    setGraphError('');
    setExportError('');
  }, [mapperResult]);

  useEffect(() => {
    onGraphGenerated(graphData, eventLogRows, checkedVariants);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData, eventLogRows, checkedVariants]);

  const handleToggleVariant = (index: number) => {
    setCheckedVariants((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const availableColumns = Object.keys(mapperResult?.rows[0] ?? {});
  const extraFilterCandidates = availableColumns.filter(
    (col) => col !== caseIdCol && col !== activityCol && col !== timestampCol && col !== resourceCol,
  );
  const extraFilterIsNumeric =
    extraFilterColumn !== NO_EXTRA_FILTER && mapperResult
      ? isColumnNumeric(mapperResult.rows, extraFilterColumn)
      : false;

  const handleGenerateGraph = async () => {
    if (!mapperResult) return;

    if (!caseIdCol || !activityCol || !timestampCol) {
      setGraphError('Mapeie as três colunas obrigatórias (Case ID, Activity e Timestamp)');
      return;
    }

    const filters: EventLogFilters = {
      ...EMPTY_FILTERS,
      dateFrom,
      dateTo,
      resourceValues: resourceCol !== NO_RESOURCE ? resourceFilterValues : [],
      extra:
        extraFilterColumn === NO_EXTRA_FILTER
          ? null
          : extraFilterIsNumeric
            ? {
                column: extraFilterColumn,
                kind: 'numeric',
                min: extraFilterMin === '' ? null : Number(extraFilterMin),
                max: extraFilterMax === '' ? null : Number(extraFilterMax),
              }
            : { column: extraFilterColumn, kind: 'categorical', selected: extraFilterSelected },
    };

    const filteredRows = applyFilters(
      mapperResult.rows,
      timestampCol,
      resourceCol !== NO_RESOURCE ? resourceCol : null,
      filters,
    );
    setFilteredRowCount(filteredRows.length);

    if (filteredRows.length === 0) {
      setGraphError('Nenhuma linha restante depois de aplicar os filtros - ajuste os critérios');
      setGraphData(null);
      return;
    }

    setGraphLoading(true);
    setGraphError('');
    setExportError('');

    try {
      // Every "combination" (mapping or filters) re-runs sanitization then
      // rebuilds the graph, so tweaking and generating again is exactly how
      // you test different scenarios.
      const validated = await validateEventLog(
        filteredRows,
        caseIdCol,
        activityCol,
        timestampCol,
        resourceCol === NO_RESOURCE ? undefined : resourceCol,
      );
      setReport(validated.report);

      const graph = await discoverProcessGraph(validated.rows, 'case_id', 'activity', 'timestamp');
      setGraphData(graph);
      setEventLogRows(validated.rows);
      // Variants are ranked by frequency - default to only the "happy path"
      // (highest occurrence) so the AI Consultant starts focused, not diluted
      // across every deviation.
      setCheckedVariants(graph.variants.length > 0 ? new Set([0]) : new Set());
    } catch (err) {
      setGraphError(err instanceof Error ? err.message : 'Erro ao gerar grafo do processo');
      setGraphData(null);
      setEventLogRows([]);
      setCheckedVariants(new Set());
    } finally {
      setGraphLoading(false);
    }
  };

  const handleExportImage = async (format: 'png' | 'jpeg') => {
    if (!svgRef.current) return;

    setExportError('');
    try {
      const extension = format === 'png' ? 'png' : 'jpg';
      await downloadSvgAsImage(svgRef.current, format, `process-graph.${extension}`, GRAPH_BACKGROUND);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Erro ao exportar imagem do grafo');
    }
  };

  if (!mapperResult) {
    return (
      <div>
        <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconWorkflow size={22} /> Module 1: ProcessExplorer
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
            Envie um arquivo no <strong>DataMapper</strong> primeiro para desbloquear o mapeamento de colunas e o
            grafo do processo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <IconWorkflow size={22} /> Module 1: ProcessExplorer
      </h2>
      <p style={{ color: '#9ca3af' }}>
        O Gêmeo Digital do seu processo: mapeie as colunas, filtre e gere o grafo (via pm4py) - mude a combinação e
        gere de novo para comparar.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        <div>
          <label style={labelStyle}>
            Case ID <span style={{ color: '#f87171' }}>*</span>
            {mapperResult.suggested_case_id_col === caseIdCol && caseIdCol && (
              <span style={{ color: '#10b981' }}> · sugerido</span>
            )}
          </label>
          <select value={caseIdCol} onChange={(e) => setCaseIdCol(e.target.value)} style={selectStyle}>
            {availableColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>
            Activity <span style={{ color: '#f87171' }}>*</span>
            {mapperResult.suggested_activity_col === activityCol && activityCol && (
              <span style={{ color: '#10b981' }}> · sugerido</span>
            )}
          </label>
          <select value={activityCol} onChange={(e) => setActivityCol(e.target.value)} style={selectStyle}>
            {availableColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>
            Timestamp <span style={{ color: '#f87171' }}>*</span>
            {mapperResult.suggested_timestamp_col === timestampCol && timestampCol && (
              <span style={{ color: '#10b981' }}> · sugerido</span>
            )}
          </label>
          <select value={timestampCol} onChange={(e) => setTimestampCol(e.target.value)} style={selectStyle}>
            {availableColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>
            Resource <span style={{ color: '#6b7280' }}>(opcional)</span>
            {mapperResult.suggested_resource_col === resourceCol && resourceCol !== NO_RESOURCE && (
              <span style={{ color: '#10b981' }}> · sugerido</span>
            )}
          </label>
          <select
            value={resourceCol}
            onChange={(e) => {
              setResourceCol(e.target.value);
              setResourceFilterValues([]);
            }}
            style={selectStyle}
          >
            <option value={NO_RESOURCE}>Nenhuma</option>
            {availableColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic multi-criteria filters: time range, resource, and one generic value/category column */}
      <details style={{ marginTop: '1.5rem' }} open>
        <summary
          style={{
            cursor: 'pointer',
            color: '#9ca3af',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <IconFilter size={15} /> Filtros Dinâmicos
        </summary>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label style={labelStyle}>Período - de</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={selectStyle} />
          </div>
          <div>
            <label style={labelStyle}>Período - até</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={selectStyle} />
          </div>

          {resourceCol !== NO_RESOURCE && (
            <div>
              <label style={labelStyle}>Resource / Região</label>
              <select
                multiple
                value={resourceFilterValues}
                onChange={(e) => setResourceFilterValues(Array.from(e.target.selectedOptions, (o) => o.value))}
                style={{ ...selectStyle, height: '84px' }}
              >
                {distinctValues(mapperResult.rows, resourceCol).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Filtro adicional</label>
            <select
              value={extraFilterColumn}
              onChange={(e) => {
                setExtraFilterColumn(e.target.value);
                setExtraFilterMin('');
                setExtraFilterMax('');
                setExtraFilterSelected([]);
              }}
              style={selectStyle}
            >
              <option value={NO_EXTRA_FILTER}>Nenhum</option>
              {extraFilterCandidates.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>

        {extraFilterColumn !== NO_EXTRA_FILTER && (
          <div style={{ marginTop: '1rem' }}>
            {extraFilterIsNumeric ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '400px' }}>
                <div>
                  <label style={labelStyle}>{extraFilterColumn} - mínimo</label>
                  <input
                    type="number"
                    value={extraFilterMin}
                    onChange={(e) => setExtraFilterMin(e.target.value)}
                    style={selectStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{extraFilterColumn} - máximo</label>
                  <input
                    type="number"
                    value={extraFilterMax}
                    onChange={(e) => setExtraFilterMax(e.target.value)}
                    style={selectStyle}
                  />
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: '300px' }}>
                <label style={labelStyle}>Valores de {extraFilterColumn}</label>
                <select
                  multiple
                  value={extraFilterSelected}
                  onChange={(e) => setExtraFilterSelected(Array.from(e.target.selectedOptions, (o) => o.value))}
                  style={{ ...selectStyle, height: '84px' }}
                >
                  {distinctValues(mapperResult.rows, extraFilterColumn).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </details>

      <button
        type="button"
        onClick={handleGenerateGraph}
        disabled={graphLoading}
        style={{
          marginTop: '1.5rem',
          background: graphLoading ? '#4b5563' : '#7c3aed',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: graphLoading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {graphLoading ? (
          <>
            <IconSpinner size={16} /> Filtrando, validando e gerando...
          </>
        ) : (
          <>
            <IconWorkflow size={17} /> Gerar Grafo do Processo
          </>
        )}
      </button>

      {graphError && (
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
          <IconXCircle size={18} /> {graphError}
        </div>
      )}

      {report && filteredRowCount !== null && (
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '1rem' }}>
          Filtros: <strong style={{ color: '#e5e7eb' }}>{filteredRowCount}</strong> de{' '}
          <strong style={{ color: '#e5e7eb' }}>{mapperResult.rows.length}</strong> linhas · Event Log:{' '}
          <strong style={{ color: '#e5e7eb' }}>{report.total_rows_out}</strong> linhas,{' '}
          <strong style={{ color: '#e5e7eb' }}>{report.total_cases}</strong> casos
          {report.rows_dropped_missing_case_id > 0 && (
            <> · {report.rows_dropped_missing_case_id} descartadas (Case ID vazio)</>
          )}
          {report.rows_dropped_missing_timestamp > 0 && (
            <> · {report.rows_dropped_missing_timestamp} descartadas (timestamp inválido)</>
          )}
          {report.timestamps_normalized > 0 && <> · {report.timestamps_normalized} timestamps normalizados</>}
          {report.activities_trimmed > 0 && <> · {report.activities_trimmed} atividades com espaços removidos</>}
        </p>
      )}

      {graphData && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard label="Casos" value={String(graphData.metrics.total_cases)} />
            <StatCard
              label="Lead Time médio"
              value={graphData.metrics.avg_lead_time_seconds != null ? formatDuration(graphData.metrics.avg_lead_time_seconds) : '—'}
              hint="Duração total do caso"
            />
            <StatCard
              label="Lead Time mínimo"
              value={graphData.metrics.min_lead_time_seconds != null ? formatDuration(graphData.metrics.min_lead_time_seconds) : '—'}
            />
            <StatCard
              label="Lead Time máximo"
              value={graphData.metrics.max_lead_time_seconds != null ? formatDuration(graphData.metrics.max_lead_time_seconds) : '—'}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <button
              type="button"
              style={{ ...exportButtonStyle, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => downloadJson(graphData, 'process-graph.json')}
            >
              <IconSave size={15} /> Salvar JSON
            </button>
            <button
              type="button"
              style={{ ...exportButtonStyle, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => handleExportImage('png')}
            >
              <IconImage size={15} /> Exportar PNG
            </button>
            <button
              type="button"
              style={{ ...exportButtonStyle, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => handleExportImage('jpeg')}
            >
              <IconImage size={15} /> Exportar JPG
            </button>
          </div>

          {exportError && (
            <div
              style={{
                background: '#7f1d1d',
                color: '#fecaca',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid #991b1b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <IconXCircle size={16} /> {exportError}
            </div>
          )}

          <ZoomPanViewport>
            <ProcessGraph graph={graphData} svgRef={svgRef} />
          </ZoomPanViewport>

          <details style={{ marginTop: '1rem' }}>
            <summary
              style={{ cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <IconCode size={15} /> Ver como texto estruturado (Mermaid)
            </summary>
            <pre
              style={{
                background: '#111827',
                padding: '1rem',
                borderRadius: '4px',
                marginTop: '0.5rem',
                overflow: 'auto',
                maxHeight: '400px',
                fontSize: '0.75rem',
              }}
            >
              {graphToMermaidText(graphData)}
            </pre>
            <button
              type="button"
              style={{
                ...exportButtonStyle,
                marginTop: '0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              onClick={() => downloadTextFile(graphToMermaidText(graphData), 'process-graph.mmd')}
            >
              <IconSave size={15} /> Baixar .mmd
            </button>
          </details>

          {graphData.variants.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconLayers size={18} /> Variantes do Processo
              </h3>
              <p style={{ color: '#9ca3af', marginTop: 0, fontSize: '0.85rem' }}>
                Sequências de atividades agrupadas por frequência - a mais comum é o "caminho feliz". Marque as
                variantes que o <strong>AI Consultant</strong> deve considerar na análise.
              </p>
              <ProcessVariants
                variants={graphData.variants}
                checkedIndices={checkedVariants}
                onToggle={handleToggleVariant}
              />
              {checkedVariants.size === 0 && (
                <p
                  style={{
                    color: '#f87171',
                    fontSize: '0.8rem',
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <IconAlertTriangle size={14} /> Nenhuma variante selecionada - marque ao menos uma para habilitar a
                  análise de IA.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', padding: '0.85rem 1rem' }}>
      <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.8rem' }}>{label}</p>
      <p style={{ fontWeight: 'bold', fontSize: '1.25rem', margin: '0.15rem 0 0' }}>{value}</p>
      {hint && <p style={{ color: '#6b7280', margin: 0, fontSize: '0.7rem' }}>{hint}</p>}
    </div>
  );
}
