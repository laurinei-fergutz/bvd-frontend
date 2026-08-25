export const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export type MapperColumn = {
  name: string;
  type: 'string' | 'integer' | 'float' | 'datetime' | 'boolean';
};

export type MapperUploadPreviewRequest = {
  filename: string;
  columns?: MapperColumn[];
  row_count: number;
  sample_rows: Array<Record<string, string | number | boolean | null>>;
};

export type MapperUploadPreviewResponse = {
  accepted: boolean;
  filename: string;
  row_count: number;
  columns: MapperColumn[];
  sample_rows: Array<Record<string, string | number | boolean | null>>;
  rows: Array<Record<string, string | number | boolean | null>>;
  suggested_case_id_col: string | null;
  suggested_activity_col: string | null;
  suggested_timestamp_col: string | null;
  suggested_resource_col: string | null;
};

export async function fetchHealth() {
  const response = await fetch(`${apiBaseUrl}/health`);
  return response.json();
}

export async function uploadMapperPreview(
  payload: MapperUploadPreviewRequest,
): Promise<MapperUploadPreviewResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/mapper/upload-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to upload mapper preview');
  }

  return response.json();
}

export async function uploadMapperFile(file: File): Promise<MapperUploadPreviewResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${apiBaseUrl}/api/v1/mapper/upload-file`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload mapper file');
  }

  return response.json();
}

export type EventLogRow = Record<string, string | number | boolean | null>;

export type SanitizationReport = {
  total_rows_in: number;
  rows_dropped_missing_case_id: number;
  rows_dropped_missing_timestamp: number;
  timestamps_normalized: number;
  activities_trimmed: number;
  total_rows_out: number;
  total_cases: number;
};

export type EventLogValidateResponse = {
  rows: EventLogRow[];
  report: SanitizationReport;
};

export async function validateEventLog(
  rows: EventLogRow[],
  caseIdCol: string,
  activityCol: string,
  timestampCol: string,
  resourceCol?: string,
): Promise<EventLogValidateResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/mapper/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rows,
      case_id_col: caseIdCol,
      activity_col: activityCol,
      timestamp_col: timestampCol,
      resource_col: resourceCol || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to validate event log');
  }

  return response.json();
}

export type ProcessGraphNode = {
  id: string;
  label: string;
  count: number;
  type: 'activity' | 'start' | 'end';
};

export type ProcessGraphEdge = {
  source: string;
  target: string;
  count: number;
  avg_duration_seconds: number | null;
  dependency: number | null;
  bottleneck: boolean;
};

export type ProcessMetrics = {
  total_cases: number;
  avg_lead_time_seconds: number | null;
  median_lead_time_seconds: number | null;
  min_lead_time_seconds: number | null;
  max_lead_time_seconds: number | null;
};

export type ProcessVariant = {
  sequence: string[];
  case_count: number;
  percentage: number;
};

export type ProcessGraphResponse = {
  nodes: ProcessGraphNode[];
  edges: ProcessGraphEdge[];
  metrics: ProcessMetrics;
  variants: ProcessVariant[];
};

export async function discoverProcessGraph(
  rows: Array<Record<string, unknown>>,
  caseIdCol: string,
  activityCol: string,
  timestampCol: string,
): Promise<ProcessGraphResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/explorer/discover-graph`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rows,
      case_id_col: caseIdCol,
      activity_col: activityCol,
      timestamp_col: timestampCol,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to discover process graph');
  }

  return response.json();
}

export type LLMEngine = {
  id: string;
  label: string;
  configured: boolean;
};

export type EnginesResponse = {
  engines: LLMEngine[];
  default_system_prompt: string;
};

