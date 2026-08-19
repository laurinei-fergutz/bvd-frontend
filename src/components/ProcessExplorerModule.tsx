import { useEffect, useRef, useState } from 'react';

import { discoverProcessGraph, type EventLogValidateResponse, type ProcessGraphResponse } from '../services/api';
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

type Props = {
  eventLog: EventLogValidateResponse | null;
  onProcessedChange: (done: boolean) => void;
};

export default function ProcessExplorerModule({ eventLog, onProcessedChange }: Props) {
  const [graphData, setGraphData] = useState<ProcessGraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState('');
  const [exportError, setExportError] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  // A newly validated (or re-validated) event log invalidates whatever graph
  // was generated from the previous one.
  useEffect(() => {
    setGraphData(null);
    setGraphError('');
    setExportError('');
  }, [eventLog]);

  useEffect(() => {
    onProcessedChange(graphData !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]);

  const handleGenerateGraph = async () => {
    if (!eventLog) return;

    setGraphLoading(true);
    setGraphError('');
    setExportError('');

    try {
      const result = await discoverProcessGraph(eventLog.rows, 'case_id', 'activity', 'timestamp');
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

  if (!eventLog) {
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
            Envie um arquivo e valide o mapeamento de colunas no <strong>DataMapper</strong> primeiro para
            desbloquear o grafo do processo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>🔀 Module 1: ProcessExplorer</h2>
      <p style={{ color: '#9ca3af' }}>
        Event Log validado: {eventLog.report.total_rows_out} linhas, {eventLog.report.total_cases} casos.
      </p>

      <button
        type="button"
        onClick={handleGenerateGraph}
        disabled={graphLoading}
        style={{
          marginTop: '1rem',
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
