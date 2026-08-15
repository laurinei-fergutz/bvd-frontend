import { useState, useRef, useEffect } from 'react';

import { uploadMapperFile, discoverProcessGraph, type MapperUploadPreviewResponse, type ProcessGraphResponse } from './services/api';
import ProcessGraph from './components/ProcessGraph';

interface CSVData {
  filename: string;
  rows: Array<Record<string, string>>;
  rowCount: number;
}

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

function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

export default function App() {
  const [csvData, setCSVData] = useState<CSVData | null>(null);
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

  const handleFileChange = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Por favor, selecione um arquivo CSV');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const rows = parseCSV(content);

        if (rows.length === 0) {
          setError('Arquivo CSV vazio ou inválido');
          return;
        }

        setCSVData({
          filename: file.name,
          rows,
          rowCount: rows.length,
        });
        setError('');
        setResponse(null);

        const columns = Object.keys(rows[0] ?? {});
        setCaseIdCol(guessColumn(columns, ['case_id', 'caseid', 'case']));
        setActivityCol(guessColumn(columns, ['activity', 'atividade', 'step', 'evento']));
        setTimestampCol(guessColumn(columns, ['timestamp', 'time', 'data', 'date']));
        setGraphData(null);
        setGraphError('');
      } catch (err) {
        setError(`Erro ao ler arquivo: ${err instanceof Error ? err.message : 'desconhecido'}`);
      }
    };
    reader.readAsText(file);
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

  const handleUpload = async () => {
    if (!csvData) {
      setError('Nenhum arquivo selecionado');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create a File object from csvData
      const file = new File([csvData.rows.map((row) => Object.values(row).join(',')).join('\n')], csvData.filename, {
        type: 'text/csv',
      });

      const result = await uploadMapperFile(file);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateGraph = async () => {
    if (!csvData) return;

    if (!caseIdCol || !activityCol || !timestampCol) {
      setGraphError('Selecione as três colunas antes de gerar o grafo');
      return;
    }

    setGraphLoading(true);
    setGraphError('');

    try {
      const result = await discoverProcessGraph(csvData.rows, caseIdCol, activityCol, timestampCol);
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
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📤 Arraste um arquivo CSV aqui</p>
          <p style={{ color: '#9ca3af' }}>ou clique para selecionar</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileChange(file);
            }}
            style={{ display: 'none' }}
          />
        </div>

        {/* File Info */}
        {csvData && (
          <div
            style={{
              background: '#1f2937',
              padding: '1.5rem',
              borderRadius: '8px',
              marginTop: '1.5rem',
              border: '1px solid #374151',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Arquivo</p>
                <p style={{ fontWeight: 'bold' }}>{csvData.filename}</p>
              </div>
              <div>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Linhas</p>
                <p style={{ fontWeight: 'bold' }}>{csvData.rowCount}</p>
              </div>
              <div>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Colunas</p>
                <p style={{ fontWeight: 'bold' }}>{csvData.rows[0] ? Object.keys(csvData.rows[0]).length : 0}</p>
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
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #374151' }}>
                    {Object.keys(csvData.rows[0] || {}).map((col) => (
                      <th key={col} style={{ padding: '0.5rem', textAlign: 'left', color: '#9ca3af' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1f2937' }}>
                      {Object.values(row).map((val, jdx) => (
                        <td key={jdx} style={{ padding: '0.5rem' }}>
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleUpload}
              disabled={loading}
              style={{
                marginTop: '1.5rem',
                background: loading ? '#4b5563' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              {loading ? '⏳ Processando...' : '🚀 Analisar Schema'}
            </button>
          </div>
        )}

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
      {csvData && (
        <section style={{ marginTop: '3rem' }}>
          <h2>🔀 Module 1: ProcessExplorer</h2>
          <p style={{ color: '#9ca3af' }}>Selecione as colunas do log para montar o grafo do processo (via pm4py)</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                Coluna de Case ID
              </label>
              <select value={caseIdCol} onChange={(e) => setCaseIdCol(e.target.value)} style={selectStyle}>
                {Object.keys(csvData.rows[0] || {}).map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                Coluna de Atividade
              </label>
              <select value={activityCol} onChange={(e) => setActivityCol(e.target.value)} style={selectStyle}>
                {Object.keys(csvData.rows[0] || {}).map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                Coluna de Timestamp
              </label>
              <select value={timestampCol} onChange={(e) => setTimestampCol(e.target.value)} style={selectStyle}>
                {Object.keys(csvData.rows[0] || {}).map((col) => (
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
          <li>✓ Upload de arquivos CSV com drag & drop</li>
          <li>✓ Análise automática de tipos de dados (string, integer, float, datetime, boolean)</li>
          <li>✓ Preview interativo dos dados</li>
          <li>✓ Schema inferido em tempo real</li>
        </ul>
      </section>
    </main>
  );
}