export async function fetchLLMEngines(): Promise<EnginesResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/ai/engines`);
  if (!response.ok) {
    throw new Error('Failed to fetch LLM engines');
  }
  return response.json();
}

export type AutomationInsight = {
  title: string;
  category: 'rpa' | 'ai_agent';
  description: string;
  estimated_efficiency_gain: string;
  complexity: 'low' | 'medium' | 'high';
  business_justification: string;
  related_activities: string[];
};

export type AnalyzeProcessResponse = {
  insights: AutomationInsight[];
  engine_used: string;
  system_prompt: string;
  generated_at: string;
};

export async function analyzeProcess(
  graph: ProcessGraphResponse,
  engine: string,
  extraPrompt?: string,
): Promise<AnalyzeProcessResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      engine,
      nodes: graph.nodes,
      edges: graph.edges,
      metrics: graph.metrics,
      variants: graph.variants,
      extra_prompt: extraPrompt || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to analyze process');
  }

  return response.json();
}

export type RoiAssumptions = {
  hourly_cost: number;
  monthly_case_volume: number;
  hours_per_month_per_fte: number;
  legacy_license_monthly_cost: number;
  ai_monthly_cost: number;
  one_time_implementation_cost: number;
  currency: 'BRL' | 'USD';
};

export type RoiCalculationResult = {
  observed_bottleneck_hours: number;
  observed_cases: number;
  hours_lost_per_case: number;
  efficiency_factor_pct: number;
  efficiency_factor_estimated: boolean;
  monthly_hours_saved: number;
  monthly_fte_saved: number;
  monthly_labor_savings: number;
  monthly_license_savings: number;
  gross_monthly_savings: number;
  monthly_tco: number;
  net_monthly_savings: number;
  annual_gross_savings: number;
  annual_tco: number;
  net_annual_savings: number;
  roi_percentage: number | null;
  payback_months: number | null;
  currency: string;
};

type RoiCalculateRequestBody = {
  edges: Array<{ avg_duration_seconds: number | null; count: number; bottleneck: boolean }>;
  total_cases: number;
  insights: Array<{ estimated_efficiency_gain: string }>;
  assumptions: RoiAssumptions;
};

function buildRoiRequestBody(
  graph: ProcessGraphResponse,
  insights: AutomationInsight[],
  assumptions: RoiAssumptions,
): RoiCalculateRequestBody {
  return {
    edges: graph.edges.map((e) => ({
      avg_duration_seconds: e.avg_duration_seconds,
      count: e.count,
      bottleneck: e.bottleneck,
    })),
    total_cases: graph.metrics.total_cases,
    insights: insights.map((i) => ({ estimated_efficiency_gain: i.estimated_efficiency_gain })),
    assumptions,
  };
}

async function postRoi<T>(path: string, body: RoiCalculateRequestBody): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api/v1/roi${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to calculate ROI');
  }

  return response.json();
}

export async function calculateRoi(
  graph: ProcessGraphResponse,
  insights: AutomationInsight[],
  assumptions: RoiAssumptions,
): Promise<RoiCalculationResult> {
  return postRoi<RoiCalculationResult>('/calculate', buildRoiRequestBody(graph, insights, assumptions));
}

async function downloadRoiExport(
  path: string,
  graph: ProcessGraphResponse,
  insights: AutomationInsight[],
  assumptions: RoiAssumptions,
  filename: string,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/v1/roi${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRoiRequestBody(graph, insights, assumptions)),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to export ROI report');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadRoiXlsx(
  graph: ProcessGraphResponse,
  insights: AutomationInsight[],
  assumptions: RoiAssumptions,
): Promise<void> {
  return downloadRoiExport('/export/xlsx', graph, insights, assumptions, 'roi-business-case.xlsx');
}

export function downloadRoiCsv(
  graph: ProcessGraphResponse,
  insights: AutomationInsight[],
  assumptions: RoiAssumptions,
): Promise<void> {
  return downloadRoiExport('/export/csv', graph, insights, assumptions, 'roi-business-case.csv');
}

export async function fetchSavedRoiAssumptions(): Promise<RoiAssumptions | null> {
  const response = await fetch(`${apiBaseUrl}/api/v1/roi/assumptions`);
  if (!response.ok) {
    throw new Error('Failed to load saved ROI assumptions');
  }
  return response.json();
}

export async function saveRoiAssumptions(assumptions: RoiAssumptions): Promise<RoiAssumptions> {
  const response = await fetch(`${apiBaseUrl}/api/v1/roi/assumptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assumptions),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to save ROI assumptions');
  }

  return response.json();
}

