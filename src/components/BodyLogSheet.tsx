import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { useApp } from '../context';
import { BODY_PARTS, BodyLog, BodyPart } from '../data';
import { Sheet, Btn, AppText as Text, AppTextInput } from './Shared';
import { MeasureGuide } from './MeasureGuide';
import { useKeyboardVisible } from '../hooks';

type Inputs = Record<BodyPart, string>;

const emptyInputs = (): Inputs =>
  Object.fromEntries(BODY_PARTS.map(p => [p.key, ''])) as Inputs;

const shortDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

interface BodyLogSheetProps {
  open: boolean;
  /** The log being edited, or null to create a new one. */
  editing: BodyLog | null;
  /** Part the illustration starts on. */
  initialPart: BodyPart;
  onClose: () => void;
}

export function BodyLogSheet({ open, editing, initialPart, onClose }: BodyLogSheetProps) {
  const { t, fmt, bodyLogs, saveBodyLog, deleteBodyLog, toast } = useApp();
  const [inputs, setInputs] = useState<Inputs>(emptyInputs);
  const [focused, setFocused] = useState<BodyPart>(initialPart);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // With the keyboard up the pinned guide would leave room for barely one input row.
  const compact = useKeyboardVisible();
  const refs = useRef<Partial<Record<BodyPart, TextInput | null>>>({});

  useEffect(() => {
    if (!open) return;
    const next = emptyInputs();
    if (editing) {
      for (const p of BODY_PARTS) {
        const cm = editing.values[p.key];
        if (cm != null) next[p.key] = String(fmt.l(cm));
      }
    }
    setInputs(next);
    setFocused(initialPart);
    setConfirmDelete(false);
  }, [open, editing, initialPart, fmt]);

  // Most recent value per part from other logs, shown as a reference while typing.
  const previous = useMemo(() => {
    const out: Partial<Record<BodyPart, number>> = {};
    for (const log of bodyLogs) {
      if (log.id === editing?.id) continue;
      if (editing && log.at > editing.at) continue;
      for (const p of BODY_PARTS) {
        const cm = log.values[p.key];
        if (cm != null) out[p.key] = cm;
      }
    }
    return out;
  }, [bodyLogs, editing]);

  const tip = BODY_PARTS.find(p => p.key === focused)!;

  const save = async () => {
    const values: Partial<Record<BodyPart, number>> = {};
    for (const p of BODY_PARTS) {
      const v = parseFloat(inputs[p.key].replace(',', '.'));
      if (v > 0) values[p.key] = v;
    }
    if (!Object.keys(values).length) {
      toast({ icon: 'info', tone: 'danger', msg: 'Enter at least one measurement' });
      return;
    }
    await saveBodyLog({ id: editing?.id, at: editing?.at, values });
    onClose();
  };

  const remove = async () => {
    if (!editing) return;
    await deleteBodyLog(editing.id);
    onClose();
  };

  const header = (
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: t.surface2, borderRadius: 20, borderWidth: 1, borderColor: t.line2, padding: compact ? 8 : 12, marginBottom: compact ? 8 : 12 }}>
      <MeasureGuide part={focused} t={t} height={compact ? 96 : 168} />
      <View style={{ flex: 1, minWidth: 0 }}>
        {!compact && <Text style={{ fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.4 }}>HOW TO MEASURE</Text>}
        <Text style={{ fontSize: 20, fontWeight: '800', color: t.orange, marginTop: 2, letterSpacing: -0.3 }}>{tip.label}</Text>
        <Text style={{ fontSize: compact ? 12 : 13, fontWeight: '600', color: t.mut, lineHeight: compact ? 16 : 18, marginTop: compact ? 2 : 6 }} numberOfLines={compact ? 4 : undefined}>{tip.tip}</Text>
        {!compact && <Text style={{ fontSize: 11.5, fontWeight: '600', color: t.mut2, lineHeight: 16, marginTop: 8 }}>
          Flexible tape, snug but not compressing the skin.
        </Text>}
      </View>
    </View>
  );

  return (
    <Sheet open={open} onClose={onClose} t={t} title={editing ? `Edit — ${shortDate(editing.at)}` : 'Log measurements'} header={header}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 4, marginBottom: 8 }}>
        <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.4 }}>BODY PART</Text>
        <Text style={{ width: 120, fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.4, textAlign: 'center' }}>
          {fmt.lunit.toUpperCase()}
        </Text>
      </View>
      {BODY_PARTS.map(p => {
        const on = focused === p.key;
        const prev = previous[p.key];
        return (
          <Pressable
            key={p.key}
            onPress={() => { setFocused(p.key); refs.current[p.key]?.focus(); }}
            accessibilityRole="button"
            accessibilityLabel={`Enter ${p.label} measurement`}
            style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 6, borderRadius: 14, backgroundColor: t.surface2, borderWidth: 1.5, borderColor: on ? t.orange : t.line2 }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '800', color: t.text }}>{p.label}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: t.mut2 }}>
                {prev != null ? `Last: ${fmt.l(prev)} ${fmt.lunit}` : 'Not measured yet'}
              </Text>
            </View>
            <AppTextInput
              ref={el => { refs.current[p.key] = el; }}
              value={inputs[p.key]}
              onChangeText={v => setInputs(prevInputs => ({ ...prevInputs, [p.key]: v }))}
              onFocus={() => setFocused(p.key)}
              keyboardType="decimal-pad"
              placeholder={prev != null ? String(fmt.l(prev)) : '—'}
              placeholderTextColor={t.mut2}
              accessibilityLabel={`${p.label} in ${fmt.lunit}`}
              style={{ width: 120, fontSize: 18, fontWeight: '800', color: t.text, backgroundColor: t.elev, borderRadius: 12, paddingVertical: 10, textAlign: 'center' }}
            />
          </Pressable>
        );
      })}

      <View style={{ height: 10 }} />
      <Btn t={t} variant="primary" full size="lg" onPress={save}>{editing ? 'Save changes' : 'Save measurements'}</Btn>

      {editing && (confirmDelete ? (
        <View style={{ marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.line2 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: t.mut, lineHeight: 20, marginBottom: 12 }}>
            Delete measurements from {shortDate(editing.at)}? This cannot be undone.
          </Text>
          <Btn t={t} variant="danger" full onPress={remove}>Delete</Btn>
          <View style={{ height: 8 }} />
          <Btn t={t} variant="ghost" full onPress={() => setConfirmDelete(false)}>Cancel</Btn>
        </View>
      ) : (
        <View style={{ marginTop: 10 }}>
          <Btn t={t} variant="ghost" full icon="trash" onPress={() => setConfirmDelete(true)}>Delete entry</Btn>
        </View>
      ))}
    </Sheet>
  );
}
