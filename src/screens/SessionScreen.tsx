import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Pressable, ScrollView, Modal, KeyboardAvoidingView, Platform, Dimensions, AppState } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context';
import { Btn, IconBtn, Chip, Sheet, MenuRow, Stat, Switch, ExerciseSearchList, AppText as Text, AppTextInput as TextInput } from '../components/Shared';
import { useExerciseSearch } from '../hooks';
import { Icon, DotsMenu } from '../components/Icon';
import { Routine, SEED_PB, fmtClock, fmtDur, uid, sessionVolume, sessionSets } from '../data';
import { Theme } from '../theme';

const ABANDON_GAP_MS = 20 * 60 * 1000;

const EX_GAP = 12;
const GRIP_HIT = 44;

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

function SetEdit({ i, set, t, fmt, field, onField, onStep, prevBest, containerRef }: any) {
  return (
    <View ref={containerRef} style={{ backgroundColor: t.bg === '#0C0D10' ? '#0E0F13' : t.surface2, borderRadius: 16, padding: 13, marginBottom: 8, borderWidth: 1, borderColor: t.line }}>
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

function ExerciseCard({ ex, idx, t, fmt, isOpen, onToggle, editKey, setEditKey, field, setField, updateSet, addSet, deleteSet, onMenu, setBests, activeEditRef }: any) {
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
            const prevBest = bests[i] ?? null;
            return editKey === key ? (
              <SetEdit key={i} i={i} set={s} t={t} fmt={fmt} field={field} prevBest={prevBest}
                containerRef={activeEditRef}
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

function SortableSessionList({ exs, setExs, openIds, toggleOpen, t, fmt, editKey, setEditKey, field, setField, updateSet, addSet, deleteSet, onMenu, setBests, activeEditRef, onDragStart, onDragEnd }: any) {
  const [draggingIdx, setDraggingIdx] = useState(-1);
  const ghostY = useSharedValue(0);
  const activeIdx = useSharedValue(-1);
  const itemCount = useSharedValue(exs.length);
  const itemCumTops = useSharedValue<number[]>([]);
  const measuredHeights = useRef<number[]>([]);

  useEffect(() => { itemCount.value = exs.length; }, [exs.length]);

  const updateCumTops = () => {
    const heights = measuredHeights.current;
    const tops: number[] = [];
    let y = 0;
    for (let i = 0; i < heights.length; i++) {
      tops.push(y);
      if (i < heights.length - 1) y += (heights[i] || 82) + EX_GAP;
    }
    itemCumTops.value = tops;
  };

  const ghostStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0, right: 0,
    top: ghostY.value,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  }));

  const beginDrag = (idx: number) => { setDraggingIdx(idx); onDragStart?.(); };
  const endDrag = () => { setDraggingIdx(-1); onDragEnd?.(); };
  const commitSwap = (from: number, to: number) => {
    setExs((prev: any[]) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const gesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart((e) => {
      'worklet';
      if (e.x > GRIP_HIT) return;
      const tops = itemCumTops.value;
      let idx = tops.length - 1;
      for (let i = 0; i < tops.length - 1; i++) {
        if (e.y < tops[i + 1]) { idx = i; break; }
      }
      if (idx < 0 || idx >= itemCount.value) return;
      activeIdx.value = idx;
      ghostY.value = tops[idx] ?? 0;
      runOnJS(beginDrag)(idx);
    })
    .onUpdate((e) => {
      'worklet';
      if (activeIdx.value < 0) return;
      const tops = itemCumTops.value;
      const count = itemCount.value;
      const maxY = tops.length > 0 ? tops[tops.length - 1] : 0;
      ghostY.value = Math.max(0, Math.min(e.y - 40, maxY));
      let target = count - 1;
      for (let i = 0; i < count - 1; i++) {
        const mid = (tops[i] + tops[i + 1]) / 2;
        if (e.y < mid) { target = i; break; }
      }
      if (target !== activeIdx.value) {
        runOnJS(commitSwap)(activeIdx.value, target);
        activeIdx.value = target;
      }
    })
    .onEnd(() => {
      'worklet';
      if (activeIdx.value < 0) return;
      const tops = itemCumTops.value;
      ghostY.value = withSpring(tops[activeIdx.value] ?? 0, { damping: 20, stiffness: 300 });
      activeIdx.value = -1;
      runOnJS(endDrag)();
    })
    .onFinalize(() => {
      'worklet';
      if (activeIdx.value >= 0) { activeIdx.value = -1; runOnJS(endDrag)(); }
    });

  const draggingItem = draggingIdx >= 0 ? exs[draggingIdx] : null;

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ position: 'relative' }}>
        {exs.map((ex: any, i: number) => (
          <View
            key={ex.id}
            style={{ marginBottom: i < exs.length - 1 ? EX_GAP : 0, opacity: draggingIdx === i ? 0 : 1 }}
            onLayout={e => { measuredHeights.current[i] = e.nativeEvent.layout.height; updateCumTops(); }}
          >
            <ExerciseCard
              ex={ex} idx={i} t={t} fmt={fmt}
              isOpen={openIds.has(ex.id)} onToggle={() => toggleOpen(ex.id)}
              editKey={editKey} setEditKey={setEditKey} field={field} setField={setField}
              updateSet={updateSet} addSet={addSet} deleteSet={deleteSet}
              onMenu={() => onMenu(i)} setBests={setBests} activeEditRef={activeEditRef}
            />
          </View>
        ))}
        {draggingItem !== null && (
          <Animated.View style={ghostStyle} pointerEvents="none">
            <ExerciseCard
              ex={draggingItem} idx={draggingIdx} t={t} fmt={fmt}
              isOpen={false} onToggle={() => {}}
              editKey={null} setEditKey={() => {}} field={null} setField={() => {}}
              updateSet={() => {}} addSet={() => {}} deleteSet={() => {}}
              onMenu={() => {}} setBests={setBests} activeEditRef={activeEditRef}
            />
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

function StepRow({ label, t, onMinus, onPlus }: { label: string; t: Theme; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.elev, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 6 }}>
      <IconBtn name="minus" t={t} size={44} bg={t.surface2} onPress={onMinus} />
      <Text style={{ fontSize: 12.5, fontWeight: '800', color: t.mut, letterSpacing: 0.3 }}>{label}</Text>
      <IconBtn name="plus" t={t} size={44} bg={t.surface2} onPress={onPlus} />
    </View>
  );
}

export function SessionScreen({ routine, onExit, onSave, resumeData, onBackRequest }: { routine: Routine | null; onExit: () => void; onSave: (data: any) => void; resumeData?: { startedAt: number; lastActiveAt?: number; exercises: any[] } | null; onBackRequest?: React.MutableRefObject<(() => boolean) | null> }) {
  const { t, fmt, toast, updateInProgressSession, loadSetBests, saveRoutine, openPhysiqueCamera, minimizeSession } = useApp();
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
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const first = (resumeData?.exercises?.length ? resumeData.exercises : exs)[0]?.id;
    return new Set<string>(first ? [first] : []);
  });
  const toggleOpen = (id: string) => setOpenIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const openEx = (id: string) => setOpenIds(prev => prev.has(id) ? prev : new Set(prev).add(id));
  const [editKey, setEditKey] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  const [menu, setMenu] = useState<number | null>(null);
  const [swap, setSwap] = useState<number | null>(null);
  const [swapQuery, setSwapQuery] = useState('');
  const [addExOpen, setAddExOpen] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [addToRoutine, setAddToRoutine] = useState(true);
  const [finish, setFinish] = useState(false);
  const [gapDetected, setGapDetected] = useState(false);
  const [earlyFinish, setEarlyFinish] = useState(false);
  const [finishAtMs, setFinishAtMs] = useState(0);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [addPhoto, setAddPhoto] = useState(false);
  const { results: addExResults, loading: addExLoading } = useExerciseSearch(newExName);
  const { results: swapResults, loading: swapLoading } = useExerciseSearch(swapQuery);
  const startRef = useRef(resumeData?.startedAt ?? Date.now());
  const [elapsed, setElapsed] = useState(() => Math.round((Date.now() - startRef.current) / 1000));
  const lastSetLoggedAtRef = useRef(resumeData?.lastActiveAt ?? resumeData?.startedAt ?? Date.now());
  const sawLongGapRef = useRef(false);
  const bgAtRef = useRef<number | null>(null);
  const persistMountedRef = useRef(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const activeEditRef = useRef<View>(null);

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

  // Background the session — keep it in progress so the user can browse other
  // screens and resume later. Flush the latest sets before unmounting.
  const handleMinimize = useCallback(() => {
    updateInProgressSession(exs);
    minimizeSession();
  }, [exs, updateInProgressSession, minimizeSession]);

  // The session is hosted in a Modal whose Android back press routes through the
  // parent's onRequestClose. Expose a handler so back dismisses the keypad first.
  useEffect(() => {
    if (!onBackRequest) return;
    onBackRequest.current = () => {
      if (keypadVisible) { dismissKeypad(); return true; }
      handleMinimize(); return true;
    };
    return () => { onBackRequest.current = null; };
  }, [keypadVisible, onBackRequest, handleMinimize]);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (persistMountedRef.current) lastSetLoggedAtRef.current = Date.now();
    else persistMountedRef.current = true;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => updateInProgressSession(exs), 400);
    return () => { if (persistTimer.current) clearTimeout(persistTimer.current); };
  }, [exs]);

  // Detect an abandoned session: a long gap since the last logged set on resume,
  // or the app being backgrounded for a long stretch mid-session.
  useEffect(() => {
    const la = resumeData?.lastActiveAt ?? resumeData?.startedAt;
    if (la && Date.now() - la > ABANDON_GAP_MS) sawLongGapRef.current = true;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        if (bgAtRef.current && Date.now() - bgAtRef.current > ABANDON_GAP_MS) sawLongGapRef.current = true;
        bgAtRef.current = null;
      } else if (bgAtRef.current == null) {
        bgAtRef.current = Date.now();
      }
    });
    return () => sub.remove();
  }, []);

  // Scroll the active SetEdit above the keypad whenever a set is opened for editing
  useEffect(() => {
    if (!editKey || !field) return;
    const timer = setTimeout(() => {
      activeEditRef.current?.measure((_x, _y, _w, h, _px, pageY) => {
        if (!h) return;
        const screenH = Dimensions.get('window').height;
        const keypadH = 340 + insets.bottom;
        const visibleBottom = screenH - keypadH;
        if (pageY + h > visibleBottom) {
          scrollRef.current?.scrollTo({
            y: scrollYRef.current + (pageY + h - visibleBottom) + 20,
            animated: true,
          });
        }
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [editKey, field]);

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
    openEx(exs[ei].id); setEditKey(ei + ':' + newIdx); setField('kg'); setFresh(true);
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
    setMenu(null);
  };

  const deleteEx = (ei: number) => {
    const removedId = exs[ei]?.id;
    setExs(prev => prev.filter((_: any, j: number) => j !== ei));
    if (removedId) setOpenIds(prev => { const next = new Set(prev); next.delete(removedId); return next; });
    setMenu(null); setEditKey(null);
  };

  const doAddEx = (name: string) => {
    const trimmed = name.trim(); if (!trimmed) return;
    const newEx = mkEx(trimmed, false);
    setExs(prev => [...prev, newEx]);
    openEx(newEx.id); setAddExOpen(false); setNewExName('');
    if (addToRoutine && routine) {
      saveRoutine({ ...routine, exercises: [...routine.exercises, trimmed] });
    }
  };

  const addEx = () => doAddEx(newExName);

  const swapEx = (ei: number, name: string) => {
    const nm = name.trim(); if (!nm) return;
    setExs(prev => prev.map((e: any, j: number) => j !== ei ? e : { ...e, name: nm, pb: seedPb[nm], swapped: true }));
    setSwap(null); setSwapQuery(''); openEx(exs[ei].id);
    toast({ icon: 'swap', msg: `Swapped to ${nm}` });
  };

  const totalVol = Math.round(exs.reduce((a: number, e: any) => a + e.sets.reduce((s: number, x: any) => s + x.reps * x.w, 0), 0));
  const totalSets = exs.reduce((a: number, e: any) => a + e.sets.length, 0);

  const clampFinish = (ms: number) => Math.min(Date.now(), Math.max(startRef.current, ms));
  const adjustFinish = (deltaMs: number) => setFinishAtMs(prev => clampFinish(prev + deltaMs));

  const fmtFinishLabel = (ms: number) => {
    const d = new Date(ms);
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const sameDay = new Date(startRef.current).toDateString() === d.toDateString();
    return sameDay ? time : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  };

  const useAdjustedFinish = gapDetected && earlyFinish;
  const finishDurationSec = useAdjustedFinish
    ? Math.max(0, Math.round((finishAtMs - startRef.current) / 1000))
    : elapsed;

  const openFinish = () => {
    const idle = Date.now() - lastSetLoggedAtRef.current > ABANDON_GAP_MS;
    const gap = idle || sawLongGapRef.current;
    setGapDetected(gap);
    setEarlyFinish(gap);
    if (gap) setFinishAtMs(clampFinish(lastSetLoggedAtRef.current));
    setFinish(true);
  };

  const doSave = () => {
    const exsKg = exs.filter((e: any) => e.sets.length).map((e: any) => ({
      id: e.id, name: e.name,
      sets: e.sets.map((s: any) => ({ reps: s.reps, kg: fmt.unit === 'kg' ? s.w : +(s.w / 2.20462).toFixed(1) }))
    }));
    const endedAt = useAdjustedFinish ? finishAtMs : Date.now();
    onSave({ id: uid(), routineId: routine?.id || null, routineName: routine?.name || 'Free Workout', startedAt: startRef.current, endedAt, durationSec: finishDurationSec, exercises: exsKg, notes });
    if (addPhoto) openPhysiqueCamera();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: t.line2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <IconBtn name="chevD" t={t} onPress={handleMinimize} color={t.mut} accessibilityLabel="Minimize workout" />
            <IconBtn name="x" t={t} onPress={() => setStopConfirm(true)} color={t.mut} accessibilityLabel="Stop workout" />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: t.text, letterSpacing: 0.1 }}>{routine?.name || 'Free Workout'}</Text>
            <Text style={{ fontSize: 12.5, color: t.limeInk, fontWeight: '700', marginTop: 1 }}>{fmtClock(elapsed)}</Text>
          </View>
          <Btn t={t} size="sm" onPress={openFinish} style={{ borderRadius: 12 }}>Finish</Btn>
        </View>
      </View>

      {/* Exercise list */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} scrollEnabled={scrollEnabled} contentContainerStyle={{ padding: 14, paddingBottom: keypadVisible ? 320 : 130, gap: 12 }} showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={e => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
        onScrollBeginDrag={() => { if (field) dismissKeypad(); }}>
        <SortableSessionList
          exs={exs} setExs={setExs}
          openIds={openIds} toggleOpen={toggleOpen}
          t={t} fmt={fmt}
          editKey={editKey} setEditKey={setEditKey}
          field={field}
          setField={(f: string | null) => { if (f === null) dismissKeypad(); else { setField(f); setFresh(true); } }}
          updateSet={updateSet} addSet={addSet} deleteSet={deleteSet}
          onMenu={(i: number) => setMenu(i)}
          setBests={setBests} activeEditRef={activeEditRef}
          onDragStart={() => setScrollEnabled(false)}
          onDragEnd={() => setScrollEnabled(true)}
        />
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
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0 }, keypadAnimStyle]}>
          <KeypadBar t={t} field={field} step={field === 'reps' ? 1 : fmt.step} onKey={onKey} onClose={dismissKeypad} />
        </Animated.View>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: t.surface2, borderRadius: 13, borderWidth: 1.5, borderColor: t.line, paddingHorizontal: 13, marginBottom: 8 }}>
          <Icon name="search" size={17} color={t.mut} sw={2} />
          <TextInput autoFocus value={swapQuery} onChangeText={setSwapQuery} onSubmitEditing={() => swapEx(swap!, swapQuery)}
            placeholder="Search or type an exercise…" placeholderTextColor={t.mut2}
            style={{ flex: 1, color: t.text, fontSize: 15.5, fontWeight: '700', paddingVertical: 13 }} />
        </View>
        <ExerciseSearchList
          results={swapResults}
          loading={swapLoading}
          query={swapQuery}
          onSelect={(n) => swapEx(swap!, n)}
          t={t}
        />
      </Sheet>

      {/* Add exercise */}
      <Sheet open={addExOpen} onClose={() => setAddExOpen(false)} t={t} title="Add exercise">
        <TextInput autoFocus value={newExName} onChangeText={setNewExName} onSubmitEditing={addEx}
          placeholder="e.g. Dumbbell Shrug" placeholderTextColor={t.mut2}
          style={{ padding: 15, borderRadius: 14, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface2, color: t.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }} />
        <ExerciseSearchList
          results={addExResults}
          loading={addExLoading}
          query={newExName}
          onSelect={(n) => doAddEx(n)}
          t={t}
        />
        {!newExName.trim() && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12, marginBottom: 16 }}>
            {['Dips', 'Lateral Raise', 'Hammer Curl', 'Pull-up'].map(s => (
              <Pressable key={s} onPress={() => setNewExName(s)} style={{ borderWidth: 1, borderColor: t.line, backgroundColor: t.surface2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: t.mut }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {routine && (
          <Pressable
            onPress={() => setAddToRoutine(v => !v)}
            accessibilityRole="checkbox"
            accessibilityLabel="Also add to routine"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 14, marginBottom: 4 }}
          >
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: addToRoutine ? t.lime : t.line, backgroundColor: addToRoutine ? t.lime : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {addToRoutine && <Icon name="check" size={13} color={t.onLime} sw={2.6} />}
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: t.text }}>Also add to <Text style={{ color: t.orange }}>{routine.name}</Text></Text>
          </Pressable>
        )}
        <View style={{ marginTop: 14 }}>
          <Btn t={t} full size="lg" onPress={addEx}>Add to session</Btn>
        </View>
        {!routine && (
          <Text style={{ fontSize: 12, color: t.mut2, textAlign: 'center', marginTop: 12 }}>Added to this session only, not the saved routine</Text>
        )}
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
        {gapDetected && (
          <View style={{ backgroundColor: t.elev, borderRadius: 16, borderWidth: 1, borderColor: t.line2, padding: 14, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <Icon name="clock" size={16} color={t.orange} sw={2} />
              <Text style={{ fontSize: 14.5, fontWeight: '800', color: t.text }}>Were you away?</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '500', color: t.mut, lineHeight: 18 }}>
              This session sat open for a while. Did you actually finish earlier than now?
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="I finished earlier" onPress={() => { setEarlyFinish(true); setFinishAtMs(clampFinish(lastSetLoggedAtRef.current)); }}
                style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: earlyFinish ? t.orange : t.surface2, borderWidth: 1, borderColor: earlyFinish ? t.orange : t.line }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: earlyFinish ? t.orangeInk : t.text }}>Finished earlier</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="I just finished now" onPress={() => setEarlyFinish(false)}
                style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: !earlyFinish ? t.orange : t.surface2, borderWidth: 1, borderColor: !earlyFinish ? t.orange : t.line }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: !earlyFinish ? t.orangeInk : t.text }}>Just now</Text>
              </Pressable>
            </View>
            {earlyFinish && (
              <View style={{ marginTop: 14, backgroundColor: t.surface2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.line }}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: t.mut2, letterSpacing: 0.4, textAlign: 'center', marginBottom: 8 }}>FINISHED AT</Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: t.text, letterSpacing: -0.5, textAlign: 'center', marginBottom: 12 }}>{fmtFinishLabel(finishAtMs)}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <StepRow label="HOUR" t={t} onMinus={() => adjustFinish(-3600000)} onPlus={() => adjustFinish(3600000)} />
                  <StepRow label="MIN" t={t} onMinus={() => adjustFinish(-60000)} onPlus={() => adjustFinish(60000)} />
                </View>
              </View>
            )}
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1 }}><Stat t={t} label="DURATION" value={fmtDur(finishDurationSec)} /></View>
          <View style={{ flex: 1 }}><Stat t={t} label="SETS" value={totalSets} /></View>
          <View style={{ flex: 1 }}><Stat t={t} label="VOLUME" value={totalVol.toLocaleString()} sub={fmt.wlabel} /></View>
        </View>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: t.mut2, letterSpacing: 0.4, marginBottom: 7 }}>SESSION NOTES</Text>
        <TextInput value={notes} onChangeText={v => setNotes(v.slice(0, 300))} placeholder="How did it feel? (optional)" placeholderTextColor={t.mut2} multiline
          style={{ minHeight: 70, padding: 13, borderRadius: 14, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface2, color: t.text, fontSize: 15, fontWeight: '500', marginBottom: 16, textAlignVertical: 'top' }} />
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: addPhoto }} accessibilityLabel="Add a progress photo after saving"
          onPress={() => setAddPhoto(v => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.line2, marginBottom: 16 }}>
          <Icon name="camera" size={20} color={t.orange} sw={2} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: t.text }}>Add progress photo</Text>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: t.mut }}>Capture your physique after saving</Text>
          </View>
          <Switch on={addPhoto} onChange={setAddPhoto} t={t} />
        </Pressable>
        <Btn t={t} variant="pop" full size="lg" onPress={doSave} icon="check">Save session</Btn>
        <View style={{ height: 10 }} />
        <Btn t={t} variant="ghost" full onPress={() => setFinish(false)}>Keep going</Btn>
      </Sheet>
    </View>
    </GestureHandlerRootView>
  );
}
