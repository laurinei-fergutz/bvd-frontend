import jsPDF from 'jspdf';

import type { Language } from '../context/SettingsContext';
import { formatDuration } from '../components/ProcessGraph';
import { translate, type TranslationKey } from '../i18n/translations';
import type {
  AnalysisSession,
  AnalyzeProcessResponse,
  AutomationInsight,
  EvolutionEntry,
  ProcessGraphResponse,
} from '../services/api';

const PAGE_WIDTH = 210; // A4, mm
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = { title: [30, 41, 59], heading: [15, 23, 42], body: [51, 65, 85], muted: [100, 116, 139], faint: [148, 163, 184], accentBlue: [30, 64, 175], accentGreen: [5, 150, 105] } as const;

// Print-oriented palette for the little flow diagrams - fixed regardless of
// the app's current on-screen theme, since a PDF page is always white paper.
const DIAGRAM = {
  boxFill: '#eef2f7',
  boxStroke: '#2563eb',
  happyStroke: '#059669',
  text: '#0f172a',
  arrow: '#64748b',
};

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Rasterizes an SVG string to a PNG data URL via canvas, at the given pixel scale. */
function svgToPngDataUrl(svgString: string, width: number, height: number, scale: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to acquire canvas context');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to rasterize variant diagram'));
    };
    img.src = url;
  });
}

/**
 * Renders one process variant's activity sequence as a small left-to-right
 * flow diagram (boxes + arrows) and rasterizes it to PNG. Units here double
 * as the mm size the image will be placed at in the PDF - only the raster
 * resolution (scale) is bumped up separately for print sharpness.
 */
async function renderVariantDiagram(sequence: string[], isHappyPath: boolean): Promise<{ dataUrl: string; width: number; height: number }> {
  const boxWidth = 34;
  const boxHeight = 14;
  const gapX = 10;
  const padding = 4;
  const width = padding * 2 + sequence.length * boxWidth + (sequence.length - 1) * gapX;
  const height = padding * 2 + boxHeight;
  const stroke = isHappyPath ? DIAGRAM.happyStroke : DIAGRAM.boxStroke;

  const boxes = sequence
    .map((label, idx) => {
      const x = padding + idx * (boxWidth + gapX);
      const displayLabel = label.length > 20 ? `${label.slice(0, 18)}…` : label;
      return `
        <rect x="${x}" y="${padding}" width="${boxWidth}" height="${boxHeight}" rx="2.2" fill="${DIAGRAM.boxFill}" stroke="${stroke}" stroke-width="0.9" />
        <text x="${x + boxWidth / 2}" y="${padding + boxHeight / 2 + 1.2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="3.4" font-weight="500" fill="${DIAGRAM.text}">${escapeXml(displayLabel)}</text>
      `;
    })
    .join('');

  const arrows = sequence
    .slice(0, -1)
    .map((_, idx) => {
      const startX = padding + idx * (boxWidth + gapX) + boxWidth;
      const endX = startX + gapX;
      const midY = padding + boxHeight / 2;
      return `<path d="M${startX},${midY} L${endX - 2},${midY}" stroke="${DIAGRAM.arrow}" stroke-width="0.7" marker-end="url(#pdf-arrow)" />`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <marker id="pdf-arrow" markerWidth="4" markerHeight="4" refX="3" refY="1.5" orient="auto">
        <path d="M0,0 L0,3 L3.5,1.5 z" fill="${DIAGRAM.arrow}" />
      </marker>
    </defs>
    ${arrows}
    ${boxes}
  </svg>`;

  const dataUrl = await svgToPngDataUrl(svg, width, height, 8);
  return { dataUrl, width, height };
}

/**
 * Shared page-building primitives for every PDF export in this file: a
 * jsPDF document plus a running vertical cursor, auto-pagination, and a
 * few text-drawing helpers matching the app's report style (title, section
 * heading, body line with word-wrap).
 */
function createPdfBuilder() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const setColor = (rgb: readonly [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);

  const addTitle = (text: string) => {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setColor(INK.title);
    doc.text(text, MARGIN, y);
    y += 8;
  };

  const addSectionHeading = (text: string) => {
    ensureSpace(14);
    y += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setColor(INK.heading);
    doc.text(text, MARGIN, y);
    y += 7;
  };

  const addLine = (text: string, opts: { bold?: boolean; size?: number; color?: readonly [number, number, number] } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size ?? 10.5);
    setColor(opts.color ?? INK.body);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH) as string[];
    for (const line of lines) {
      ensureSpace(5.5);
      doc.text(line, MARGIN, y);
      y += 5.5;
    }
  };

  const addFooterPageNumbers = (pageLabel: string) => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(INK.faint);
      doc.text(`${pageLabel} ${i}/${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: 'right' });
    }
  };

  return {
    doc,
    ensureSpace,
    setColor,
    addTitle,
    addSectionHeading,
    addLine,
    addFooterPageNumbers,
    get y() {
      return y;
    },
    set y(value: number) {
      y = value;
    },
  };
}

