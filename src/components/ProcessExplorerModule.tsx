import { useEffect, useRef, useState } from 'react';

import {
  discoverProcessGraph,
  validateEventLog,
  type MapperUploadPreviewResponse,
  type ProcessGraphResponse,
  type SanitizationReport,
} from '../services/api';
import ProcessGraph from './ProcessGraph';
import { downloadJson, downloadSvgAsImage, downloadTextFile, graphToMermaidText } from '../utils/exportUtils';

const GRAPH_BACKGROUND = '#0b1220';
const NO_RESOURCE = '__none__';

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

type Props = {
  mapperResult: MapperUploadPreviewResponse | null;
  onProcessedChange: (done: boolean) => void;
};

export default function ProcessExplorerModule({ mapperResult, onProcessedChange }: Props) {
  const [caseIdCol, setCaseIdCol] = useState('');
  const [activityCol, setActivityCol] = useState('');
  const [timestampCol, setTimestampCol] = useState('');
  const [resourceCol, setResourceCol] = useState(NO_RESOURCE);

  const [report, setReport] = useState<SanitizationReport | null>(null);
  const [graphData, setGraphData] = useState<ProcessGraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState('');
  const [exportError, setExportError] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  // Re-derive the column picks whenever a new file comes in from DataMapper -
  // prefer the backend's suggestions, falling back to the first column.
  useEffect(() => {
    if (!mapperResult) return;

    const columns = Object.keys(mapperResult.rows[0] ?? {});
    setCaseIdCol(mapperResult.suggested_case_id_col ?? columns[0] ?? '');
    setActivityCol(mapperResult.suggested_activity_col ?? columns[0] ?? '');
    setTimestampCol(mapperResult.suggested_timestamp_col ?? columns[0] ?? '');
    setResourceCol(mapperResult.suggested_resource_col ?? NO_RESOURCE);
    setReport(null);
    setGraphData(null);
    setGraphError('');
    setExportError('');
  }, [mapperResult]);

  useEffect(() => {
    onProcessedChange(graphData !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]);

  const handleGenerateGraph = async () => {
    if (!mapperResult) return;

    if (!caseIdCol || !activityCol || !timestampCol) {
      setGraphError('Mapeie as três colunas obrigatórias (Case ID, Activity e Timestamp)');
      return;
    }

    setGraphLoading(true);
    setGraphError('');
    setExportError('');

    try {
      // Every "combination" re-runs sanitization then rebuilds the graph, so
      // switching columns and generating again is exactly how you test them.
      const validated = await validateEventLog(
        mapperResult.rows,
        caseIdCol,
        activityCol,
        timestampCol,
        resourceCol === NO_RESOURCE ? undefined : resourceCol,
      );
      setReport(validated.report);

      const graph = await discoverProcessGraph(validated.rows, 'case_id', 'activity', 'timestamp');
      setGraphData(graph);
    } catch (err) {
      setGraphError(err instanceof Error ? err.message : 'Erro ao gerar grafo do processo');
      setGraphData(null);
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
        <h2 style={{ marginTop: 0 }}>🔀 Module 1: ProcessExplorer</h2>
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
          <p style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>🔒 Módulo bloqueado</p>
          <p>
            Envie um arquivo no <strong>DataMapper</strong> primeiro para desbloquear o mapeamento de colunas e o
            grafo do processo.
          </p>
        </div>
      </div>
    );
  }

  const availableColumns = Object.keys(mapperResult.rows[0] ?? {});

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>🔀 Module 1: ProcessExplorer</h2>
      <p style={{ color: '#9ca3af' }}>
        Mapeie as colunas do log e gere o grafo (via pm4py) - mude a combinação e gere de novo para comparar.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
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
          <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
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
          <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
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
          <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
            Resource <span style={{ color: '#6b7280' }}>(opcional)</span>
            {mapperResult.suggested_resource_col === resourceCol && resourceCol !== NO_RESOURCE && (
              <span style={{ color: '#10b981' }}> · sugerido</span>
            )}
          </label>
          <select value={resourceCol} onChange={(e) => setResourceCol(e.target.value)} style={selectStyle}>
            <option value={NO_RESOURCE}>Nenhuma</option>
            {availableColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
      </div>

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
        }}
      >
        {graphLoading ? '⏳ Validando e gerando...' : '🔀 Gerar Grafo do Processo'}
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
          }}
        >
          ❌ {graphError}
        </div>
      )}

      {report && (
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '1rem' }}>
          Event Log: <strong style={{ color: '#e5e7eb' }}>{report.total_rows_out}</strong> linhas,{' '}
          <strong style={{ color: '#e5e7eb' }}>{report.total_cases}</strong> casos (de {report.total_rows_in}{' '}
          originais)
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <button type="button" style={exportButtonStyle} onClick={() => downloadJson(graphData, 'process-graph.json')}>
              💾 Salvar JSON
            </button>
            <button type="button" style={exportButtonStyle} onClick={() => handleExportImage('png')}>
              🖼️ Exportar PNG
            </button>
            <button type="button" style={exportButtonStyle} onClick={() => handleExportImage('jpeg')}>
              🖼️ Exportar JPG
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
              }}
            >
              ❌ {exportError}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <ProcessGraph graph={graphData} svgRef={svgRef} />
          </div>

          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', color: '#9ca3af' }}>📝 Ver como texto estruturado (Mermaid)</summary>
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
              style={{ ...exportButtonStyle, marginTop: '0.5rem' }}
              onClick={() => downloadTextFile(graphToMermaidText(graphData), 'process-graph.mmd')}
            >
              💾 Baixar .mmd
            </button>
          </details>
        </div>
      )}
    </div>
  );
}
