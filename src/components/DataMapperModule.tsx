import { useRef, useState } from 'react';

import {
  uploadMapperFile,
  validateEventLog,
  type EventLogValidateResponse,
  type MapperUploadPreviewResponse,
} from '../services/api';
import { downloadJson } from '../utils/exportUtils';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.log', '.xes'];
const NO_RESOURCE = '__none__';

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  borderRadius: '6px',
  border: '1px solid #374151',
  background: '#111827',
  color: '#e5e7eb',
};

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
  eventLog: EventLogValidateResponse | null;
  onEventLog: (eventLog: EventLogValidateResponse | null) => void;
};

export default function DataMapperModule({ eventLog, onEventLog }: Props) {
  const [uploadResult, setUploadResult] = useState<MapperUploadPreviewResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [caseIdCol, setCaseIdCol] = useState('');
  const [activityCol, setActivityCol] = useState('');
  const [timestampCol, setTimestampCol] = useState('');
  const [resourceCol, setResourceCol] = useState(NO_RESOURCE);
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState('');

  const handleFileChange = async (file: File) => {
    if (!hasAcceptedExtension(file.name)) {
      setError('Por favor, selecione um arquivo CSV, Excel (.xlsx), log (.log) ou XES (.xes)');
      return;
    }

    setLoading(true);
    setError('');
    setValidateError('');
    setUploadResult(null);
    onEventLog(null);

    try {
      const uploaded = await uploadMapperFile(file);
      setUploadResult(uploaded);

      const columns = Object.keys(uploaded.rows[0] ?? {});
      setCaseIdCol(uploaded.suggested_case_id_col ?? columns[0] ?? '');
      setActivityCol(uploaded.suggested_activity_col ?? columns[0] ?? '');
      setTimestampCol(uploaded.suggested_timestamp_col ?? columns[0] ?? '');
      setResourceCol(uploaded.suggested_resource_col ?? NO_RESOURCE);
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

  const handleValidate = async () => {
    if (!uploadResult) return;

    if (!caseIdCol || !activityCol || !timestampCol) {
      setValidateError('Mapeie as três colunas obrigatórias (Case ID, Activity e Timestamp)');
      return;
    }

    setValidating(true);
    setValidateError('');
    onEventLog(null);

    try {
      const validated = await validateEventLog(
        uploadResult.rows,
        caseIdCol,
        activityCol,
        timestampCol,
        resourceCol === NO_RESOURCE ? undefined : resourceCol,
      );
      onEventLog(validated);
    } catch (err) {
      setValidateError(err instanceof Error ? err.message : 'Erro ao validar o event log');
    } finally {
      setValidating(false);
    }
  };

  const availableColumns = Object.keys(uploadResult?.rows[0] ?? {});

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>📁 Module 0: DataMapper</h2>
      <p style={{ color: '#9ca3af' }}>A porta de entrada inteligente: envie seus dados e mapeie os campos obrigatórios.</p>

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

      {uploadResult && (
        <div
          style={{
            background: '#1f2937',
            padding: '1.5rem',
            borderRadius: '8px',
            marginTop: '1.5rem',
            border: '1px solid #374151',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Arquivo</p>
              <p style={{ fontWeight: 'bold' }}>{uploadResult.filename}</p>
            </div>
            <div>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Linhas</p>
              <p style={{ fontWeight: 'bold' }}>{uploadResult.row_count}</p>
            </div>
            <div>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Colunas</p>
              <p style={{ fontWeight: 'bold' }}>{uploadResult.columns.length}</p>
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
                  {Object.keys(uploadResult.sample_rows[0] || {}).map((col) => (
                    <th key={col} style={{ padding: '0.5rem', textAlign: 'left', color: '#9ca3af' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploadResult.sample_rows.slice(0, 10).map((row, idx) => (
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
                {uploadResult.columns.map((col) => (
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
              onClick={() => downloadJson(uploadResult, `${uploadResult.filename.replace(/\.[^.]+$/, '')}.json`)}
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
              {JSON.stringify(uploadResult, null, 2)}
            </pre>
          </details>

          {/* Dictionary of required/optional attributes - the actual column mapping step */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #374151' }}>
            <h3 style={{ marginBottom: '0.25rem' }}>🧭 Mapeamento de Colunas</h3>
            <p style={{ color: '#9ca3af', marginTop: 0 }}>
              Diga ao DataMapper qual coluna representa cada atributo do Event Log.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                  Case ID <span style={{ color: '#f87171' }}>*</span>
                  {uploadResult.suggested_case_id_col === caseIdCol && caseIdCol && (
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
                  {uploadResult.suggested_activity_col === activityCol && activityCol && (
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
                  {uploadResult.suggested_timestamp_col === timestampCol && timestampCol && (
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
                  {uploadResult.suggested_resource_col === resourceCol && resourceCol !== NO_RESOURCE && (
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
              onClick={handleValidate}
              disabled={validating}
              style={{
                marginTop: '1.5rem',
                background: validating ? '#4b5563' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: validating ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              {validating ? '⏳ Validando...' : '✅ Validar e Estruturar Event Log'}
            </button>

            {validateError && (
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
                ❌ {validateError}
              </div>
            )}

            {eventLog && (
              <div
                style={{
                  marginTop: '1.5rem',
                  background: '#111827',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  padding: '1.5rem',
                }}
              >
                <h3 style={{ color: '#10b981', marginTop: 0 }}>🔓 Event Log validado e estruturado!</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
                  <ReportStat label="Linhas de entrada" value={eventLog.report.total_rows_in} />
                  <ReportStat label="Linhas no Event Log" value={eventLog.report.total_rows_out} />
                  <ReportStat label="Casos (Case IDs)" value={eventLog.report.total_cases} />
                  <ReportStat
                    label="Descartadas (Case ID vazio)"
                    value={eventLog.report.rows_dropped_missing_case_id}
                    warn
                  />
                  <ReportStat
                    label="Descartadas (timestamp inválido)"
                    value={eventLog.report.rows_dropped_missing_timestamp}
                    warn
                  />
                  <ReportStat label="Timestamps normalizados" value={eventLog.report.timestamps_normalized} />
                  <ReportStat label="Atividades com espaços removidos" value={eventLog.report.activities_trimmed} />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    style={exportButtonStyle}
                    onClick={() => downloadJson(eventLog, 'event-log.json')}
                  >
                    💾 Salvar Event Log (JSON)
                  </button>
                </div>

                <p style={{ color: '#9ca3af', marginBottom: 0, marginTop: '1rem' }}>
                  🔀 O módulo <strong>ProcessExplorer</strong> já está desbloqueado com estes dados.
                </p>
              </div>
            )}
          </div>
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
          <li>✓ Mapeamento de Case ID, Activity e Timestamp (obrigatórios) e Resource (opcional)</li>
          <li>✓ Sanitização automática: descarte de Case ID vazio, normalização de timestamps, remoção de espaços em atividades e ordenação cronológica</li>
          <li>✓ Preview interativo dos dados (amostragem inteligente de até 100 linhas)</li>
        </ul>
      </section>
    </div>
  );
}

function ReportStat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <p style={{ color: '#9ca3af', margin: 0 }}>{label}</p>
      <p style={{ fontWeight: 'bold', fontSize: '1.1rem', margin: 0, color: warn && value > 0 ? '#f87171' : '#e5e7eb' }}>
        {value}
      </p>
    </div>
  );
}
