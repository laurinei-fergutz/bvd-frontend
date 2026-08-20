import jsPDF from 'jspdf';

import type { Language } from '../context/SettingsContext';
import { formatDuration } from '../components/ProcessGraph';
import { translate, type TranslationKey } from '../i18n/translations';
import type { AnalyzeProcessResponse, AutomationInsight, ProcessGraphResponse } from '../services/api';

const PAGE_WIDTH = 210; // A4, mm
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = { title: [30, 41, 59], heading: [15, 23, 42], body: [51, 65, 85], muted: [100, 116, 139], faint: [148, 163, 184], accentBlue: [30, 64, 175], accentGreen: [5, 150, 105] } as const;

type PdfExportParams = {
  graph: ProcessGraphResponse;
  checkedVariantIndices: Set<number>;
  result: AnalyzeProcessResponse;
  language: Language;
};

/**
 * Builds and downloads a self-contained PDF report of one AI Consultant
 * session: the ProcessExplorer indicators it was based on, which process
 * variants were in scope, and the resulting RPA/AI Agent insights.
 */
export function downloadAiConsultantPdf({ graph, checkedVariantIndices, result, language }: PdfExportParams): void {
  const t = (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars);
  const complexityLabel: Record<AutomationInsight['complexity'], string> = {
    low: t('ai.complexity.low'),
    medium: t('ai.complexity.medium'),
    high: t('ai.complexity.high'),
  };

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

  // Section 2: which process variants were in scope for this analysis
  addSectionHeading(t('pdf.selectedProcesses'));
  const checked = [...checkedVariantIndices].sort((a, b) => a - b);
  if (checked.length === 0 || graph.variants.length === 0) {
    addLine(t('pdf.noProcessesSelected'), { color: INK.faint });
  } else {
    checked.forEach((idx) => {
      const variant = graph.variants[idx];
      if (!variant) return;
      const name = idx === 0 ? t('variants.happyPath') : `${t('variants.variant')} ${idx + 1}`;
      const casesLabel = variant.case_count === 1 ? t('variants.case') : t('variants.casesPlural');
      addLine(`${name} - ${variant.case_count} ${casesLabel} (${variant.percentage.toFixed(1)}%)`, { bold: true });
      addLine(variant.sequence.join(' -> '), { color: INK.muted, size: 9.5 });
      y += 1.5;
    });
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
      doc.text(title, MARGIN, y);
      y += 6;

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
        y += 3;
      });
    };

    renderGroup(t('ai.rpaAutomation'), result.insights.filter((i) => i.category === 'rpa'));
    renderGroup(t('ai.aiAgents'), result.insights.filter((i) => i.category === 'ai_agent'));
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(INK.faint);
    doc.text(`${t('pdf.page')} ${i}/${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: 'right' });
  }

  const dateStamp = new Date(result.generated_at).toISOString().slice(0, 10);
  doc.save(`ai-consultant-insights-${dateStamp}.pdf`);
}
