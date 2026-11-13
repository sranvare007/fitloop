import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, Dimensions } from 'react-native';
import { useApp } from '../context';
import { BODY_PARTS, BodyLog, BodyPart } from '../data';
import { Btn, AppText as Text } from './Shared';
import { Icon } from './Icon';
import { LineChart, ChartPoint } from './LineChart';
import { MeasureGuide } from './MeasureGuide';
import { BodyLogSheet } from './BodyLogSheet';
import { BodyLogTable } from './BodyLogTable';

// Screen gutter (18 × 2) plus the chart card's own padding (14 × 2).
const CHART_W = Dimensions.get('window').width - 64;

const shortDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

interface BodyMeasurementsProps {
  /** Only logs at or after this time are charted and tabulated. */
  cutoff: number;
  /** Range picker rendered under the chart. */
  rangeControl: React.ReactNode;
}

export function BodyMeasurements({ cutoff, rangeControl }: BodyMeasurementsProps) {
  const { t, fmt, bodyLogs } = useApp();
  const [selected, setSelected] = useState<BodyPart>(
    () => BODY_PARTS.find(p => bodyLogs.some(l => l.values[p.key] != null))?.key ?? 'chest',
  );
  const [active, setActive] = useState<number | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; editing: BodyLog | null }>({ open: false, editing: null });

  useEffect(() => { setActive(null); }, [selected, cutoff, fmt.unit]);

  const inRange = useMemo(() => bodyLogs.filter(l => l.at >= cutoff), [bodyLogs, cutoff]);
  const hasData = useMemo(
    () => new Set(BODY_PARTS.filter(p => bodyLogs.some(l => l.values[p.key] != null)).map(p => p.key)),
    [bodyLogs],
  );

  const series: ChartPoint[] = useMemo(
    () => inRange
      .filter(l => l.values[selected] != null)
      .map(l => ({ x: l.at, y: fmt.l(l.values[selected]!), label: shortDate(l.at) })),
    [inRange, selected, fmt],
  );
  const latest = series.length ? series[series.length - 1].y : null;
  const delta = series.length >= 2 ? +(series[series.length - 1].y - series[0].y).toFixed(1) : null;
  const label = BODY_PARTS.find(p => p.key === selected)!.label;

  const openNew = () => setSheet({ open: true, editing: null });
  const openEdit = (log: BodyLog) => setSheet({ open: true, editing: log });
  const closeSheet = () => setSheet(s => ({ ...s, open: false }));

  const logSheet = (
    <BodyLogSheet open={sheet.open} editing={sheet.editing} initialPart={selected} onClose={closeSheet} />
  );

  if (!bodyLogs.length) {
    return (
      <>
        <View style={{ backgroundColor: t.surface, borderRadius: 22, borderWidth: 1, borderColor: t.line2, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <MeasureGuide part="chest" t={t} height={150} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 19, fontWeight: '800', color: t.text, letterSpacing: -0.3 }}>Track your sizes</Text>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: t.mut, lineHeight: 19, marginTop: 6, marginBottom: 14 }}>
              Log chest, arms, waist and more to see how your body changes over time.
            </Text>
            <Btn t={t} variant="primary" size="sm" icon="ruler" onPress={openNew}>Log measurements</Btn>
          </View>
        </View>
        {logSheet}
      </>
    );
  }

  const lastLog = bodyLogs[bodyLogs.length - 1];

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: t.line2, marginBottom: 14 }}>
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: t.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="ruler" size={17} color={t.limeInk} sw={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.4 }}>LAST MEASURED</Text>
          <Text style={{ fontSize: 16.5, fontWeight: '800', color: t.text }}>
            {shortDate(lastLog.at)}
            <Text style={{ fontSize: 13, fontWeight: '600', color: t.mut }}>
              {'  ·  '}{Object.keys(lastLog.values).length} {Object.keys(lastLog.values).length === 1 ? 'part' : 'parts'}
            </Text>
          </Text>
        </View>
        <Btn t={t} variant="primary" size="sm" icon="plus" onPress={openNew}>Log</Btn>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }} style={{ marginBottom: 14, marginHorizontal: -18 }}>
        <View style={{ width: 11 }} />
        {BODY_PARTS.map(p => {
          const on = p.key === selected;
          return (
            <Pressable
              key={p.key}
              onPress={() => setSelected(p.key)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${p.label} chart`}
              accessibilityState={{ selected: on }}
              style={{ minHeight: 44, paddingHorizontal: 15, borderRadius: 12, justifyContent: 'center', backgroundColor: on ? t.text : t.surface, borderWidth: on ? 0 : 1, borderColor: t.line2 }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: on ? t.bg : hasData.has(p.key) ? t.text : t.mut2 }}>{p.label}</Text>
            </Pressable>
          );
        })}
        <View style={{ width: 11 }} />
      </ScrollView>

      <View style={{ backgroundColor: t.surface, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: t.line2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.4 }}>{label.toUpperCase()}</Text>
            <Text style={{ fontSize: 30, fontWeight: '800', color: t.text }}>
              {latest ?? '—'}
              <Text style={{ fontSize: 14, color: t.mut, fontWeight: '600' }}> {fmt.lunit}</Text>
            </Text>
          </View>
          {delta != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 9, backgroundColor: t.elev }}>
              <Icon name="trend" size={13} color={t.text} sw={2.4} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: t.text }}>{delta > 0 ? '+' : ''}{delta} {fmt.lunit}</Text>
            </View>
          )}
        </View>
        <LineChart series={series} t={t} color={t.orange} unit={fmt.lunit} active={active} setActive={setActive} width={CHART_W} />
      </View>

      {rangeControl}

      <View style={{ height: 14 }} />
      {inRange.length ? (
        <BodyLogTable logs={inRange} selected={selected} onSelectPart={setSelected} onOpen={openEdit} />
      ) : (
        <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center', padding: 12, backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.line2 }}>
          <Icon name="info" size={17} color={t.mut} sw={2} />
          <Text style={{ fontSize: 13, color: t.mut, fontWeight: '600', flex: 1 }}>No measurements in this range.</Text>
        </View>
      )}

      {logSheet}
    </>
  );
}
