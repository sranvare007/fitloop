import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Text as SvgText, Rect, G } from 'react-native-svg';
import { useApp } from '../context';
import { Segmented, Switch, Sheet, AppText as Text } from '../components/Shared';
import { Icon } from '../components/Icon';
import { PhysiqueTimeline } from '../components/PhysiqueTimeline';
import { DAY_MS } from '../data';

const W = Dimensions.get('window').width - 36;

interface DataPoint { x: number; y: number; label: string }

function LineChart({ series, color, unit, active, setActive, height = 190, t }: any) {
  const H = height, padX = 14, padT = 22, padB = 26;
  if (!series || series.length === 0) {
    return <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.mut2, fontWeight: '600', fontSize: 14 }}>No data in range</Text></View>;
  }
  const xs = series.map((p: DataPoint) => p.x), ys = series.map((p: DataPoint) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = (maxY - minY) * 0.25 || maxY * 0.1 || 1; minY -= pad; maxY += pad;
  const sx = (x: number) => padX + (maxX === minX ? 0.5 : (x - minX) / (maxX - minX)) * (W - padX * 2);
  const sy = (y: number) => padT + (1 - (y - minY) / (maxY - minY)) * (H - padT - padB);
  const pts = series.map((p: DataPoint) => [sx(p.x), sy(p.y)]);
  const line = pts.map((p: number[], i: number) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
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
      {pts.map((p: number[], i: number) => (
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
              {series[active].y}{unit ? ' ' + unit : ''}
            </SvgText>
            <SvgText x={tx} y={above ? ty - 5 : ty + 28} textAnchor="middle" fontWeight="600" fontSize="9.5" fill={t.name === 'dark' ? '#888' : '#aaa'}>
              {series[active].label}
            </SvgText>
          </G>
        );
      })()}
    </Svg>
  );
}

const RANGES = [{ k: '1M', d: 30 }, { k: '3M', d: 92 }, { k: '6M', d: 183 }, { k: '1Y', d: 365 }, { k: 'All', d: 99999 }];