type PdfExportParams = {
  graph: ProcessGraphResponse;
  checkedVariantIndices: Set<number>;
  result: AnalyzeProcessResponse;
  language: Language;
};

/**
 * Builds and downloads a self-contained PDF report of one AI Consultant
 * session: the ProcessExplorer indicators it was based on, a small flow
 * diagram of each process variant that was in scope, and the resulting
 * RPA/AI Agent insights.
 */
export async function downloadAiConsultantPdf({ graph, checkedVariantIndices, result, language }: PdfExportParams): Promise<void> {
  const t = (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars);
  const complexityLabel: Record<AutomationInsight['complexity'], string> = {
    low: t('ai.complexity.low'),
    medium: t('ai.complexity.medium'),
    high: t('ai.complexity.high'),
  };

  const builder = createPdfBuilder();
  const { doc, ensureSpace, setColor, addTitle, addSectionHeading, addLine, addFooterPageNumbers } = builder;

  // Header
  addTitle(t('pdf.title'));
  addLine(
    `${t('pdf.generatedBy')} ${result.engine_used} ${t('pdf.at')} ${new Date(result.generated_at).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')}`,
    { color: INK.muted, size: 9.5 },
  );

  // Section 1: main indicators from ProcessExplorer
  addSectionHeading(t('pdf.mainIndicators'));
  addLine(`${t('processexplorer.casesStat')}: ${graph.metrics.total_cases}`);
  addLine(
    `${t('processexplorer.avgLeadTime')}: ${graph.metrics.avg_lead_time_seconds != null ? formatDuration(graph.metrics.avg_lead_time_seconds) : '—'}`,
  );
  addLine(
    `${t('processexplorer.minLeadTime')}: ${graph.metrics.min_lead_time_seconds != null ? formatDuration(graph.metrics.min_lead_time_seconds) : '—'}`,
  );
  addLine(
    `${t('processexplorer.maxLeadTime')}: ${graph.metrics.max_lead_time_seconds != null ? formatDuration(graph.metrics.max_lead_time_seconds) : '—'}`,
  );

  // Section 2: which process variants were in scope for this analysis - each
  // rendered as a small flow diagram, not just plain text.
  addSectionHeading(t('pdf.selectedProcesses'));
  const checked = [...checkedVariantIndices].sort((a, b) => a - b);
  if (checked.length === 0 || graph.variants.length === 0) {
    addLine(t('pdf.noProcessesSelected'), { color: INK.faint });
  } else {
    for (const idx of checked) {
      const variant = graph.variants[idx];
      if (!variant) continue;
      const name = idx === 0 ? t('variants.happyPath') : `${t('variants.variant')} ${idx + 1}`;
      const casesLabel = variant.case_count === 1 ? t('variants.case') : t('variants.casesPlural');
      addLine(`${name} - ${variant.case_count} ${casesLabel} (${variant.percentage.toFixed(1)}%)`, { bold: true });

      const diagram = await renderVariantDiagram(variant.sequence, idx === 0);
      const displayWidth = Math.min(CONTENT_WIDTH, diagram.width);
      const displayHeight = diagram.height * (displayWidth / diagram.width);

      ensureSpace(displayHeight + 4);
      doc.addImage(diagram.dataUrl, 'PNG', MARGIN, builder.y, displayWidth, displayHeight);
      builder.y += displayHeight + 5;
    }
  }

  // Section 3: the AI Consultant's insights
  addSectionHeading(t('pdf.aiResults'));
  if (result.insights.length === 0) {
    addLine(t('pdf.noInsights'), { color: INK.faint });
  } else {
    const renderGroup = (title: string, insights: AutomationInsight[]) => {
      if (insights.length === 0) return;
      ensureSpace(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      setColor(INK.accentBlue);
      doc.text(title, MARGIN, builder.y);
      builder.y += 6;

      insights.forEach((insight) => {
        addLine(insight.title, { bold: true, size: 10.5, color: INK.heading });
        addLine(`${t('pdf.complexity')}: ${complexityLabel[insight.complexity]}`, { size: 9, color: INK.muted });
        addLine(insight.description);
        addLine(`${t('pdf.efficiencyGain')}: ${insight.estimated_efficiency_gain}`, { color: INK.accentGreen });
        addLine(`${t('pdf.businessJustification')}: ${insight.business_justification}`, { size: 9.5, color: INK.body });
        if (insight.related_activities.length > 0) {
          addLine(`${t('pdf.relatedActivities')}: ${insight.related_activities.join(', ')}`, {
            size: 9,
            color: INK.muted,
          });
        }
        builder.y += 3;
      });
    };

    renderGroup(t('ai.rpaAutomation'), result.insights.filter((i) => i.category === 'rpa'));
    renderGroup(t('ai.aiAgents'), result.insights.filter((i) => i.category === 'ai_agent'));
  }

  addFooterPageNumbers(t('pdf.page'));

  const dateStamp = new Date(result.generated_at).toISOString().slice(0, 10);
  doc.save(`ai-consultant-insights-${dateStamp}.pdf`);
}

function formatMetricValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type HistorySessionPdfParams = {
  session: AnalysisSession;
  evolution: Record<string, EvolutionEntry> | null;
  language: Language;
};

/**
 * Builds and downloads a self-contained PDF summary of one saved History
 * session: the process/ROI indicators it recorded, its AI insights, and -
 * when this session isn't the file's first run - the percentage change of
 * every indicator versus the run immediately before it (the same
 * evolution already shown on screen in the History tab's series view).
 */
export async function downloadHistorySessionPdf({ session, evolution, language }: HistorySessionPdfParams): Promise<void> {
  const t = (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars);
  const locale = language === 'pt' ? 'pt-BR' : 'en-US';

  const { doc, addTitle, addSectionHeading, addLine, addFooterPageNumbers } = createPdfBuilder();

  // Header
  addTitle(t('pdf.historyTitle'));
  addLine(`${t('datamapper.file')}: ${session.filename}`, { bold: true });
  addLine(
    `${t('history.column.date')}: ${new Date(session.created_at).toLocaleString(locale)} · ${t('history.column.engine')}: ${session.ai_engine}`,
    { color: INK.muted, size: 9.5 },
  );
  addLine(
    session.selected_variants > 1
      ? t('history.variantsBadge.multiple', { count: session.selected_variants })
      : t('history.variantsBadge.single'),
    { color: INK.muted, size: 9.5 },
  );

  // Section 1: process metrics snapshot
  addSectionHeading(t('pdf.mainIndicators'));
  const processEntries = Object.entries(session.process_metrics);
  if (processEntries.length === 0) {
    addLine(t('pdf.noProcessesSelected'), { color: INK.faint });
  } else {
    for (const [key, value] of processEntries) {
      addLine(`${humanizeKey(key)}: ${formatMetricValue(value)}`);
    }
  }

  // Section 2: AI Consultant insights summary
  addSectionHeading(t('pdf.aiResults'));
  if (session.ai_insights_summary.length === 0) {
    addLine(t('pdf.noInsights'), { color: INK.faint });
  } else {
    session.ai_insights_summary.forEach((insight) => {
      addLine(String(insight.title ?? ''), { bold: true, size: 10.5, color: INK.heading });
      addLine(
        `${t('pdf.complexity')}: ${formatMetricValue(insight.complexity)} · ${t('pdf.efficiencyGain')}: ${formatMetricValue(insight.estimated_efficiency_gain)}`,
        { size: 9, color: INK.muted },
      );
    });
  }

  // Section 3: ROI Studio results
  addSectionHeading(t('pdf.roiResults'));
  const roiEntries = Object.entries(session.roi_result);
  if (roiEntries.length === 0) {
    addLine(t('pdf.noInsights'), { color: INK.faint });
  } else {
    for (const [key, value] of roiEntries) {
      addLine(`${humanizeKey(key)}: ${formatMetricValue(value)}`);
    }
  }

  // Section 4: what changed versus the previous run of this same file
  addSectionHeading(t('pdf.evolutionSection'));
  if (!evolution || Object.keys(evolution).length === 0) {
    addLine(t('history.firstRun'), { color: INK.faint });
  } else {
    for (const [key, entry] of Object.entries(evolution)) {
      const pctText = entry.pct_change == null ? '—' : `${entry.pct_change >= 0 ? '+' : ''}${entry.pct_change.toFixed(1)}%`;
      const pctColor = entry.pct_change == null ? INK.muted : entry.pct_change >= 0 ? INK.accentGreen : ([220, 38, 38] as const);
      // jsPDF's built-in helvetica font only supports WinAnsi encoding - the
      // U+2192 arrow isn't in it (renders as garbled glyphs), unlike the
      // em-dash used elsewhere in this file, so an ASCII arrow is used here.
      addLine(
        `${humanizeKey(key)}: ${formatMetricValue(entry.previous)} -> ${formatMetricValue(entry.current)} (${pctText})`,
        { color: pctColor },
      );
    }
  }

  addFooterPageNumbers(t('pdf.page'));

  const dateStamp = new Date(session.created_at).toISOString().slice(0, 10);
  const safeFilename = session.filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  doc.save(`historico-${safeFilename}-${dateStamp}.pdf`);
}
