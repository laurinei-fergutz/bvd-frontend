import { formatDuration } from '../components/ProcessGraph';
import type { ProcessGraphResponse } from '../services/api';

function triggerDownload(href: string, filename: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  // Give the browser a moment to actually start reading the blob before we revoke it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(data: unknown, filename: string): void {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
}

export function downloadTextFile(content: string, filename: string, mimeType = 'text/plain;charset=utf-8'): void {
  downloadBlob(new Blob([content], { type: mimeType }), filename);
}

/**
 * Renders an inline SVG element to a PNG/JPEG and triggers a download.
 * Self-contained SVGs (no external image/font references, which is the case
 * here) can be rasterized via <img> + <canvas> without tainting the canvas,
 * so this needs no extra dependency.
 */
export async function downloadSvgAsImage(
  svg: SVGSVGElement,
  format: 'png' | 'jpeg',
  filename: string,
  backgroundColor: string,
  scale = 2,
): Promise<void> {
  const width = Number(svg.getAttribute('width')) || svg.clientWidth;
  const height = Number(svg.getAttribute('height')) || svg.clientHeight;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgUrl = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }));

  try {
    const image = await loadImage(svgUrl);

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível criar o contexto de desenho para exportar a imagem');

    if (format === 'jpeg') {
      // JPEG has no alpha channel - paint the graph's own background first.
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mimeType, format === 'jpeg' ? 0.92 : undefined);
    triggerDownload(dataUrl, filename);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar a imagem do grafo para exportação'));
    img.src = src;
  });
}

/**
 * Structured-text representation of the process graph, as a Mermaid
 * flowchart definition - human-readable and renderable in any Mermaid-
 * compatible tool (Mermaid Live Editor, GitHub/Notion markdown, etc.).
 */
export function graphToMermaidText(graph: ProcessGraphResponse): string {
  const idByOriginal = new Map<string, string>();
  graph.nodes.forEach((node, index) => idByOriginal.set(node.id, `n${index}`));

  const lines: string[] = ['flowchart LR'];

  for (const node of graph.nodes) {
    const id = idByOriginal.get(node.id)!;
    const label = `${node.label} (${node.count})`.replace(/"/g, "'");
    lines.push(node.type === 'activity' ? `    ${id}["${label}"]` : `    ${id}(["${label}"])`);
  }

  for (const edge of graph.edges) {
    const source = idByOriginal.get(edge.source);
    const target = idByOriginal.get(edge.target);
    if (!source || !target) continue;

    const label = edge.avg_duration_seconds != null ? formatDuration(edge.avg_duration_seconds) : `${edge.count}x`;
    lines.push(`    ${source} -->|${label}| ${target}`);
  }

  return lines.join('\n');
}
