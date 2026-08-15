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
};

export type ProcessGraphResponse = {
  nodes: ProcessGraphNode[];
  edges: ProcessGraphEdge[];
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

