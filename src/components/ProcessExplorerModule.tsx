import { useEffect, useRef, useState } from 'react';

import { discoverProcessGraph, type MapperUploadPreviewResponse, type ProcessGraphResponse } from '../services/api';
import ProcessGraph from './ProcessGraph';
import { downloadJson, downloadSvgAsImage, downloadTextFile, graphToMermaidText } from '../utils/exportUtils';

const GRAPH_BACKGROUND = '#0b1220';

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

function guessColumn(columns: string[], patterns: string[]): string {
  const lowered = columns.map((col) => col.toLowerCase());
  for (const pattern of patterns) {
    const idx = lowered.findIndex((col) => col.includes(pattern));
    if (idx !== -1) return columns[idx];
  }
  return columns[0] ?? '';
}

type Props = {
  mapperResult: MapperUploadPreviewResponse | null;
  onProcessedChange: (done: boolean) => void;
};

export default function ProcessExplorerModule({ mapperResult, onProcessedChange }: Props) {
  const [caseIdCol, setCaseIdCol] = useState('');
  const [activityCol, setActivityCol] = useState('');
  const [timestampCol, setTimestampCol] = useState('');
  const [graphData, setGraphData] = useState<ProcessGraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState('');
  const [exportError, setExportError] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  // Re-derive the column picks whenever a new file comes in from DataMapper -
  // prefer the backend's suggestions, falling back to a local name-based guess.
  useEffect(() => {
    if (!mapperResult) return;

    const columns = Object.keys(mapperResult.rows[0] ?? {});
    setCaseIdCol(mapperResult.suggested_case_id_col ?? guessColumn(columns, ['case_id', 'caseid', 'case']));
    setActivityCol(mapperResult.suggested_activity_col ?? guessColumn(columns, ['activity', 'atividade', 'step', 'evento']));
    setTimestampCol(mapperResult.suggested_timestamp_col ?? guessColumn(columns, ['timestamp', 'time', 'data', 'date']));
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
      setGraphError('Selecione as três colunas antes de gerar o grafo');
      return;
    }

    setGraphLoading(true);
    setGraphError('');
    setExportError('');

    try {
      const result = await discoverProcessGraph(mapperResult.rows, caseIdCol, activityCol, timestampCol);
      setGraphData(result);
    } catch (err) {
      setGraphError(err instanceof Error ? err.message : 'Erro ao gerar grafo do processo');
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
          <p style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>📁 Nenhum dado carregado ainda</p>
          <p>Envie um arquivo no <strong>DataMapper</strong> primeiro para montar o grafo do processo.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>🔀 Module 1: ProcessExplorer</h2>
      <p style={{ color: '#9ca3af' }}>Selecione as colunas do log para montar o grafo do processo (via pm4py)</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
            Coluna de Case ID
            {mapperResult.suggested_case_id_col === caseIdCol && caseIdCol && (
              <span style={{ color: '#10b981' }}> · sugerido</span>
            )}
          </label>
          <select value={caseIdCol} onChange={(e) => setCaseIdCol(e.target.value)} style={selectStyle}>
            {Object.keys(mapperResult.rows[0] || {}).map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
            Coluna de Atividade
            {mapperResult.suggested_activity_col === activityCol && activityCol && (
              <span style={{ color: '#10b981' }}> · sugerido</span>
            )}
          </label>
          <select value={activityCol} onChange={(e) => setActivityCol(e.target.value)} style={selectStyle}>
            {Object.keys(mapperResult.rows[0] || {}).map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
            Coluna de Timestamp
            {mapperResult.suggested_timestamp_col === timestampCol && timestampCol && (
              <span style={{ color: '#10b981' }}> · sugerido</span>
            )}
          </label>
          <select value={timestampCol} onChange={(e) => setTimestampCol(e.target.value)} style={selectStyle}>
            {Object.keys(mapperResult.rows[0] || {}).map((col) => (
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
        {graphLoading ? '⏳ Gerando grafo...' : '🔀 Gerar Grafo do Processo'}
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
