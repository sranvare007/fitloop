import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Pressable, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context';
import { Btn, IconBtn, Chip, Sheet, MenuRow, Stat, AppText as Text, AppTextInput as TextInput } from '../components/Shared';
import { Icon, DotsMenu } from '../components/Icon';
import { Routine, SEED_PB, KNOWN_EXERCISES, fmtClock, fmtDur, uid, sessionVolume, sessionSets } from '../data';

function Key({ label, onPress, accent, big, t }: { label: string; onPress: () => void; accent?: boolean; big?: boolean; t: any }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ height: 62, borderRadius: 14, backgroundColor: accent ? t.lime : t.elev, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 }]}>
      <Text style={{ fontWeight: '800', fontSize: big ? 16 : 24, color: accent ? t.onLime : t.text }}>{label}</Text>
    </Pressable>
  );
}

function KeypadBar({ t, field, onKey, onClose, step }: any) {
  return (
    <View style={{ backgroundColor: t.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderTopColor: t.line, padding: 14, paddingBottom: 26, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.3, shadowRadius: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: t.mut, letterSpacing: 0.3 }}>
          Editing <Text style={{ color: t.orange }}>{field === 'reps' ? 'REPS' : 'WEIGHT'}</Text>
        </Text>
        <Pressable onPress={onClose} style={{ backgroundColor: t.lime, paddingVertical: 8, paddingHorizontal: 22, borderRadius: 12 }}>
          <Text style={{ fontWeight: '800', fontSize: 14, color: t.onLime }}>Done</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['1','2','3'].map(d => <View key={d} style={{ flex: 1 }}><Key t={t} label={d} onPress={() => onKey(d)} /></View>)}
          <View style={{ flex: 1 }}><Key t={t} label={`+${step}`} onPress={() => onKey('inc')} accent big /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['4','5','6'].map(d => <View key={d} style={{ flex: 1 }}><Key t={t} label={d} onPress={() => onKey(d)} /></View>)}
          <View style={{ flex: 1 }}><Key t={t} label={`−${step}`} onPress={() => onKey('dec')} big /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['7','8','9'].map(d => <View key={d} style={{ flex: 1 }}><Key t={t} label={d} onPress={() => onKey(d)} /></View>)}
          <View style={{ flex: 1 }}><Key t={t} label="DEL" onPress={() => onKey('del')} big /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            {field === 'kg' ? <Key t={t} label="." onPress={() => onKey('.')} /> : <View style={{ height: 62 }} />}
          </View>
          <View style={{ flex: 1 }}><Key t={t} label="0" onPress={() => onKey('0')} /></View>
          <View style={{ flex: 2 }} />
        </View>
      </View>
    </View>
  );
}

function SetRow({ i, set, t, fmt, onEdit, onDelete, prevBest }: any) {
  return (
    <Pressable onPress={onEdit} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 6, borderRadius: 12, marginBottom: 3 }}>
      <Pressable onPress={onDelete} style={{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
        <Icon name="trash" size={16} color={t.danger} sw={1.9} />
      </Pressable>
      <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: t.mut }}>{i + 1}</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: t.text }}>{set.reps}</Text>
        {prevBest != null && <Text style={{ fontSize: 10.5, fontWeight: '700', color: t.mut2 }}>{prevBest.reps}</Text>}
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: t.text }}>{set.w}</Text>
        {prevBest != null && <Text style={{ fontSize: 10.5, fontWeight: '700', color: t.mut2 }}>{fmt.w(prevBest.kg)}</Text>}
      </View>
      <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: t.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={12} color={t.limeInk} sw={2.6} />
      </View>
    </Pressable>
  );
}

