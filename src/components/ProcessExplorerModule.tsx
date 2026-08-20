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
import { useSettings } from '../context/SettingsContext';
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

const NO_RESOURCE = '__none__';
const NO_EXTRA_FILTER = '__none__';

const exportButtonStyle: React.CSSProperties = {
  background: 'var(--bg-surface-alt)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '0.4rem 0.9rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
};

const labelStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
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
  const { t } = useSettings();
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
      setGraphError(t('processexplorer.missingColumns'));
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
      setGraphError(t('processexplorer.noRowsAfterFilters'));
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
      setGraphError(err instanceof Error ? err.message : t('processexplorer.graphError'));
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
      // Canvas fillStyle can't resolve CSS custom properties, so read the
      // current theme's shell color at export time instead of hardcoding one.
      const background = getComputedStyle(document.documentElement).getPropertyValue('--bg-shell').trim() || '#0b1220';
      await downloadSvgAsImage(svgRef.current, format, `process-graph.${extension}`, background);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : t('processexplorer.exportError'));
    }
  };

  if (!mapperResult) {
    return (
      <div>
        <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconWorkflow size={22} /> {t('processexplorer.title')}
        </h2>
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border)',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
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
            <IconLock size={18} /> {t('processexplorer.locked')}
          </p>
          <p>
            {t('processexplorer.lockedMessagePrefix')} <strong>DataMapper</strong>{' '}
            {t('processexplorer.lockedMessageSuffix')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <IconWorkflow size={22} /> {t('processexplorer.title')}
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>{t('processexplorer.subtitle')}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        <div>
          <label style={labelStyle}>
            {t('processexplorer.caseId')} <span style={{ color: 'var(--danger-light)' }}>*</span>
            {mapperResult.suggested_case_id_col === caseIdCol && caseIdCol && (
              <span style={{ color: 'var(--accent-green)' }}> {t('processexplorer.suggested')}</span>
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
            {t('processexplorer.activity')} <span style={{ color: 'var(--danger-light)' }}>*</span>
            {mapperResult.suggested_activity_col === activityCol && activityCol && (
              <span style={{ color: 'var(--accent-green)' }}> {t('processexplorer.suggested')}</span>
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
            {t('processexplorer.timestamp')} <span style={{ color: 'var(--danger-light)' }}>*</span>
            {mapperResult.suggested_timestamp_col === timestampCol && timestampCol && (
              <span style={{ color: 'var(--accent-green)' }}> {t('processexplorer.suggested')}</span>
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
            {t('processexplorer.resource')} <span style={{ color: 'var(--text-tertiary)' }}>{t('processexplorer.optional')}</span>
            {mapperResult.suggested_resource_col === resourceCol && resourceCol !== NO_RESOURCE && (
              <span style={{ color: 'var(--accent-green)' }}> {t('processexplorer.suggested')}</span>
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
            <option value={NO_RESOURCE}>{t('processexplorer.none')}</option>
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
            color: 'var(--text-secondary)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <IconFilter size={15} /> {t('processexplorer.dynamicFilters')}
        </summary>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label style={labelStyle}>{t('processexplorer.periodFrom')}</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={selectStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('processexplorer.periodTo')}</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={selectStyle} />
          </div>

          {resourceCol !== NO_RESOURCE && (
            <div>
              <label style={labelStyle}>{t('processexplorer.resourceRegion')}</label>
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
            <label style={labelStyle}>{t('processexplorer.extraFilter')}</label>
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
              <option value={NO_EXTRA_FILTER}>{t('processexplorer.noneFilter')}</option>
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
                  <label style={labelStyle}>
                    {extraFilterColumn} - {t('processexplorer.min')}
                  </label>
                  <input
                    type="number"
                    value={extraFilterMin}
                    onChange={(e) => setExtraFilterMin(e.target.value)}
                    style={selectStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    {extraFilterColumn} - {t('processexplorer.max')}
                  </label>
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
                <label style={labelStyle}>
                  {t('processexplorer.valuesOf')} {extraFilterColumn}
                </label>
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
          background: graphLoading ? 'var(--muted)' : 'var(--accent-purple)',
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
            <IconSpinner size={16} /> {t('processexplorer.generating')}
          </>
        ) : (
          <>
            <IconWorkflow size={17} /> {t('processexplorer.generateGraph')}
          </>
        )}
      </button>

      {graphError && (
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
          <IconXCircle size={18} /> {graphError}
        </div>
      )}

      {report && filteredRowCount !== null && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '1rem' }}>
          {t('processexplorer.filtersSummaryPrefix')}{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{filteredRowCount}</strong> {t('processexplorer.of')}{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{mapperResult.rows.length}</strong>{' '}
          {t('processexplorer.rowsWord')} · {t('processexplorer.eventLog')}{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{report.total_rows_out}</strong>{' '}
          {t('processexplorer.rowsWord')},{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{report.total_cases}</strong> {t('processexplorer.cases')}
          {report.rows_dropped_missing_case_id > 0 && (
            <>
              {' '}
              · {report.rows_dropped_missing_case_id} {t('processexplorer.droppedMissingCaseId')}
            </>
          )}
          {report.rows_dropped_missing_timestamp > 0 && (
            <>
              {' '}
              · {report.rows_dropped_missing_timestamp} {t('processexplorer.droppedMissingTimestamp')}
            </>
          )}
          {report.timestamps_normalized > 0 && (
            <>
              {' '}
              · {report.timestamps_normalized} {t('processexplorer.timestampsNormalized')}
            </>
          )}
          {report.activities_trimmed > 0 && (
            <>
              {' '}
              · {report.activities_trimmed} {t('processexplorer.activitiesTrimmed')}
            </>
          )}
        </p>
      )}

      {graphData && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard label={t('processexplorer.casesStat')} value={String(graphData.metrics.total_cases)} />
            <StatCard
              label={t('processexplorer.avgLeadTime')}
              value={graphData.metrics.avg_lead_time_seconds != null ? formatDuration(graphData.metrics.avg_lead_time_seconds) : '—'}
              hint={t('processexplorer.totalCaseDuration')}
            />
            <StatCard
              label={t('processexplorer.minLeadTime')}
              value={graphData.metrics.min_lead_time_seconds != null ? formatDuration(graphData.metrics.min_lead_time_seconds) : '—'}
            />
            <StatCard
              label={t('processexplorer.maxLeadTime')}
              value={graphData.metrics.max_lead_time_seconds != null ? formatDuration(graphData.metrics.max_lead_time_seconds) : '—'}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <button
              type="button"
              style={{ ...exportButtonStyle, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => downloadJson(graphData, 'process-graph.json')}
            >
              <IconSave size={15} /> {t('datamapper.saveJson')}
            </button>
            <button
              type="button"
              style={{ ...exportButtonStyle, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => handleExportImage('png')}
            >
              <IconImage size={15} /> {t('processexplorer.exportPng')}
            </button>
            <button
              type="button"
              style={{ ...exportButtonStyle, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => handleExportImage('jpeg')}
            >
              <IconImage size={15} /> {t('processexplorer.exportJpg')}
            </button>
          </div>

          {exportError && (
            <div
              style={{
                background: 'var(--danger-bg)',
                color: 'var(--danger-text)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid var(--danger-border)',
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
              style={{
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <IconCode size={15} /> {t('processexplorer.viewAsMermaid')}
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
              <IconSave size={15} /> {t('processexplorer.downloadMmd')}
            </button>
          </details>

          {graphData.variants.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconLayers size={18} /> {t('processexplorer.variants')}
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: 0, fontSize: '0.85rem' }}>
                {t('processexplorer.variantsSubtitlePrefix')} <strong>AI Consultant</strong>{' '}
                {t('processexplorer.variantsSubtitleSuffix')}
              </p>
              <ProcessVariants
                variants={graphData.variants}
                checkedIndices={checkedVariants}
                onToggle={handleToggleVariant}
              />
              {checkedVariants.size === 0 && (
                <p
                  style={{
                    color: 'var(--danger-light)',
                    fontSize: '0.8rem',
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <IconAlertTriangle size={14} /> {t('processexplorer.noVariantSelected')}
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
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '0.85rem 1rem',
      }}
    >
      <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.8rem' }}>{label}</p>
      <p style={{ fontWeight: 'bold', fontSize: '1.25rem', margin: '0.15rem 0 0' }}>{value}</p>
      {hint && <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: '0.7rem' }}>{hint}</p>}
    </div>
  );
}
