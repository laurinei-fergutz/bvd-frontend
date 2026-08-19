import { useRef, useState } from 'react';

import { uploadMapperFile, type MapperUploadPreviewResponse } from '../services/api';
import { downloadJson } from '../utils/exportUtils';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.log', '.xes'];

const exportButtonStyle: React.CSSProperties = {
  background: '#1f2937',
  color: '#e5e7eb',
  border: '1px solid #374151',
  borderRadius: '6px',
  padding: '0.4rem 0.9rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
};

function hasAcceptedExtension(filename: string): boolean {
  const lowered = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lowered.endsWith(ext));
}

type Props = {
  result: MapperUploadPreviewResponse | null;
  onResult: (result: MapperUploadPreviewResponse | null) => void;
};

export default function DataMapperModule({ result, onResult }: Props) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    if (!hasAcceptedExtension(file.name)) {
      setError('Por favor, selecione um arquivo CSV, Excel (.xlsx), log (.log) ou XES (.xes)');
      return;
    }

    setLoading(true);
    setError('');
    onResult(null);

    try {
      const uploaded = await uploadMapperFile(file);
      onResult(uploaded);
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

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>📁 Module 0: DataMapper</h2>
      <p style={{ color: '#9ca3af' }}>A porta de entrada inteligente: envie seus dados e veja o schema inferido.</p>

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
          {loading ? '⏳ Processando arquivo...' : '📤 Arraste um arquivo CSV, Excel (.xlsx), log (.log) ou XES (.xes) aqui'}
        </p>
        <p style={{ color: '#9ca3af' }}>ou clique para selecionar</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.log,.xes"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileChange(file);
          }}
          style={{ display: 'none' }}
        />
      </div>

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

      {result && (
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
              <p style={{ fontWeight: 'bold' }}>{result.filename}</p>
            </div>
            <div>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Linhas</p>
              <p style={{ fontWeight: 'bold' }}>{result.row_count}</p>
            </div>
            <div>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Colunas</p>
              <p style={{ fontWeight: 'bold' }}>{result.columns.length}</p>
            </div>
          </div>

          <h3 style={{ marginBottom: '0.5rem' }}>Preview (até 100 primeiras linhas)</h3>
          <div
            style={{
              overflowX: 'auto',
              background: '#111827',
              padding: '1rem',
              borderRadius: '4px',
              marginBottom: '1.5rem',
              maxHeight: '260px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #374151' }}>
                  {Object.keys(result.sample_rows[0] || {}).map((col) => (
                    <th key={col} style={{ padding: '0.5rem', textAlign: 'left', color: '#9ca3af' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.sample_rows.slice(0, 10).map((row, idx) => (
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

          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#111827', borderBottom: '2px solid #374151' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#10b981' }}>Coluna</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#10b981' }}>Tipo Inferido</th>
                </tr>
              </thead>
              <tbody>
                {result.columns.map((col) => (
                  <tr key={col.name} style={{ borderBottom: '1px solid #1f2937' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{col.name}</td>
                    <td style={{ padding: '0.75rem', color: '#3b82f6', fontFamily: 'monospace' }}>{col.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              style={exportButtonStyle}
              onClick={() => downloadJson(result, `${result.filename.replace(/\.[^.]+$/, '')}.json`)}
            >
              💾 Salvar JSON
            </button>
          </div>

          <details style={{ marginTop: '0.75rem' }}>
            <summary style={{ cursor: 'pointer', color: '#9ca3af' }}>📋 Ver resposta completa (JSON)</summary>
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
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>

          <p style={{ color: '#9ca3af', marginBottom: 0, marginTop: '1.5rem' }}>
            🔀 Vá para o <strong>ProcessExplorer</strong> para mapear as colunas e montar o grafo do processo.
          </p>
        </div>
      )}

      <section
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: '#111827',
          borderRadius: '8px',
          border: '1px solid #374151',
        }}
      >
        <h3>ℹ️ Sobre o DataMapper</h3>
        <ul style={{ color: '#d1d5db', lineHeight: '1.8' }}>
          <li>✓ Upload de arquivos CSV, Excel (.xlsx), log (.log) ou XES (.xes) com drag & drop</li>
          <li>✓ Interpretação de logs (JSON lines, logfmt ou texto livre) estruturados em JSON</li>
          <li>✓ Análise automática de tipos de dados (string, integer, float, datetime, boolean)</li>
          <li>✓ Preview interativo dos dados (amostragem inteligente de até 100 linhas)</li>
          <li>✓ Mapeamento de colunas e sanitização acontecem no ProcessExplorer, para testar combinações diferentes</li>
        </ul>
      </section>
    </div>
  );
}
