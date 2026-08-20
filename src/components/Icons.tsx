/**
 * Minimal flat/line icon set - hand-rolled SVGs (stroke = currentColor) so
 * the app keeps its zero-icon-library convention while dropping emoji for a
 * consistent, monochrome, minimalist look.
 */
export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
};

function Svg({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
  style,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, verticalAlign: 'middle', ...style }}
    >
      {children}
    </svg>
  );
}

export function IconRocket(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5c2.2 2.1 3.4 5.3 3.4 8.5 0 2.4-.7 4.6-1.7 6.3l-1.7 1.7-1.7-1.7c-1-1.7-1.7-3.9-1.7-6.3 0-3.2 1.2-6.4 3.4-8.5z" />
      <circle cx="12" cy="10.5" r="1.4" />
      <path d="M9.3 15.5l-2.3.8.8-2.3" />
      <path d="M14.7 15.5l2.3.8-.8-2.3" />
    </Svg>
  );
}

export function IconFolder(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 6.5a1 1 0 011-1h4.5l1.5 2H20a1 1 0 011 1V18a1 1 0 01-1 1H4a1 1 0 01-1-1V6.5z" />
    </Svg>
  );
}

export function IconWorkflow(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5" cy="6" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M7 6.3h5a3 3 0 013 3v0" />
      <path d="M7 17.7h5a3 3 0 003-3v0" />
    </Svg>
  );
}

export function IconBot(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <circle cx="9" cy="13.5" r="1.2" fill={props.color ?? 'currentColor'} stroke="none" />
      <circle cx="15" cy="13.5" r="1.2" fill={props.color ?? 'currentColor'} stroke="none" />
      <path d="M12 8V5" />
      <circle cx="12" cy="3.5" r="1.2" />
      <path d="M2 12.5v3M22 12.5v3" />
    </Svg>
  );
}

export function IconBrain(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M7 9.5H3M7 14.5H3M21 9.5h-4M21 14.5h-4M9.5 7V3M14.5 7V3M9.5 21v-4M14.5 21v-4" />
    </Svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </Svg>
  );
}

export function IconXCircle(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </Svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.6 2.6L16 9.3" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12.5l4.5 4.5L20 6" />
    </Svg>
  );
}

export function IconDocument(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h8l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M14 3v4h4" />
      <path d="M8 12h8M8 16h8M8 8h3" />
    </Svg>
  );
}

export function IconCode(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
    </Svg>
  );
}

export function IconTarget(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="0.9" fill={props.color ?? 'currentColor'} stroke="none" />
    </Svg>
  );
}

export function IconTrendingUp(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 17l6-6 4 4 8-9" />
      <path d="M15 6h6v6" />
    </Svg>
  );
}

export function IconTrophy(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4h10v4a5 5 0 01-10 0V4z" />
      <path d="M7 5H4.5A2.5 2.5 0 007 7.5M17 5h2.5A2.5 2.5 0 0117 7.5" />
      <path d="M12 13v3" />
      <path d="M9 20h6" />
      <path d="M9.6 20a2.4 2.4 0 014.8 0" />
    </Svg>
  );
}

export function IconAlertTriangle(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4l9 15H3l9-15z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.7" fill={props.color ?? 'currentColor'} stroke="none" />
    </Svg>
  );
}

export function IconZoomIn(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.35-4.35" />
      <path d="M10.5 7.5v6M7.5 10.5h6" />
    </Svg>
  );
}

export function IconZoomOut(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.35-4.35" />
      <path d="M7.5 10.5h6" />
    </Svg>
  );
}

export function IconRotateCcw(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 12a8.5 8.5 0 108.5-8.5" />
      <path d="M3.5 4v5h5" />
    </Svg>
  );
}

export function IconSave(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 4h11l3 3v13a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
      <path d="M8 4v5h7V4" />
      <rect x="8" y="13" width="8" height="6" />
    </Svg>
  );
}

export function IconClipboard(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <rect x="9" y="2.5" width="6" height="3" rx="1" />
      <path d="M9 11h6M9 15h6" />
    </Svg>
  );
}

export function IconImage(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M3 17l5-5 4 4 3-3 6 6" />
    </Svg>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5h16l-6 8v6l-4-2v-4z" />
    </Svg>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
      <path d="M3 9l9 5 9-5" />
    </Svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
    </Svg>
  );
}

export function IconDollarSign(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2v20" />
      <path d="M17 6.5a4 4 0 00-4-2.5h-2a3.5 3.5 0 000 7h2a3.5 3.5 0 010 7h-2a4 4 0 01-4-2.5" />
    </Svg>
  );
}

export function IconSliders(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <circle cx="9" cy="6" r="2" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="15" cy="12" r="2" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="11" cy="18" r="2" />
    </Svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.9" fill={props.color ?? 'currentColor'} stroke="none" />
    </Svg>
  );
}

export function IconSpinner(props: IconProps) {
  const { size = 18, color = 'currentColor', strokeWidth = 1.8, style } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      style={{ flexShrink: 0, verticalAlign: 'middle', ...style }}
    >
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}