function SetEdit({ i, set, t, fmt, field, onField, onStep, prevBest }: any) {
  return (
    <View style={{ backgroundColor: t.bg === '#0C0D10' ? '#0E0F13' : t.surface2, borderRadius: 16, padding: 13, marginBottom: 8, borderWidth: 1, borderColor: t.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: prevBest ? 8 : 12 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: t.orange, letterSpacing: 0.3 }}>SET {i + 1}</Text>
        <Text style={{ fontSize: 12, color: t.mut2, fontWeight: '600' }}>tap a number to type</Text>
      </View>
      {prevBest != null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.elev, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.3 }}>PREV BEST</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: t.mut }}>{fmt.w(prevBest.kg)}{fmt.wlabel} × {prevBest.reps}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        {/* Reps field */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, color: field === 'reps' ? t.orange : t.mut2, marginBottom: 7 }}>REPS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Pressable onPress={() => onStep('reps', -1)} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '600', color: t.text, lineHeight: 22 }}>−</Text>
            </Pressable>
            <Pressable onPress={() => onField('reps')} style={{ minWidth: 62, height: 44, paddingHorizontal: 8, borderRadius: 11, backgroundColor: field === 'reps' ? t.limeSoft : 'transparent', borderWidth: 1.6, borderColor: field === 'reps' ? t.lime : t.line, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: t.text }}>{set.reps}</Text>
            </Pressable>
            <Pressable onPress={() => onStep('reps', 1)} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '600', color: t.text, lineHeight: 22 }}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ width: 1, backgroundColor: t.line, marginHorizontal: 4 }} />
        {/* Weight field */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, color: field === 'kg' ? t.orange : t.mut2, marginBottom: 7 }}>WEIGHT ({fmt.wlabel})</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Pressable onPress={() => onStep('kg', -fmt.step)} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '600', color: t.text, lineHeight: 22 }}>−</Text>
            </Pressable>
            <Pressable onPress={() => onField('kg')} style={{ minWidth: 62, height: 44, paddingHorizontal: 8, borderRadius: 11, backgroundColor: field === 'kg' ? t.limeSoft : 'transparent', borderWidth: 1.6, borderColor: field === 'kg' ? t.lime : t.line, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: t.text }}>{set.w}</Text>
            </Pressable>
            <Pressable onPress={() => onStep('kg', fmt.step)} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '600', color: t.text, lineHeight: 22 }}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function ExerciseCard({ ex, idx, t, fmt, isOpen, onToggle, editKey, setEditKey, field, setField, updateSet, addSet, deleteSet, onMenu, setBests }: any) {
  const pbStr = ex.pb ? `${fmt.w(ex.pb[0])} ${fmt.wlabel} × ${ex.pb[1]}` : '—';
  const bests: { position: number; reps: number; kg: number }[] = setBests?.[ex.name] ?? [];
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 20, borderWidth: 1, borderColor: t.line2, overflow: 'hidden' }}>
      <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 15 }}>
        <Icon name="grip" size={18} color={t.mut2} sw={3} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 16.5, fontWeight: '800', color: t.text, letterSpacing: -0.2 }}>{ex.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.limeSoft, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8 }}>
              <Icon name="star" size={10} color={t.limeInk} sw={0} fill="solid" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: t.limeInk }}>PB {pbStr}</Text>
            </View>
            {ex.swapped && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${t.orange}22`, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: t.orange }}>SWAPPED</Text>
              </View>
            )}
            <Text style={{ fontSize: 12.5, color: t.mut, fontWeight: '600' }}>{ex.sets.length} {ex.sets.length === 1 ? 'set' : 'sets'}</Text>
          </View>
        </View>
        <Pressable onPress={onMenu} style={{ padding: 6 }}>
          <DotsMenu color={t.mut2} />
        </Pressable>
        <Icon name="chevD" size={18} color={t.mut} sw={2.2} />
      </Pressable>

      {isOpen && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          {ex.sets.length > 0 && (
            <View style={{ flexDirection: 'row', paddingHorizontal: 6, paddingBottom: 7 }}>
              <View style={{ width: 34 }} /><View style={{ width: 30 }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: t.mut2, letterSpacing: 0.6 }}>REPS</Text>
                {bests.length > 0 && <Text style={{ fontSize: 9, fontWeight: '700', color: t.mut2, opacity: 0.6 }}>PREV</Text>}
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: t.mut2, letterSpacing: 0.6 }}>{fmt.wlabel.toUpperCase()}</Text>
                {bests.length > 0 && <Text style={{ fontSize: 9, fontWeight: '700', color: t.mut2, opacity: 0.6 }}>PREV</Text>}
              </View>
              <View style={{ width: 22 }} />
            </View>
          )}
          {ex.sets.map((s: any, i: number) => {
            const key = `${idx}:${i}`;
            const prevBest = bests.find(b => b.position === i) ?? null;
            return editKey === key ? (
              <SetEdit key={i} i={i} set={s} t={t} fmt={fmt} field={field} prevBest={prevBest}
                onField={(f: string) => setField(field === f ? null : f)}
                onStep={(f: string, d: number) => updateSet(idx, i, f, d, true)} />
            ) : (
              <SetRow key={i} i={i} set={s} t={t} fmt={fmt} prevBest={prevBest}
                onEdit={() => { setEditKey(key); setField('kg'); }}
                onDelete={() => deleteSet(idx, i)} />
            );
          })}
          {ex.sets.length === 0 && (
            <Text style={{ textAlign: 'center', color: t.mut2, fontSize: 13, paddingVertical: 6, fontWeight: '600' }}>No sets yet — add your first below</Text>
          )}
          <Pressable onPress={() => addSet(idx)} style={{ marginTop: 6, padding: 12, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <Icon name="plus" size={16} color={t.orange} sw={2.6} />
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: t.text }}>Add set</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function SessionScreen({ routine, onExit, onSave, resumeData }: { routine: Routine | null; onExit: () => void; onSave: (data: any) => void; resumeData?: { startedAt: number; exercises: any[] } | null }) {
  const { t, fmt, toast, updateInProgressSession, loadSetBests } = useApp();
  const insets = useSafeAreaInsets();
  const seedPb = SEED_PB;

  const mkEx = (name: string, withSets: boolean) => ({
    id: uid(), name, pb: seedPb[name],
    sets: withSets ? [{ reps: 10, w: fmt.w(seedPb[name] ? seedPb[name][0] * 0.75 : 40) }, { reps: 8, w: fmt.w(seedPb[name] ? seedPb[name][0] * 0.9 : 50) }] : [],
  });

  const [exs, setExs] = useState(() =>
    resumeData?.exercises?.length
      ? resumeData.exercises
      : (routine?.exercises || ['Bench Press']).map((n, i) => mkEx(n, i === 0))
  );
  const [setBests, setSetBests] = useState<Record<string, { position: number; reps: number; kg: number }[]>>({});
  const [open, setOpen] = useState<number>(0);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  const [menu, setMenu] = useState<number | null>(null);
  const [swap, setSwap] = useState<number | null>(null);
  const [swapQuery, setSwapQuery] = useState('');
  const [addExOpen, setAddExOpen] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [finish, setFinish] = useState(false);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [notes, setNotes] = useState('');
  const startRef = useRef(resumeData?.startedAt ?? Date.now());
  const [elapsed, setElapsed] = useState(() => Math.round((Date.now() - startRef.current) / 1000));
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keypad slide animation
  const [keypadVisible, setKeypadVisible] = useState(false);
  const slideAnim = useSharedValue(400);
  const prevFieldRef = useRef<string | null>(null);
  const keypadAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  useEffect(() => {
    if (field && !prevFieldRef.current) {
      setKeypadVisible(true);
      slideAnim.value = withSpring(0, { damping: 22, stiffness: 300, mass: 0.9 });
    }
    prevFieldRef.current = field;
  }, [field]);

  const dismissKeypad = () => {
    slideAnim.value = withTiming(400, { duration: 220 }, (done) => {
      if (done) { runOnJS(setField)(null); runOnJS(setKeypadVisible)(false); }
    });
  };

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => updateInProgressSession(exs), 400);
    return () => { if (persistTimer.current) clearTimeout(persistTimer.current); };
  }, [exs]);

  // Reload per-set bests whenever the exercise list changes (mount + swaps)
  useEffect(() => {
    const names = [...new Set(exs.map((e: any) => e.name as string))];
    loadSetBests(names).then(setSetBests).catch(() => {});
  }, [exs.map((e: any) => e.name).join('|')]);

  const editIdx = editKey ? +editKey.split(':')[0] : -1;
  const editSetIdx = editKey ? +editKey.split(':')[1] : -1;

  const updateSet = (ei: number, si: number, f: string, delta: number, isStep: boolean) => {
    setExs(prev => prev.map((e, j) => j !== ei ? e : {
      ...e, sets: e.sets.map((s: any, k: number) => {
        if (k !== si) return s;
        if (f === 'reps') return { ...s, reps: Math.max(1, s.reps + (isStep ? Math.round(delta) : 0)) };
        return { ...s, w: Math.max(0, +(s.w + (isStep ? delta : 0)).toFixed(2)) };
      })
    }));
  };

  const setSetValue = (ei: number, si: number, f: string, value: any) => {
    setExs(prev => prev.map((e, j) => j !== ei ? e : {
      ...e, sets: e.sets.map((s: any, k: number) => k !== si ? s : { ...s, [f === 'reps' ? 'reps' : 'w']: value })
    }));
  };

  const onKey = useCallback((k: string) => {
    if (editIdx < 0 || !field) return;
    const set = exs[editIdx].sets[editSetIdx];
    const cur = field === 'reps' ? String(set.reps) : String(set.w);
    if (k === 'inc' || k === 'dec') {
      const d = (k === 'inc' ? 1 : -1) * (field === 'reps' ? 1 : fmt.step);
      updateSet(editIdx, editSetIdx, field, d, true); setFresh(true); return;
    }
    let next: string;
    if (k === 'del') { next = cur.length <= 1 ? '0' : cur.slice(0, -1); setFresh(false); }
    else if (k === '.') {
      if (field === 'reps') return;
      next = fresh ? '0.' : (cur.includes('.') ? cur : cur + '.'); setFresh(false);
    }
    else { if (fresh) { next = k; setFresh(false); } else { next = (cur === '0' ? '' : cur) + k; } }
    if (next.replace('.', '').length > 5) return;
    const num = field === 'reps' ? Math.max(0, parseInt(next || '0', 10)) : (parseFloat(next) || 0);
    setSetValue(editIdx, editSetIdx, field, field === 'reps' ? num : (next.endsWith('.') ? next : num));
  }, [editIdx, editSetIdx, exs, field, fresh, fmt.step]);

  const addSet = (ei: number) => {
    setExs(prev => prev.map((e, j) => {
      if (j !== ei) return e;
      const last = e.sets[e.sets.length - 1] || { reps: 8, w: fmt.w(e.pb ? e.pb[0] : 20) };
      return { ...e, sets: [...e.sets, { reps: last.reps, w: last.w }] };
    }));
    const newIdx = exs[ei].sets.length;
    setOpen(ei); setEditKey(ei + ':' + newIdx); setField('kg'); setFresh(true);
  };

  const deleteSet = (ei: number, si: number) => {
    const removed = exs[ei].sets[si];
    setExs(prev => prev.map((e, j) => j !== ei ? e : { ...e, sets: e.sets.filter((_: any, k: number) => k !== si) }));
    if (editKey === `${ei}:${si}`) { setEditKey(null); setField(null); }
    toast({ icon: 'trash', tone: 'danger', msg: 'Set deleted', action: { label: 'Undo', fn: () => {
      setExs(prev => prev.map((e, j) => j !== ei ? e : { ...e, sets: [...e.sets.slice(0, si), removed, ...e.sets.slice(si)] }));
      toast(null);
    }}});
  };

  const moveEx = (ei: number, dir: number) => {
    setExs(prev => { const a = [...prev]; const ni = ei + dir; if (ni < 0 || ni >= a.length) return a; [a[ei], a[ni]] = [a[ni], a[ei]]; return a; });
    setMenu(null); setOpen(ei + dir);
  };

  const deleteEx = (ei: number) => { setExs(prev => prev.filter((_: any, j: number) => j !== ei)); setMenu(null); setOpen(0); setEditKey(null); };

  const addEx = () => {
    if (!newExName.trim()) return;
    setExs(prev => [...prev, mkEx(newExName.trim(), false)]);
    setOpen(exs.length); setAddExOpen(false); setNewExName('');
  };

  const swapEx = (ei: number, name: string) => {
    const nm = name.trim(); if (!nm) return;
    setExs(prev => prev.map((e: any, j: number) => j !== ei ? e : { ...e, name: nm, pb: seedPb[nm], swapped: true }));
    setSwap(null); setSwapQuery(''); setOpen(ei);
    toast({ icon: 'swap', msg: `Swapped to ${nm}` });
  };

  const totalVol = Math.round(exs.reduce((a: number, e: any) => a + e.sets.reduce((s: number, x: any) => s + x.reps * x.w, 0), 0));
  const totalSets = exs.reduce((a: number, e: any) => a + e.sets.length, 0);

  const doSave = () => {
    const exsKg = exs.filter((e: any) => e.sets.length).map((e: any) => ({
      id: e.id, name: e.name,
      sets: e.sets.map((s: any) => ({ reps: s.reps, kg: fmt.unit === 'kg' ? s.w : +(s.w / 2.20462).toFixed(1) }))
    }));
    onSave({ id: uid(), routineId: routine?.id || null, routineName: routine?.name || 'Free Workout', startedAt: startRef.current, endedAt: Date.now(), durationSec: elapsed, exercises: exsKg, notes });
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: t.line2 }}>
          <IconBtn name="x" t={t} onPress={() => setStopConfirm(true)} color={t.mut} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: t.text, letterSpacing: 0.1 }}>{routine?.name || 'Free Workout'}</Text>
            <Text style={{ fontSize: 12.5, color: t.limeInk, fontWeight: '700', marginTop: 1 }}>{fmtClock(elapsed)}</Text>
          </View>
          <Btn t={t} size="sm" onPress={() => setFinish(true)} style={{ borderRadius: 12 }}>Finish</Btn>
        </View>
      </View>

      {/* Exercise list */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: keypadVisible ? 320 : 130, gap: 12 }} showsVerticalScrollIndicator={false}>
        {exs.map((ex: any, i: number) => (
          <ExerciseCard key={ex.id} ex={ex} idx={i} t={t} fmt={fmt}
            isOpen={open === i} onToggle={() => setOpen(open === i ? -1 : i)}
            editKey={editKey} setEditKey={setEditKey} field={field}
            setField={(f: string | null) => { if (f === null) dismissKeypad(); else { setField(f); setFresh(true); } }}
            updateSet={updateSet} addSet={addSet} deleteSet={deleteSet}
            onMenu={() => setMenu(i)} setBests={setBests} />
        ))}
        <Pressable onPress={() => setAddExOpen(true)} style={({ pressed }) => [{ padding: 15, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, backgroundColor: t.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.7 : 1 }]}>
          <Icon name="plus" size={18} color={t.orange} sw={2.6} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: t.text }}>Add exercise</Text>
        </Pressable>
      </ScrollView>

      {/* Volume bar */}
      {!keypadVisible && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: insets.bottom + 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.bg }}>
          <View>
            <Text style={{ fontSize: 10.5, color: t.mut2, fontWeight: '800', letterSpacing: 0.6 }}>TOTAL VOLUME</Text>
            <Text style={{ fontSize: 23, fontWeight: '800', color: t.text }}>
              {totalVol.toLocaleString()} <Text style={{ fontSize: 13, color: t.mut, fontWeight: '600' }}>{fmt.wlabel}</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: t.mut }}>{totalSets} sets</Text>
            <Text style={{ fontSize: 13, color: t.mut, opacity: 0.4 }}>·</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: t.mut }}>{exs.length} lifts</Text>
          </View>
        </View>
      )}

      {/* Keypad */}
      {keypadVisible && (
        <>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={dismissKeypad} />
          <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0 }, keypadAnimStyle]}>
            <KeypadBar t={t} field={field} step={field === 'reps' ? 1 : fmt.step} onKey={onKey} onClose={dismissKeypad} />
          </Animated.View>
        </>
      )}

      {/* Exercise menu */}
      <Sheet open={menu !== null} onClose={() => setMenu(null)} t={t} title={menu !== null ? exs[menu]?.name : undefined}>
        <View style={{ gap: 8 }}>
          <MenuRow t={t} icon="swap" label="Swap exercise" onPress={() => { const i = menu!; setMenu(null); setSwap(i); setSwapQuery(''); }} />
          <MenuRow t={t} icon="chevD" label="Move down" onPress={() => moveEx(menu!, 1)} />
          <MenuRow t={t} icon="chevD" label="Move up" onPress={() => moveEx(menu!, -1)} />
          <MenuRow t={t} icon="trash" label="Remove from session" danger onPress={() => deleteEx(menu!)} />
        </View>
      </Sheet>

      {/* Swap exercise */}
      <Sheet open={swap !== null} onClose={() => setSwap(null)} t={t} title={swap !== null ? `Swap "${exs[swap]?.name}"` : 'Swap exercise'}>
        <Text style={{ fontSize: 13, color: t.mut, fontWeight: '600', marginTop: -8, marginBottom: 14, lineHeight: 20 }}>Pick a substitute for this session only — your saved routine stays unchanged.</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: t.surface2, borderRadius: 13, borderWidth: 1.5, borderColor: t.line, paddingHorizontal: 13, marginBottom: 12 }}>
          <Icon name="search" size={17} color={t.mut} sw={2} />
          <TextInput autoFocus value={swapQuery} onChangeText={setSwapQuery} onSubmitEditing={() => swapEx(swap!, swapQuery)}
            placeholder="Search or type an exercise…" placeholderTextColor={t.mut2}
            style={{ flex: 1, color: t.text, fontSize: 15.5, fontWeight: '700', paddingVertical: 13 }} />
        </View>
        {swapQuery.trim() && !KNOWN_EXERCISES.some(n => n.toLowerCase() === swapQuery.trim().toLowerCase()) && (
          <Pressable onPress={() => swapEx(swap!, swapQuery)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 13, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, marginBottom: 8 }}>
            <Icon name="plus" size={18} color={t.orange} sw={2.6} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: t.text }}>Use "{swapQuery.trim()}"</Text>
          </Pressable>
        )}
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
          {KNOWN_EXERCISES.filter(n => n.toLowerCase().includes(swapQuery.trim().toLowerCase())).map(n => {
            const isCurrent = swap !== null && exs[swap]?.name === n;
            return (
              <Pressable key={n} onPress={() => !isCurrent && swapEx(swap!, n)} disabled={isCurrent}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, borderRadius: 13, marginBottom: 4, backgroundColor: isCurrent ? t.limeSoft : t.surface2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '700', color: isCurrent ? t.limeInk : t.text }}>{n}</Text>
                  {seedPb[n] && <View style={{ backgroundColor: t.limeSoft, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 7 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: t.limeInk }}>PB {fmt.w(seedPb[n][0])}{fmt.wlabel}</Text>
                  </View>}
                </View>
                {isCurrent ? <Text style={{ fontSize: 12, fontWeight: '800', color: t.limeInk }}>CURRENT</Text> : <Icon name="swap" size={17} color={t.mut2} sw={2} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>

      {/* Add exercise */}
      <Sheet open={addExOpen} onClose={() => setAddExOpen(false)} t={t} title="Add exercise">
        <TextInput autoFocus value={newExName} onChangeText={setNewExName} onSubmitEditing={addEx}
          placeholder="e.g. Dumbbell Shrug" placeholderTextColor={t.mut2}
          style={{ padding: 15, borderRadius: 14, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface2, color: t.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
          {['Dips', 'Lateral Raise', 'Hammer Curl', 'Pull-up'].map(s => (
            <Pressable key={s} onPress={() => setNewExName(s)} style={{ borderWidth: 1, borderColor: t.line, backgroundColor: t.surface2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: t.mut }}>{s}</Text>
            </Pressable>
          ))}
        </View>
        <Btn t={t} full size="lg" onPress={addEx}>Add to session</Btn>
        <Text style={{ fontSize: 12, color: t.mut2, textAlign: 'center', marginTop: 12 }}>Added to this session only, not the saved routine</Text>
      </Sheet>

      {/* Stop confirmation */}
      <Sheet open={stopConfirm} onClose={() => setStopConfirm(false)} t={t} title="Stop workout?">
        <Text style={{ fontSize: 14, color: t.mut, fontWeight: '600', lineHeight: 21, marginTop: -8, marginBottom: 20 }}>
          Your progress will be lost. This cannot be undone.
        </Text>
        <Btn t={t} variant="danger" full size="lg" onPress={onExit}>Stop workout</Btn>
        <View style={{ height: 10 }} />
        <Btn t={t} variant="ghost" full onPress={() => setStopConfirm(false)}>Keep going</Btn>
      </Sheet>

      {/* Finish summary */}
      <Sheet open={finish} onClose={() => setFinish(false)} t={t} title="Finish workout">
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1 }}><Stat t={t} label="DURATION" value={fmtDur(elapsed)} /></View>
          <View style={{ flex: 1 }}><Stat t={t} label="SETS" value={totalSets} /></View>
          <View style={{ flex: 1 }}><Stat t={t} label="VOLUME" value={totalVol.toLocaleString()} sub={fmt.wlabel} /></View>
        </View>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: t.mut2, letterSpacing: 0.4, marginBottom: 7 }}>SESSION NOTES</Text>
        <TextInput value={notes} onChangeText={v => setNotes(v.slice(0, 300))} placeholder="How did it feel? (optional)" placeholderTextColor={t.mut2} multiline
          style={{ minHeight: 70, padding: 13, borderRadius: 14, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface2, color: t.text, fontSize: 15, fontWeight: '500', marginBottom: 16, textAlignVertical: 'top' }} />
        <Btn t={t} variant="pop" full size="lg" onPress={doSave} icon="check">Save session</Btn>
        <View style={{ height: 10 }} />
        <Btn t={t} variant="ghost" full onPress={() => setFinish(false)}>Keep going</Btn>
      </Sheet>
    </View>
  );
}
