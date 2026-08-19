import { useState, useRef } from 'react';

import { uploadMapperFile, discoverProcessGraph, type MapperUploadPreviewResponse, type ProcessGraphResponse } from './services/api';
import ProcessGraph from './components/ProcessGraph';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.log'];

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

function hasAcceptedExtension(filename: string): boolean {
  const lowered = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lowered.endsWith(ext));
}

export default function App() {
  const [response, setResponse] = useState<MapperUploadPreviewResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [caseIdCol, setCaseIdCol] = useState('');
  const [activityCol, setActivityCol] = useState('');
  const [timestampCol, setTimestampCol] = useState('');
  const [graphData, setGraphData] = useState<ProcessGraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState('');

  const handleFileChange = async (file: File) => {
    if (!hasAcceptedExtension(file.name)) {
      setError('Por favor, selecione um arquivo CSV, Excel (.xlsx) ou log (.log)');
      return;
    }

    setLoading(true);
    setError('');
    setResponse(null);
    setGraphData(null);
    setGraphError('');

    try {
      const result = await uploadMapperFile(file);
      setResponse(result);

      // Prefer the backend's suggestions (it inspects actual column types/
      // values, e.g. which one is really a datetime) - fall back to a local
      // name-based guess only for whichever field it couldn't determine.
      const columns = Object.keys(result.rows[0] ?? {});
      setCaseIdCol(result.suggested_case_id_col ?? guessColumn(columns, ['case_id', 'caseid', 'case']));
      setActivityCol(result.suggested_activity_col ?? guessColumn(columns, ['activity', 'atividade', 'step', 'evento']));
      setTimestampCol(result.suggested_timestamp_col ?? guessColumn(columns, ['timestamp', 'time', 'data', 'date']));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileChange(files[0]);
    }
  };

  const handleGenerateGraph = async () => {
    if (!response) return;

    if (!caseIdCol || !activityCol || !timestampCol) {
      setGraphError('Selecione as três colunas antes de gerar o grafo');
      return;
    }

    setGraphLoading(true);
    setGraphError('');

    try {
      const result = await discoverProcessGraph(response.rows, caseIdCol, activityCol, timestampCol);
      setGraphData(result);
    } catch (err) {
      setGraphError(err instanceof Error ? err.message : 'Erro ao gerar grafo do processo');
    } finally {
      setGraphLoading(false);
    }
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#e5e7eb', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🚀 BVD - Business Value Discovery</h1>
      <p style={{ fontSize: '1rem', color: '#9ca3af' }}>Platform para análise de logs de processo e descoberta de valor</p>

      {/* Upload Section */}
      <section style={{ marginTop: '2rem' }}>
        <h2>📁 Module 0: DataMapper</h2>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? '#3b82f6' : '#4b5563'}`,
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragActive ? '#1e3a5f' : '#111827',
            transition: 'all 0.2s ease',
            marginTop: '1rem',
          }}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
        >
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {loading ? '⏳ Processando arquivo...' : '📤 Arraste um arquivo CSV, Excel (.xlsx) ou log (.log) aqui'}
          </p>
          <p style={{ color: '#9ca3af' }}>ou clique para selecionar</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.log"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileChange(file);
            }}
            style={{ display: 'none' }}
          />
        </div>

        {/* Error Message */}
        {error && (
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
            ❌ {error}
          </div>
        )}

        {/* Response Section */}
        {response && (
          <div
            style={{
              background: '#1f2937',
              padding: '1.5rem',
              borderRadius: '8px',
              marginTop: '1.5rem',
              border: '1px solid #10b981',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Arquivo</p>
                <p style={{ fontWeight: 'bold' }}>{response.filename}</p>
              </div>
              <div>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Linhas</p>
                <p style={{ fontWeight: 'bold' }}>{response.row_count}</p>
              </div>
              <div>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Colunas</p>
                <p style={{ fontWeight: 'bold' }}>{response.columns.length}</p>
              </div>
            </div>

            {/* Preview */}
            <h3 style={{ marginBottom: '0.5rem' }}>Preview (primeiras linhas)</h3>
            <div
              style={{
                overflowX: 'auto',
                background: '#111827',
                padding: '1rem',
                borderRadius: '4px',
                marginBottom: '1.5rem',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #374151' }}>
                    {Object.keys(response.sample_rows[0] || {}).map((col) => (
                      <th key={col} style={{ padding: '0.5rem', textAlign: 'left', color: '#9ca3af' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {response.sample_rows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1f2937' }}>
                      {Object.values(row).map((val, jdx) => (
                        <td key={jdx} style={{ padding: '0.5rem' }}>
                          {String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ color: '#10b981', marginBottom: '1rem' }}>✅ Schema Inferido com Sucesso!</h3>

            {/* Schema Table */}
            <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem',
                }}
              >
                <thead>
                  <tr style={{ background: '#111827', borderBottom: '2px solid #374151' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#10b981' }}>Coluna</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#10b981' }}>Tipo Inferido</th>
                  </tr>
                </thead>
                <tbody>
                  {response.columns.map((col) => (
                    <tr key={col.name} style={{ borderBottom: '1px solid #1f2937' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{col.name}</td>
                      <td
                        style={{
                          padding: '0.75rem',
                          color: '#3b82f6',
                          fontFamily: 'monospace',
                        }}
                      >
                        {col.type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Full Response JSON */}
            <details>
              <summary style={{ cursor: 'pointer', color: '#9ca3af', marginTop: '1rem' }}>
                📋 Ver resposta completa (JSON)
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
                {JSON.stringify(response, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </section>

      {/* ProcessExplorer Section */}
      {response && (
        <section style={{ marginTop: '3rem' }}>
          <h2>🔀 Module 1: ProcessExplorer</h2>
          <p style={{ color: '#9ca3af' }}>Selecione as colunas do log para montar o grafo do processo (via pm4py)</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                Coluna de Case ID
                {response.suggested_case_id_col === caseIdCol && caseIdCol && (
                  <span style={{ color: '#10b981' }}> · sugerido</span>
                )}
              </label>
              <select value={caseIdCol} onChange={(e) => setCaseIdCol(e.target.value)} style={selectStyle}>
                {Object.keys(response.rows[0] || {}).map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                Coluna de Atividade
                {response.suggested_activity_col === activityCol && activityCol && (
                  <span style={{ color: '#10b981' }}> · sugerido</span>
                )}
              </label>
              <select value={activityCol} onChange={(e) => setActivityCol(e.target.value)} style={selectStyle}>
                {Object.keys(response.rows[0] || {}).map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                Coluna de Timestamp
                {response.suggested_timestamp_col === timestampCol && timestampCol && (
                  <span style={{ color: '#10b981' }}> · sugerido</span>
                )}
              </label>
              <select value={timestampCol} onChange={(e) => setTimestampCol(e.target.value)} style={selectStyle}>
                {Object.keys(response.rows[0] || {}).map((col) => (
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
        </section>
      )}

      {/* Info Section */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: '#111827', borderRadius: '8px', border: '1px solid #374151' }}>
        <h3>ℹ️ Sobre o DataMapper</h3>
        <ul style={{ color: '#d1d5db', lineHeight: '1.8' }}>
          <li>✓ Upload de arquivos CSV, Excel (.xlsx) ou log (.log) com drag & drop</li>
          <li>✓ Interpretação de logs (JSON lines, logfmt ou texto livre) estruturados em JSON</li>
          <li>✓ Análise automática de tipos de dados (string, integer, float, datetime, boolean)</li>
          <li>✓ Sugestão automática das colunas de ID, etapa e timestamp para o ProcessExplorer</li>
          <li>✓ Preview interativo dos dados</li>
          <li>✓ Schema inferido em tempo real</li>
        </ul>
      </section>
    </main>
  );
}