export function ProgressScreen() {
  const { t, fmt, loadStrengthData, loadBodyData, loadExerciseNames } = useApp();
  const [tab, setTab] = useState('strength');
  const [range, setRange] = useState('3M');
  const [exercise, setExercise] = useState('Bench Press');
  const [pick, setPick] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [showBf, setShowBf] = useState(true);

  const [strengthSeries, setStrengthSeries] = useState<DataPoint[]>([]);
  const [wSeries, setWSeries] = useState<DataPoint[]>([]);
  const [bfSeries, setBfSeries] = useState<DataPoint[]>([]);
  const [allExercises, setAllExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const rangeDays = RANGES.find(r => r.k === range)!.d;
  const cutoff = Date.now() - rangeDays * DAY_MS;

  // Load exercise names once
  useEffect(() => {
    loadExerciseNames().then(names => setAllExercises(names.length ? names : ['Bench Press']));
  }, []);

  // Reload chart data when tab/range/exercise changes
  useEffect(() => {
    setActive(null);
    setLoading(true);
    if (tab === 'strength') {
      loadStrengthData(exercise, cutoff).then(data => {
        setStrengthSeries(data); setLoading(false);
      });
    } else {
      loadBodyData(cutoff).then(({ wSeries: ws, bfSeries: bfs }) => {
        setWSeries(ws); setBfSeries(bfs); setLoading(false);
      });
    }
  }, [tab, range, exercise, fmt.unit]);

  const delta = (s: DataPoint[]) => s.length >= 2 ? +(s[s.length-1].y - s[0].y).toFixed(1) : 0;

  const DeltaChip = ({ v, unit: u, invert }: any) => {
    const good = invert ? v <= 0 : v >= 0;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 9, backgroundColor: good ? t.limeSoft : 'rgba(255,84,112,0.14)' }}>
        <Icon name="trend" size={13} color={good ? t.limeInk : t.danger} sw={2.4} />
        <Text style={{ fontSize: 13, fontWeight: '800', color: good ? t.limeInk : t.danger }}>{v > 0 ? '+' : ''}{v} {u}</Text>
      </View>
    );
  };

  const RangeChips = () => (
    <View style={{ flexDirection: 'row', gap: 7, marginTop: 14 }}>
      {RANGES.map(r => (
        <Pressable key={r.k} onPress={() => setRange(r.k)} style={{ flex: 1, paddingVertical: 10, borderRadius: 11, backgroundColor: range === r.k ? t.text : t.surface, borderWidth: range === r.k ? 0 : 1, borderColor: t.line2, alignItems: 'center' }}>
          <Text style={{ fontWeight: '800', fontSize: 13, color: range === r.k ? t.bg : t.mut }}>{r.k}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 30, fontWeight: '800', color: t.text, letterSpacing: -0.6, marginBottom: 16 }}>Progress</Text>
      <Segmented t={t} options={[{ value: 'strength', label: 'Strength' }, { value: 'body', label: 'Body' }, { value: 'physique', label: 'Physique' }]} value={tab} onChange={v => { setTab(v); setActive(null); }} style={{ marginBottom: 18 }} />

      {tab === 'physique' ? (
        <PhysiqueTimeline />
      ) : tab === 'strength' ? (
        <>
          <Pressable onPress={() => setPick(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line2, borderRadius: 16, padding: 14, marginBottom: 14 }}>
            <Icon name="search" size={18} color={t.mut} sw={2} />
            <Text style={{ flex: 1, fontSize: 16.5, fontWeight: '800', color: t.text }}>{exercise}</Text>
            <Icon name="chevD" size={18} color={t.mut} sw={2.2} />
          </Pressable>
          <View style={{ backgroundColor: t.surface, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: t.line2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.4 }}>CURRENT MAX</Text>
                <Text style={{ fontSize: 30, fontWeight: '800', color: t.text }}>
                  {strengthSeries.length ? strengthSeries[strengthSeries.length-1].y : '—'}
                  <Text style={{ fontSize: 14, color: t.mut, fontWeight: '600' }}> {fmt.wlabel}</Text>
                </Text>
              </View>
              {strengthSeries.length >= 2 && <DeltaChip v={delta(strengthSeries)} unit={fmt.wlabel} />}
            </View>
            {loading ? <ActivityIndicator color={t.orange} style={{ height: 190 }} /> : <LineChart series={strengthSeries} t={t} color={t.orange} unit={fmt.wlabel} active={active} setActive={setActive} />}
          </View>
          <RangeChips />
          {!loading && strengthSeries.length < 2 && (
            <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center', marginTop: 14, padding: 12, backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.line2 }}>
              <Icon name="info" size={17} color={t.mut} sw={2} />
              <Text style={{ fontSize: 13, color: t.mut, fontWeight: '600', flex: 1 }}>Log this lift across more sessions to see a trend.</Text>
            </View>
          )}
        </>
      ) : (
        <>
          <View style={{ backgroundColor: t.surface, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: t.line2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.4 }}>BODY WEIGHT</Text>
                <Text style={{ fontSize: 30, fontWeight: '800', color: t.text }}>
                  {wSeries.length ? wSeries[wSeries.length-1].y : '—'}
                  <Text style={{ fontSize: 14, color: t.mut, fontWeight: '600' }}> {fmt.wlabel}</Text>
                </Text>
              </View>
              {wSeries.length >= 2 && <DeltaChip v={delta(wSeries)} unit={fmt.wlabel} invert />}
            </View>
            {loading ? <ActivityIndicator color={t.orange} style={{ height: 190 }} /> : <LineChart series={wSeries} t={t} color={t.orange} unit={fmt.wlabel} active={active} setActive={setActive} />}
          </View>

          <View style={{ height: 12 }} />
          <View style={{ backgroundColor: t.surface, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: t.line2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: showBf ? 6 : 0 }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.4 }}>BODY FAT</Text>
                {showBf && <Text style={{ fontSize: 30, fontWeight: '800', color: t.text }}>
                  {bfSeries.length ? bfSeries[bfSeries.length-1].y : '—'}
                  <Text style={{ fontSize: 14, color: t.mut, fontWeight: '600' }}>%</Text>
                </Text>}
              </View>
              <Switch on={showBf} onChange={setShowBf} t={t} />
            </View>
            {showBf && (loading ? <ActivityIndicator color={t.limeInk} style={{ height: 150 }} /> : <LineChart series={bfSeries} t={t} color={t.limeInk} unit="%" active={null} setActive={() => {}} height={150} />)}
          </View>
          <RangeChips />
        </>
      )}

      <Sheet open={pick} onClose={() => setPick(false)} t={t} title="Choose exercise" height={500}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
          {allExercises.map(e => (
            <Pressable key={e} onPress={() => { setExercise(e); setPick(false); setActive(null); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 13, marginBottom: 4, backgroundColor: e === exercise ? t.limeSoft : t.surface2 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '700', color: t.text }}>{e}</Text>
              {e === exercise && <Icon name="check" size={18} color={t.limeInk} sw={2.6} />}
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </ScrollView>
  );
}
