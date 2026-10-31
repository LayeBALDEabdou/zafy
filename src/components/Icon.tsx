import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Tracés repris à l'identique des SVG de la maquette (style Lucide, viewBox 24).
const shapes = {
  back: <Path d="M15 6l-6 6 6 6" />,
  chevronRight: <Path d="M9 6l6 6-6 6" />,
  plus: (
    <>
      <Path d="M12 5v14" />
      <Path d="M5 12h14" />
    </>
  ),
  send: (
    <>
      <Path d="M7 17L17 7" />
      <Path d="M8 7h9v9" />
    </>
  ),
  receive: (
    <>
      <Path d="M17 7L7 17" />
      <Path d="M16 17H7V8" />
    </>
  ),
  shieldCheck: (
    <>
      <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <Path d="M9 12l2 2 4-4" />
    </>
  ),
  shield: <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  calendar: (
    <>
      <Rect x="4" y="5" width="16" height="15" rx="2" />
      <Path d="M4 10h16" />
      <Path d="M9 3v4" />
      <Path d="M15 3v4" />
    </>
  ),
  clock: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  pencil: (
    <>
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  home: <Path d="M3 11l9-7 9 7v9H3z" />,
  bell: (
    <>
      <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <Path d="M10 21h4" />
    </>
  ),
  user: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  check: <Path d="M5 12l5 5 9-10" />,
  bolt: <Path d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  lock: (
    <>
      <Rect x="5" y="11" width="14" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  fingerprint: (
    <>
      <Path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <Path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <Path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <Path d="M2 12a10 10 0 0 1 18-6" />
      <Path d="M2 16h.01" />
      <Path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <Path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <Path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <Path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    </>
  ),
  backspace: (
    <>
      <Path d="M21 5H9l-6 7 6 7h12z" />
      <Path d="M14 10l4 4" />
      <Path d="M18 10l-4 4" />
    </>
  ),
  scan: (
    <>
      <Path d="M4 8V5a1 1 0 0 1 1-1h3" />
      <Path d="M16 4h3a1 1 0 0 1 1 1v3" />
      <Path d="M20 16v3a1 1 0 0 1-1 1h-3" />
      <Path d="M8 20H5a1 1 0 0 1-1-1v-3" />
    </>
  ),
  phone: (
    <>
      <Rect x="6" y="2" width="12" height="20" rx="3" />
      <Path d="M11 18h2" />
    </>
  ),
  flask: (
    <>
      <Path d="M9 3h6" />
      <Path d="M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L14 9V3" />
    </>
  ),
  alert: (
    <>
      <Path d="M12 8v5" />
      <Path d="M12 17h.01" />
    </>
  ),
  globe: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M3 12h18" />
      <Path d="M12 3c3 3 3 15 0 18" />
      <Path d="M12 3c-3 3-3 15 0 18" />
    </>
  ),
  key: (
    <>
      <Circle cx="8" cy="15" r="4" />
      <Path d="M11 12l9-9" />
      <Path d="M17 6l3 3" />
    </>
  ),
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-3.5-3.5" />
    </>
  ),
  close: (
    <>
      <Path d="M18 6L6 18" />
      <Path d="M6 6l12 12" />
    </>
  ),
  copy: (
    <>
      <Rect x="9" y="9" width="11" height="11" rx="2" />
      <Path d="M5 15V5a1 1 0 0 1 1-1h10" />
    </>
  ),
};

export type IconName = keyof typeof shapes;

type Props = {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  fill?: string;
};

export function Icon({ name, size = 20, color, strokeWidth = 2, fill = 'none' }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round">
      {shapes[name]}
    </Svg>
  );
}
