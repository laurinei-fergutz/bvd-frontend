import { useEffect, useState } from 'react';

import { discoverProcessGraph, type MapperUploadPreviewResponse, type ProcessGraphResponse } from '../services/api';
import ProcessGraph from './ProcessGraph';

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

    try {
      const result = await discoverProcessGraph(mapperResult.rows, caseIdCol, activityCol, timestampCol);
      setGraphData(result);
    } catch (err) {
      setGraphError(err instanceof Error ? err.message : 'Erro ao gerar grafo do processo');
    } finally {
      setGraphLoading(false);
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
        <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
          <ProcessGraph graph={graphData} />
        </div>
      )}
    </div>
  );
}
