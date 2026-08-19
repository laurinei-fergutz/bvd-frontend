import type { ProcessGraphEdge, ProcessGraphNode, ProcessGraphResponse } from '../services/api';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 56;
const LAYER_GAP_X = 220;
const NODE_GAP_Y = 90;
const PADDING = 40;

type LayoutNode = ProcessGraphNode & { x: number; y: number; layer: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Assigns each node a column (layer) via BFS distance from the start node, so the
 * graph reads left-to-right. Nodes unreachable from start (e.g. disconnected
 * activities) fall back to the layer right after the deepest known one, so nothing
 * is dropped from the drawing.
 */
function layoutGraph(graph: ProcessGraphResponse): { nodes: LayoutNode[]; width: number; height: number } {
  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    outgoing.get(edge.source)!.push(edge.target);
  }

  const startId = graph.nodes.find((n) => n.type === 'start')?.id ?? graph.nodes[0]?.id;
  const layerById = new Map<string, number>();

  if (startId) {
    const queue: string[] = [startId];
    layerById.set(startId, 0);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentLayer = layerById.get(current)!;
      for (const next of outgoing.get(current) ?? []) {
        if (!layerById.has(next)) {
          layerById.set(next, currentLayer + 1);
          queue.push(next);
        }
      }
    }
  }

  const fallbackLayer = Math.max(0, ...Array.from(layerById.values())) + 1;
  for (const node of graph.nodes) {
    if (!layerById.has(node.id)) {
      layerById.set(node.id, fallbackLayer);
    }
  }

  const nodesByLayer = new Map<number, ProcessGraphNode[]>();
  for (const node of graph.nodes) {
    const layer = layerById.get(node.id)!;
    if (!nodesByLayer.has(layer)) nodesByLayer.set(layer, []);
    nodesByLayer.get(layer)!.push(node);
  }

  const layers = Array.from(nodesByLayer.keys()).sort((a, b) => a - b);
  const maxNodesInLayer = Math.max(1, ...Array.from(nodesByLayer.values(), (n) => n.length));

  const layoutNodes: LayoutNode[] = [];
  for (const layer of layers) {
    const nodesInLayer = nodesByLayer.get(layer)!;
    const totalHeight = maxNodesInLayer * NODE_GAP_Y;
    const offsetY = (totalHeight - nodesInLayer.length * NODE_GAP_Y) / 2;
    nodesInLayer.forEach((node, idx) => {
      layoutNodes.push({
        ...node,
        layer,
        x: PADDING + layer * LAYER_GAP_X,
        y: PADDING + offsetY + idx * NODE_GAP_Y,
      });
    });
  }

  return {
    nodes: layoutNodes,
    width: PADDING * 2 + NODE_WIDTH + (layers.length - 1) * LAYER_GAP_X,
    height: PADDING * 2 + maxNodesInLayer * NODE_GAP_Y,
  };
}

const NODE_COLORS: Record<ProcessGraphNode['type'], { fill: string; stroke: string }> = {
  start: { fill: '#064e3b', stroke: '#10b981' },
  end: { fill: '#7f1d1d', stroke: '#ef4444' },
  activity: { fill: '#1f2937', stroke: '#3b82f6' },
};

function edgeControlPoints(source: LayoutNode, target: LayoutNode): [number, number][] {
  const startX = source.x + NODE_WIDTH;
  const startY = source.y + NODE_HEIGHT / 2;
  const endX = target.x;
  const endY = target.y + NODE_HEIGHT / 2;

  if (target.layer <= source.layer) {
    // Backward / self edge (a rework loop): arc below the nodes instead of
    // cutting straight through the boxes in between.
    return [
      [startX, startY],
      [startX + 70, startY + 70],
      [endX - 70, endY + 70],
      [endX, endY],
    ];
  }

  const midX = (startX + endX) / 2;
  return [
    [startX, startY],
    [midX, startY],
    [midX, endY],
    [endX, endY],
  ];
}

function edgePath(source: LayoutNode, target: LayoutNode): string {
  const [p0, p1, p2, p3] = edgeControlPoints(source, target);
  return `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`;
}

/** Point at t=0.5 along the cubic bezier used by edgePath, for label placement. */
function edgeMidpoint(source: LayoutNode, target: LayoutNode): { x: number; y: number } {
  const [p0, p1, p2, p3] = edgeControlPoints(source, target);
  const x = 0.125 * p0[0] + 0.375 * p1[0] + 0.375 * p2[0] + 0.125 * p3[0];
  const y = 0.125 * p0[1] + 0.375 * p1[1] + 0.375 * p2[1] + 0.125 * p3[1];
  return { x, y };
}

function formatDuration(seconds: number): string {
  if (seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.round(seconds)}s`;

  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}min`;

  const hours = minutes / 60;
  if (hours < 24) return `${trimDecimal(hours)}h`;

  const days = hours / 24;
  return `${trimDecimal(days)}d`;
}

function trimDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

export default function ProcessGraph({ graph }: { graph: ProcessGraphResponse }) {
  if (graph.nodes.length === 0) return null;

  const { nodes, width, height } = layoutGraph(graph);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const maxEdgeCount = Math.max(1, ...graph.edges.map((e) => e.count));

  return (
    <svg width={width} height={height} style={{ background: '#0b1220', borderRadius: '8px', display: 'block' }}>
      <defs>
        <marker id="process-graph-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
        </marker>
      </defs>

      {graph.edges.map((edge: ProcessGraphEdge, idx) => {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);
        if (!source || !target) return null;

        const strokeWidth = clamp(1 + (edge.count / maxEdgeCount) * 4, 1, 5);
        const mid = edgeMidpoint(source, target);

        return (
          <g key={`${edge.source}->${edge.target}-${idx}`}>
            <path
              d={edgePath(source, target)}
              fill="none"
              stroke="#64748b"
              strokeWidth={strokeWidth}
              opacity={0.8}
              markerEnd="url(#process-graph-arrow)"
            />
            {edge.avg_duration_seconds != null && (
              <text
                x={mid.x}
                y={mid.y}
                textAnchor="middle"
                fill="#facc15"
                fontSize={11}
                fontWeight={600}
                paintOrder="stroke"
                stroke="#0b1220"
                strokeWidth={4}
              >
                {formatDuration(edge.avg_duration_seconds)}
              </text>
            )}
          </g>
        );
      })}

      {nodes.map((node) => {
        const colors = NODE_COLORS[node.type];
        return (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx={10} fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5} />
            <text x={NODE_WIDTH / 2} y={NODE_HEIGHT / 2 - 4} textAnchor="middle" fill="#e5e7eb" fontSize={13} fontWeight={600}>
              {node.label.length > 20 ? `${node.label.slice(0, 18)}…` : node.label}
            </text>
            <text x={NODE_WIDTH / 2} y={NODE_HEIGHT / 2 + 14} textAnchor="middle" fill="#9ca3af" fontSize={11}>
              {node.count} {node.count === 1 ? 'ocorrência' : 'ocorrências'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
