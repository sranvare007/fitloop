import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Text as SvgText, Rect, G } from 'react-native-svg';
import { Theme } from '../theme';
import { AppText as Text } from './Shared';

export interface ChartPoint { x: number; y: number; label: string }

interface LineChartProps {
  series: ChartPoint[];
  color: string;
  unit?: string;
  active: number | null;
  setActive?: (i: number | null) => void;
  height?: number;
  width?: number;
  t: Theme;
}

const DEFAULT_W = Dimensions.get('window').width - 36;

export function LineChart({ series, color, unit, active, setActive, height = 190, t, width = DEFAULT_W }: LineChartProps) {
  const H = height, W = width, padX = 14, padT = 22, padB = 26;
  if (!series || series.length === 0) {
    return <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.mut2, fontWeight: '600', fontSize: 14 }}>No data in range</Text></View>;
  }
  const xs = series.map((p) => p.x), ys = series.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = (maxY - minY) * 0.25 || maxY * 0.1 || 1; minY -= pad; maxY += pad;
  const sx = (x: number) => padX + (maxX === minX ? 0.5 : (x - minX) / (maxX - minX)) * (W - padX * 2);
  const sy = (y: number) => padT + (1 - (y - minY) / (maxY - minY)) * (H - padT - padB);
  const pts = series.map((p) => [sx(p.x), sy(p.y)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length-1][0].toFixed(1)} ${H-padB} L${pts[0][0].toFixed(1)} ${H-padB} Z`;
  const gid = `g${color.replace('#', '')}${H}`;
  const ap = active != null ? pts[active] : null;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.28" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {[0,1,2,3].map(i => {
        const y = padT + i * (H - padT - padB) / 3;
        return <Line key={i} x1={padX} y1={y} x2={W-padX} y2={y} stroke={t.line2} strokeWidth="1" />;
      })}
      <Path d={area} fill={`url(#${gid})`} />
      <Path d={line} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {ap && <Line x1={ap[0]} y1={padT} x2={ap[0]} y2={H-padB} stroke={color} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.5" />}
      {pts.map((p, i) => (
        <G key={i}>
          {(i === pts.length - 1 || active === i) && <Circle cx={p[0]} cy={p[1]} r={active === i ? 6 : 4.5} fill={color} stroke={t.bg} strokeWidth="2.5" />}
          <Circle cx={p[0]} cy={p[1]} r="16" fill="transparent" onPress={() => setActive && setActive(active === i ? null : i)} />
        </G>
      ))}
      {ap && (() => {
        const tx = Math.max(40, Math.min(W - 40, ap[0]));
        const above = ap[1] > 54;
        const ty = above ? ap[1] - 16 : ap[1] + 16;
        return (
          <G>
            <Rect x={tx - 38} y={above ? ty - 34 : ty} width="76" height="34" rx="9" fill={t.text} />
            <SvgText x={tx} y={above ? ty - 18 : ty + 16} textAnchor="middle" fontWeight="800" fontSize="14" fill={t.bg}>
              {series[active!].y}{unit ? ' ' + unit : ''}
            </SvgText>
            <SvgText x={tx} y={above ? ty - 5 : ty + 28} textAnchor="middle" fontWeight="600" fontSize="9.5" fill={t.name === 'dark' ? '#888' : '#aaa'}>
              {series[active!].label}
            </SvgText>
          </G>
        );
      })()}
    </Svg>
  );
}
