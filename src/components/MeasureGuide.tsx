import React from 'react';
import Svg, { Path, Ellipse, G } from 'react-native-svg';
import { Theme } from '../theme';
import { BodyPart } from '../data';

type Pt = [number, number];

// Left half of a front-facing figure in a 200×324 box, from the neck down the
// arm and leg to the crotch. Mirrored about x=100 to get the full outline.
const LEFT_HALF: Pt[] = [
  [91, 46], [90, 66], [76, 71], [58, 76], [50, 88], [47, 104], [43, 128], [40, 150],
  [36, 176], [33, 206], [31, 222], [36, 232], [43, 224], [45, 206], [51, 178], [56, 152],
  [62, 126], [67, 106], [70, 130], [73, 158], [70, 186], [70, 212], [74, 250], [72, 272],
  [78, 302], [74, 314], [94, 316], [93, 302], [92, 272], [94, 250], [97, 212], [100, 204],
];

/** Closed Catmull-Rom spline through `pts`, as cubic Béziers. */
function smoothClosed(pts: Pt[]): string {
  const n = pts.length;
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + ' Z';
}

const BODY_PATH = smoothClosed([
  ...LEFT_HALF,
  ...LEFT_HALF.slice(0, -1).reverse().map(([x, y]): Pt => [200 - x, y]),
]);

/** Where the tape goes for each part: centre and horizontal radius of the loop. */
const BANDS: Record<BodyPart, { cx: number; cy: number; rx: number }> = {
  neck: { cx: 100, cy: 61, rx: 11 },
  shoulders: { cx: 100, cy: 88, rx: 50 },
  chest: { cx: 100, cy: 103, rx: 34 },
  biceps: { cx: 55, cy: 116, rx: 10 },
  forearms: { cx: 44.5, cy: 172, rx: 9 },
  waist: { cx: 100, cy: 156, rx: 28.5 },
  hips: { cx: 100, cy: 188, rx: 31.5 },
  thighs: { cx: 84, cy: 222, rx: 14.5 },
  calves: { cx: 82, cy: 272, rx: 11 },
};

interface MeasureGuideProps {
  part: BodyPart;
  t: Theme;
  height?: number;
}

/** Body silhouette with a tape loop drawn where `part` is measured; other spots shown faintly. */
export function MeasureGuide({ part, t, height = 170 }: MeasureGuideProps) {
  const width = (height * 200) / 324;
  const parts = Object.keys(BANDS) as BodyPart[];
  const active = BANDS[part];
  return (
    <Svg width={width} height={height} viewBox="0 0 200 324">
      <Path d={BODY_PATH} fill={t.elev2} stroke={t.mut2} strokeWidth={1.2} strokeLinejoin="round" />
      <Ellipse cx={100} cy={32} rx={18} ry={21} fill={t.elev2} stroke={t.mut2} strokeWidth={1.2} />
      {parts.filter(p => p !== part).map(p => {
        const b = BANDS[p];
        return (
          <Ellipse key={p} cx={b.cx} cy={b.cy} rx={b.rx} ry={3.2}
            fill="none" stroke={t.mut2} strokeWidth={1.4} strokeDasharray="3 3" />
        );
      })}
      <G>
        <Ellipse cx={active.cx} cy={active.cy} rx={active.rx + 1.5} ry={5}
          fill="none" stroke={t.orange} strokeOpacity={0.3} strokeWidth={8} />
        <Ellipse cx={active.cx} cy={active.cy} rx={active.rx + 1.5} ry={5}
          fill="none" stroke={t.orange} strokeWidth={3} />
      </G>
    </Svg>
  );
}
