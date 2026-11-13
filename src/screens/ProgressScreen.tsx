import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useApp } from '../context';
import { Segmented, Switch, Sheet, Btn, AppTextInput, AppText as Text } from '../components/Shared';
import { Icon } from '../components/Icon';
import { PhysiqueTimeline } from '../components/PhysiqueTimeline';
import { LineChart, ChartPoint } from '../components/LineChart';
import { BodyMeasurements } from '../components/BodyMeasurements';
import { DAY_MS } from '../data';

const RANGES = [{ k: '1M', d: 30 }, { k: '3M', d: 92 }, { k: '6M', d: 183 }, { k: '1Y', d: 365 }, { k: 'All', d: 99999 }];

export function ProgressScreen() {
  const { t, fmt, loadStrengthData, loadBodyData, loadExerciseNames, loadSetBests, personalRecords, pbFor, savePR } = useApp();
  const [tab, setTab] = useState('strength');
  const [range, setRange] = useState('3M');
  const [exercise, setExercise] = useState('Bench Press');
  const [pick, setPick] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [showBf, setShowBf] = useState(true);

  // Personal-record editor (one row per set)
  const [prOpen, setPrOpen] = useState(false);
  const [prSets, setPrSets] = useState<{ reps: string; w: string }[]>([]);
  const pb = pbFor(exercise);

  const openPrEditor = async () => {
    const saved = personalRecords[exercise];
    let rows: { reps: string; w: string }[];
    if (saved?.length) {
      rows = saved.map(s => ({ reps: String(s.reps), w: String(fmt.w(s.kg)) }));
    } else {
      const computed = (await loadSetBests([exercise]))[exercise];
      if (computed?.length) rows = computed.map(s => ({ reps: String(s.reps), w: String(fmt.w(s.kg)) }));
      else if (pb) rows = [{ reps: String(pb[1]), w: String(fmt.w(pb[0])) }];
      else rows = [{ reps: '', w: '' }];
    }
    setPrSets(rows);
    setPrOpen(true);
  };
  const setPrField = (i: number, key: 'reps' | 'w', val: string) =>
    setPrSets(prev => prev.map((s, j) => j === i ? { ...s, [key]: val } : s));
  const addPrSet = () => setPrSets(prev => [...prev, { reps: '', w: '' }]);
  const removePrSet = (i: number) => setPrSets(prev => prev.filter((_, j) => j !== i));
  const savePrEditor = () => {
    const sets = prSets
      .map(s => ({ reps: parseInt(s.reps, 10), w: parseFloat(s.w) }))
      .filter(s => s.reps > 0 && s.w > 0);
    if (!sets.length) return;
    savePR(exercise, sets);
    setPrOpen(false);
  };

  const [strengthSeries, setStrengthSeries] = useState<ChartPoint[]>([]);
  const [wSeries, setWSeries] = useState<ChartPoint[]>([]);
  const [bfSeries, setBfSeries] = useState<ChartPoint[]>([]);
  const [allExercises, setAllExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const rangeDays = RANGES.find(r => r.k === range)!.d;
  const cutoff = useMemo(() => Date.now() - rangeDays * DAY_MS, [rangeDays]);

  // Load exercise names once
  useEffect(() => {
    loadExerciseNames().then(names => setAllExercises(names.length ? names : ['Bench Press']));
  }, []);

  // Reload chart data when tab/range/exercise changes
  useEffect(() => {
    setActive(null);
    if (tab === 'strength') {
      setLoading(true);
      loadStrengthData(exercise, cutoff).then(data => {
        setStrengthSeries(data); setLoading(false);
      });
    } else if (tab === 'body') {
      setLoading(true);
      loadBodyData(cutoff).then(({ wSeries: ws, bfSeries: bfs }) => {
        setWSeries(ws); setBfSeries(bfs); setLoading(false);
      });
    }
  }, [tab, range, exercise, fmt.unit]);

  const delta = (s: ChartPoint[]) => s.length >= 2 ? +(s[s.length-1].y - s[0].y).toFixed(1) : 0;

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
      <Segmented t={t} options={[{ value: 'strength', label: 'Strength' }, { value: 'body', label: 'Body' }, { value: 'sizes', label: 'Sizes' }, { value: 'physique', label: 'Physique' }]} value={tab} onChange={v => { setTab(v); setActive(null); }} style={{ marginBottom: 18 }} />

      {tab === 'physique' ? (
        <PhysiqueTimeline />
      ) : tab === 'sizes' ? (
        <BodyMeasurements cutoff={cutoff} rangeControl={<RangeChips />} />
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

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: t.line2, marginTop: 14 }}>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: t.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="star" size={16} color={t.limeInk} sw={0} fill="solid" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.4 }}>PERSONAL RECORD</Text>
              <Text style={{ fontSize: 16.5, fontWeight: '800', color: t.text }}>
                {pb ? `${fmt.w(pb[0])} ${fmt.wlabel} × ${pb[1]}` : 'Not set'}
                {personalRecords[exercise]?.length > 1 && (
                  <Text style={{ fontSize: 13, fontWeight: '600', color: t.mut }}>  ·  {personalRecords[exercise].length} sets</Text>
                )}
              </Text>
            </View>
            <Btn t={t} variant="soft" size="sm" icon="pencil" onPress={openPrEditor}>Edit</Btn>
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
        {allExercises.map(e => (
          <Pressable key={e} onPress={() => { setExercise(e); setPick(false); setActive(null); }}
            accessibilityRole="button" accessibilityLabel={`Show progress for ${e}`}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 13, marginBottom: 4, backgroundColor: e === exercise ? t.limeSoft : t.surface2 }}>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: t.text }}>{e}</Text>
            {e === exercise && <Icon name="check" size={18} color={t.limeInk} sw={2.6} />}
          </Pressable>
        ))}
      </Sheet>

      <Sheet open={prOpen} onClose={() => setPrOpen(false)} t={t} title={`Personal record — ${exercise}`}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 4, marginBottom: 8 }}>
          <View style={{ width: 30 }} />
          <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.4, textAlign: 'center' }}>REPS</Text>
          <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.4, textAlign: 'center' }}>{fmt.wlabel.toUpperCase()}</Text>
          <View style={{ width: 34 }} />
        </View>
        {prSets.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: t.mut }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 6 }}>
              <AppTextInput
                value={s.reps}
                onChangeText={v => setPrField(i, 'reps', v)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={t.mut2}
                style={{ fontSize: 18, fontWeight: '800', color: t.text, backgroundColor: t.elev, borderRadius: 12, paddingVertical: 12, textAlign: 'center' }}
              />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 6 }}>
              <AppTextInput
                value={s.w}
                onChangeText={v => setPrField(i, 'w', v)}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={t.mut2}
                style={{ fontSize: 18, fontWeight: '800', color: t.text, backgroundColor: t.elev, borderRadius: 12, paddingVertical: 12, textAlign: 'center' }}
              />
            </View>
            <Pressable
              onPress={() => removePrSet(i)}
              accessibilityRole="button"
              accessibilityLabel={`Remove set ${i + 1}`}
              style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="trash" size={17} color={t.danger} sw={1.9} />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={addPrSet}
          accessibilityRole="button"
          accessibilityLabel="Add set"
          style={({ pressed }) => [{ marginTop: 4, marginBottom: 16, padding: 12, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="plus" size={16} color={t.orange} sw={2.6} />
          <Text style={{ fontSize: 14.5, fontWeight: '800', color: t.text }}>Add set</Text>
        </Pressable>
        <Btn t={t} variant="primary" full onPress={savePrEditor}>Save PR</Btn>
      </Sheet>
    </ScrollView>
  );
}
