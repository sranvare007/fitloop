import React, { useMemo, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useApp } from '../context';
import { BODY_PARTS, BodyLog, BodyPart } from '../data';
import { AppText as Text } from './Shared';

const PAGE = 20;
const DATE_W = 76;
const COL_W = 72;
const HEAD_H = 36;
const ROW_H = 48;

interface BodyLogTableProps {
  /** Logs to show, oldest-first. */
  logs: BodyLog[];
  selected: BodyPart;
  onSelectPart: (p: BodyPart) => void;
  onOpen: (log: BodyLog) => void;
}

/** Date × body-part grid, newest row first, with the date column pinned while the parts scroll sideways. */
export function BodyLogTable({ logs, selected, onSelectPart, onOpen }: BodyLogTableProps) {
  const { t, fmt } = useApp();
  const [showAll, setShowAll] = useState(false);

  const columns = useMemo(
    () => BODY_PARTS.filter(p => logs.some(l => l.values[p.key] != null)),
    [logs],
  );

  // Newest-first, each value paired with the change since the previous log that had that part.
  const rows = useMemo(() => {
    const last: Partial<Record<BodyPart, number>> = {};
    const out = logs.map(log => {
      const delta: Partial<Record<BodyPart, number>> = {};
      for (const p of BODY_PARTS) {
        const cm = log.values[p.key];
        if (cm == null) continue;
        const before = last[p.key];
        if (before != null) delta[p.key] = +(fmt.l(cm) - fmt.l(before)).toFixed(1);
        last[p.key] = cm;
      }
      return { log, delta };
    });
    return out.reverse();
  }, [logs, fmt]);

  const visible = showAll ? rows : rows.slice(0, PAGE);
  const date = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const year = (ts: number) => String(new Date(ts).getFullYear());

  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 22, borderWidth: 1, borderColor: t.line2, paddingVertical: 14, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 8 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.4 }}>HISTORY · {fmt.lunit.toUpperCase()}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: t.mut2 }}>Tap a row to edit</Text>
      </View>

      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: DATE_W, borderRightWidth: 1, borderRightColor: t.line2 }}>
          <View style={{ height: HEAD_H, justifyContent: 'center', paddingLeft: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut }}>Date</Text>
          </View>
          {visible.map(({ log }) => (
            <Pressable
              key={log.id}
              onPress={() => onOpen(log)}
              accessibilityRole="button"
              accessibilityLabel={`Edit measurements from ${date(log.at)}`}
              style={{ height: ROW_H, justifyContent: 'center', paddingLeft: 14, borderTopWidth: 1, borderTopColor: t.line2 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: t.text }}>{date(log.at)}</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: t.mut2 }}>{year(log.at)}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View>
            <View style={{ flexDirection: 'row', height: HEAD_H }}>
              {columns.map(p => {
                const on = p.key === selected;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => onSelectPart(p.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${p.label} chart`}
                    style={{ width: COL_W, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.elev : 'transparent' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: on ? t.orange : t.mut }}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {visible.map(({ log, delta }) => (
              <Pressable
                key={log.id}
                onPress={() => onOpen(log)}
                accessibilityRole="button"
                accessibilityLabel={`Edit measurements from ${date(log.at)}`}
                style={({ pressed }) => ({ flexDirection: 'row', height: ROW_H, borderTopWidth: 1, borderTopColor: t.line2, opacity: pressed ? 0.6 : 1 })}
              >
                {columns.map(p => {
                  const cm = log.values[p.key];
                  const d = delta[p.key];
                  return (
                    <View key={p.key} style={{ width: COL_W, alignItems: 'center', justifyContent: 'center', backgroundColor: p.key === selected ? t.elev : 'transparent' }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: cm != null ? t.text : t.mut2 }}>
                        {cm != null ? fmt.l(cm) : '—'}
                      </Text>
                      {d != null && d !== 0 && (
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: t.mut }}>{d > 0 ? '▲' : '▼'} {Math.abs(d)}</Text>
                      )}
                    </View>
                  );
                })}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {rows.length > PAGE && (
        <Pressable
          onPress={() => setShowAll(v => !v)}
          accessibilityRole="button"
          accessibilityLabel={showAll ? 'Show fewer entries' : 'Show all entries'}
          style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: t.line2 }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: t.orange }}>
            {showAll ? 'Show less' : `Show all ${rows.length}`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
