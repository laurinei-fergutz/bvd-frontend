import { useRef, useState } from 'react';

import { uploadMapperFile, type MapperUploadPreviewResponse } from '../services/api';
import { downloadJson } from '../utils/exportUtils';
import { useSettings } from '../context/SettingsContext';
import {
  IconCheck,
  IconCheckCircle,
  IconClipboard,
  IconFolder,
  IconInfo,
  IconSave,
  IconSpinner,
  IconUpload,
  IconWorkflow,
  IconXCircle,
} from './Icons';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.log', '.xes'];

const exportButtonStyle: React.CSSProperties = {
  background: 'var(--bg-surface-alt)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
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
  const { t } = useSettings();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    if (!hasAcceptedExtension(file.name)) {
      setError(t('datamapper.invalidFile'));
      return;
    }

    setLoading(true);
    setError('');
    onResult(null);

    try {
      const uploaded = await uploadMapperFile(file);
      onResult(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('datamapper.uploadError'));
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
      <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <IconFolder size={22} /> {t('datamapper.title')}
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>{t('datamapper.subtitle')}</p>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? 'var(--accent-blue)' : 'var(--muted)'}`,
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragActive ? 'var(--bg-drag-active)' : 'var(--bg-surface)',
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
        <p
          style={{
            fontSize: '1.15rem',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {loading ? (
            <>
              <IconSpinner size={20} /> {t('datamapper.processing')}
            </>
          ) : (
            <>
              <IconUpload size={20} /> {t('datamapper.dragPrompt')}
            </>
          )}
        </p>
        <p style={{ color: 'var(--text-secondary)' }}>{t('datamapper.clickPrompt')}</p>
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
        <div
          style={{
            background: 'var(--bg-surface-alt)',
            padding: '1.5rem',
            borderRadius: '8px',
            marginTop: '1.5rem',
            border: '1px solid var(--accent-green)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('datamapper.file')}</p>
              <p style={{ fontWeight: 'bold' }}>{result.filename}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('datamapper.rows')}</p>
              <p style={{ fontWeight: 'bold' }}>{result.row_count}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('datamapper.columns')}</p>
              <p style={{ fontWeight: 'bold' }}>{result.columns.length}</p>
            </div>
          </div>

          <h3 style={{ marginBottom: '0.5rem' }}>{t('datamapper.preview')}</h3>
          <div
            style={{
              overflowX: 'auto',
              background: 'var(--bg-surface)',
              padding: '1rem',
              borderRadius: '4px',
              marginBottom: '1.5rem',
              maxHeight: '260px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {Object.keys(result.sample_rows[0] || {}).map((col) => (
                    <th key={col} style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.sample_rows.slice(0, 10).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
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

          <h3
            style={{
              color: 'var(--accent-green)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <IconCheckCircle size={18} /> {t('datamapper.schemaSuccess')}
          </h3>

          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--accent-green)' }}>
                    {t('datamapper.column')}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--accent-green)' }}>
                    {t('datamapper.inferredType')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.columns.map((col) => (
                  <tr key={col.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{col.name}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                      {col.type}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              style={{ ...exportButtonStyle, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => downloadJson(result, `${result.filename.replace(/\.[^.]+$/, '')}.json`)}
            >
              <IconSave size={15} /> {t('datamapper.saveJson')}
            </button>
          </div>

          <details style={{ marginTop: '0.75rem' }}>
            <summary
              style={{
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <IconClipboard size={15} /> {t('datamapper.viewFullResponse')}
            </summary>
            <pre
              style={{
                background: 'var(--bg-surface)',
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

          <p
            style={{
              color: 'var(--text-secondary)',
              marginBottom: 0,
              marginTop: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <IconWorkflow size={16} /> {t('datamapper.goToProcessExplorerPrefix')} <strong>ProcessExplorer</strong>{' '}
            {t('datamapper.goToProcessExplorerSuffix')}
          </p>
        </div>
      )}

      <section
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'var(--bg-surface)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
        }}
      >
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconInfo size={17} /> {t('datamapper.about')}
        </h3>
        <ul style={{ color: 'var(--text-body)', lineHeight: '1.8', listStyle: 'none', padding: 0, margin: 0 }}>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <IconCheck size={15} color="var(--accent-green)" style={{ marginTop: '0.3rem' }} />
            <span>{t('datamapper.about.upload')}</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <IconCheck size={15} color="var(--accent-green)" style={{ marginTop: '0.3rem' }} />
            <span>{t('datamapper.about.logs')}</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <IconCheck size={15} color="var(--accent-green)" style={{ marginTop: '0.3rem' }} />
            <span>{t('datamapper.about.types')}</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <IconCheck size={15} color="var(--accent-green)" style={{ marginTop: '0.3rem' }} />
            <span>{t('datamapper.about.preview')}</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <IconCheck size={15} color="var(--accent-green)" style={{ marginTop: '0.3rem' }} />
            <span>{t('datamapper.about.mapping')}</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
