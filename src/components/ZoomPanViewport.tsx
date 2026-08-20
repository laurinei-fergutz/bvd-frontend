import { useRef, useState } from 'react';

import { IconRotateCcw, IconZoomIn, IconZoomOut } from './Icons';

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const controlButtonStyle: React.CSSProperties = {
  background: '#1f2937',
  color: '#e5e7eb',
  border: '1px solid #374151',
  borderRadius: '6px',
  padding: '0.35rem 0.6rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
};

type Props = {
  children: React.ReactNode;
  height?: number;
};

/**
 * Pans and zooms its children via a CSS transform on a wrapper div - the
 * children (e.g. the process graph's own <svg>) are rendered at their
 * natural, untransformed size, so anything that reads that DOM node
 * directly (like exporting it to PNG/JPG) is unaffected by the current
 * zoom/pan state.
 */
export default function ZoomPanViewport({ children, height = 560 }: Props) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);

  const zoomBy = (factor: number) => setScale((s) => clamp(s * factor, MIN_SCALE, MAX_SCALE));

  const reset = () => {
    setScale(1);
    setTranslate({ x: 16, y: 16 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.1 : 0.9);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY, origX: translate.x, origY: translate.y };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return;
    setTranslate({
      x: dragStart.current.origX + (e.clientX - dragStart.current.x),
      y: dragStart.current.origY + (e.clientY - dragStart.current.y),
    });
  };

  const stopDragging = () => {
    dragStart.current = null;
    setIsDragging(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <button type="button" style={controlButtonStyle} onClick={() => zoomBy(1.2)} title="Aumentar zoom">
          <IconZoomIn size={15} />
        </button>
        <button type="button" style={controlButtonStyle} onClick={() => zoomBy(1 / 1.2)} title="Diminuir zoom">
          <IconZoomOut size={15} />
        </button>
        <button type="button" style={controlButtonStyle} onClick={reset}>
          <IconRotateCcw size={15} /> Resetar
        </button>
        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Arraste para mover · scroll para zoom</span>
      </div>

      <div
        style={{
          height,
          overflow: 'hidden',
          border: '1px solid #374151',
          borderRadius: '8px',
          background: '#0b1220',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: 'fit-content',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
