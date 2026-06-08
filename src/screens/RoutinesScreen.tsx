import React, { useState, useEffect } from 'react';
import { View, Pressable, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { useApp } from '../context';
import { Btn, IconBtn, Chip, Sheet, MenuRow, ExerciseSearchList, AppText as Text, AppTextInput as TextInput } from '../components/Shared';
import { useExerciseSearch } from '../hooks';
import { Icon, DotsMenu } from '../components/Icon';
import { Routine, dayLabel, uid, ROUTINE_COLORS, DAYS } from '../data';

const GAP = 7;
const ROW_H = 50;
const CELL_H = ROW_H + GAP;
const GRIP_HIT = 44; // px from left edge that counts as grip area

type ExItem = { id: string; name: string };

// Top-level so it never remounts between renders of SortableExerciseList
function ExRow({ item, index, isDragging, isGhost, t, editingId, editingName, setEditingName, startEdit, confirmEdit, removeEx }: any) {
  const isEditing = !isGhost && editingId === item.id;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 9, height: ROW_H,
      backgroundColor: isEditing ? t.surface2 : t.surface,
      borderRadius: 13, paddingHorizontal: 11,
      borderWidth: 1, borderColor: isEditing ? t.line : t.line2,
      opacity: isDragging ? 0 : 1,
    }}>
      <View style={{ padding: 4 }}>
        <Icon name="grip" size={18} color={isEditing ? t.mut2 : t.mut} sw={2} />
      </View>
      <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut }}>{index + 1}</Text>
      </View>
      {isEditing ? (
        <TextInput
          value={editingName}
          onChangeText={setEditingName}
          onSubmitEditing={() => confirmEdit(item.id)}
          autoFocus
          returnKeyType="done"
          style={{ flex: 1, color: t.text, fontWeight: '700', fontSize: 15.5, padding: 0 }}
        />
      ) : (
        <Pressable onPress={() => startEdit(item.id, item.name)} style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '700', color: t.text }}>{item.name}</Text>
        </Pressable>
      )}
      {isEditing && (
        <Pressable onPress={() => confirmEdit(item.id)} style={{ padding: 4 }}>
          <Icon name="check" size={17} color={t.limeInk} sw={2.6} />
        </Pressable>
      )}
      {!isGhost && (
        <Pressable onPress={() => removeEx(item.id)} style={{ padding: 4 }}>
          <Icon name="x" size={16} color={t.mut2} sw={2.2} />
        </Pressable>
      )}
    </View>
  );
}

function SortableExerciseList({ exs, setExs, t, editingId, startEdit, confirmEdit, editingName, setEditingName, removeEx, onDragStart, onDragEnd }: any) {
  const [draggingIdx, setDraggingIdx] = useState(-1);
  const ghostY = useSharedValue(0);
  const activeIdx = useSharedValue(-1);
  const itemCount = useSharedValue(exs.length);

  useEffect(() => { itemCount.value = exs.length; }, [exs.length]);

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
    setExs((prev: ExItem[]) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  // Single stable gesture on the whole list — no per-item recreations.
  // Uses e.y (relative to this view) so the calc stays correct even after
  // the outer ScrollView has been scrolled (absoluteY would be stale).
  const gesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart((e) => {
      'worklet';
      if (e.x > GRIP_HIT) return; // only grip handle column activates drag
      const idx = Math.floor(e.y / CELL_H);
      if (idx < 0 || idx >= itemCount.value) return;
      activeIdx.value = idx;
      ghostY.value = idx * CELL_H;
      runOnJS(beginDrag)(idx);
    })
    .onUpdate((e) => {
      'worklet';
      if (activeIdx.value < 0) return;
      ghostY.value = Math.max(0, Math.min(e.y - ROW_H / 2, (itemCount.value - 1) * CELL_H));
      const target = Math.max(0, Math.min(Math.round(e.y / CELL_H), itemCount.value - 1));
      if (target !== activeIdx.value) {
        runOnJS(commitSwap)(activeIdx.value, target);
        activeIdx.value = target;
      }
    })
    .onEnd(() => {
      'worklet';
      if (activeIdx.value < 0) return;
      ghostY.value = withSpring(activeIdx.value * CELL_H, { damping: 20, stiffness: 300 });
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
      <View style={{ marginBottom: 10, position: 'relative' }}>
        {exs.map((e: ExItem, i: number) => (
          <View key={e.id} style={{ marginBottom: i < exs.length - 1 ? GAP : 0 }}>
            <ExRow
              item={e} index={i} isDragging={draggingIdx === i}
              t={t} editingId={editingId} editingName={editingName}
              setEditingName={setEditingName} startEdit={startEdit}
              confirmEdit={confirmEdit} removeEx={removeEx}
            />
          </View>
        ))}
        {draggingItem !== null && (
          <Animated.View style={ghostStyle} pointerEvents="none">
            <ExRow item={draggingItem} index={draggingIdx} isDragging={false} isGhost t={t} />
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

function inputStyle(t: any) {
  return { padding: 14, borderRadius: 13, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface, color: t.text, fontSize: 15.5, fontWeight: '700' as const };
}

export function RoutineEditor({ routine, onSave, onDelete, onClose, embedded }: {
  routine?: Routine | null;
  onSave: (r: Routine) => void;
  onDelete?: (id: string) => void;
  onClose?: () => void;
  embedded?: boolean;
}) {
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(routine?.name || '');
  const [exs, setExs] = useState<{ id: string; name: string }[]>((routine?.exercises || []).map(e => ({ id: uid(), name: e })));
  const [days, setDays] = useState<Set<number>>(new Set(routine?.days || []));
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [outerScrollEnabled, setOuterScrollEnabled] = useState(true);
  const color = routine?.color || ROUTINE_COLORS[Math.floor(Math.random() * ROUTINE_COLORS.length)];
  const { results: exResults, loading: exLoading } = useExerciseSearch(input);
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const addExercise = (nm?: string) => {
    const v = (nm || input).trim();
    if (!v) return;
    setExs([...exs, { id: uid(), name: v }]);
    setInput('');
  };
  const removeEx = (id: string) => { setExs(exs.filter(e => e.id !== id)); if (editingId === id) setEditingId(null); };
  const startEdit = (id: string, currentName: string) => { setEditingId(id); setEditingName(currentName); };
  const confirmEdit = (id: string) => {
    const v = editingName.trim();
    if (v) setExs(exs.map(e => e.id === id ? { ...e, name: v } : e));
    setEditingId(null);
  };
  const toggleDay = (d: number) => { const n = new Set(days); n.has(d) ? n.delete(d) : n.add(d); setDays(n); };
  const canSave = name.trim() && exs.length > 0;
  const save = () => canSave && onSave({ id: routine?.id || uid(), name: name.trim(), exercises: exs.map(e => e.name), days: [...days], color });

  const body = (
    <ScrollView scrollEnabled={outerScrollEnabled} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Name */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut2, letterSpacing: 0.5, marginBottom: 9 }}>ROUTINE NAME</Text>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Push Day" placeholderTextColor={t.mut2} style={[inputStyle(t), { width: '100%' }]} />
      </View>
      {/* Exercises */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut2, letterSpacing: 0.5, marginBottom: 9 }}>
          EXERCISES <Text style={{ color: t.mut2 }}>· {exs.length}</Text>
        </Text>
        <SortableExerciseList
          exs={exs}
          setExs={setExs}
          t={t}
          editingId={editingId}
          startEdit={startEdit}
          confirmEdit={confirmEdit}
          editingName={editingName}
          setEditingName={setEditingName}
          removeEx={removeEx}
          onDragStart={() => setOuterScrollEnabled(false)}
          onDragEnd={() => setOuterScrollEnabled(true)}
        />
        <View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={input} onChangeText={setInput} onSubmitEditing={() => addExercise()} placeholder="Add an exercise…" placeholderTextColor={t.mut2} returnKeyType="done"
              style={[inputStyle(t), { flex: 1 }]} />
            <Pressable onPress={() => addExercise()} style={{ width: 50, borderRadius: 13, backgroundColor: input.trim() ? t.orange : t.elev, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={22} color={input.trim() ? t.orangeInk : t.mut2} sw={2.6} />
            </Pressable>
          </View>
          <ExerciseSearchList results={exResults} loading={exLoading} query={input} onSelect={(n) => addExercise(n)} t={t} />
        </View>
      </View>
      {/* Days */}
      <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut2, letterSpacing: 0.5, marginBottom: 9 }}>ASSIGN TO DAYS</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {DAY_ORDER.map(d => {
            const on = days.has(d);
            return (
              <Pressable key={d} onPress={() => toggleDay(d)} style={{ flex: 1, height: 46, borderRadius: 13, borderWidth: on ? 0 : 1.5, borderColor: t.line, backgroundColor: on ? t.lime : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 13.5, color: on ? t.onLime : t.mut }}>{DAYS[d][0]}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontSize: 12.5, color: t.mut2, marginTop: 8, fontWeight: '600' }}>{dayLabel([...days])}</Text>
      </View>

      {!embedded && routine && onDelete && (
        <Pressable onPress={() => onDelete(routine.id)} style={{ marginTop: 8, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: t.danger, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="trash" size={17} color={t.danger} sw={2} />
          <Text style={{ fontWeight: '800', fontSize: 15, color: t.danger }}>Delete routine</Text>
        </Pressable>
      )}

      {embedded && (
        <View style={{ marginTop: 6, marginBottom: 20 }}>
          <Btn t={t} variant="pop" full size="lg" onPress={save} disabled={!canSave}>Save routine</Btn>
        </View>
      )}
    </ScrollView>
  );

  if (embedded) return <View>{body}</View>;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      {/* GestureHandlerRootView is required inside Modal — Modal creates a new
          native view hierarchy that sits outside the app-root GestureHandlerRootView,
          so RNGH gestures are silently ignored without this wrapper. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ paddingTop: insets.top }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: t.line2 }}>
              <Pressable onPress={onClose}>
                <Text style={{ color: t.mut, fontWeight: '700', fontSize: 15.5 }}>Cancel</Text>
              </Pressable>
              <Text style={{ fontSize: 16.5, fontWeight: '800', color: t.text }}>{routine ? 'Edit routine' : 'New routine'}</Text>
              <Pressable onPress={save} disabled={!canSave}>
                <Text style={{ color: canSave ? t.orange : t.mut2, fontWeight: '800', fontSize: 15.5 }}>Save</Text>
              </Pressable>
            </View>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 20, paddingBottom: insets.bottom + 20 }}>
            {body}
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

export function RoutinesScreen() {
  const { t, state, editRoutine, deleteRoutine, startSession } = useApp();
  const [menu, setMenu] = useState<Routine | null>(null);

  if (state.routines.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: t.line2 }}>
          <Icon name="dumbbell" size={30} color={t.mut} sw={2} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: t.text }}>No routines yet</Text>
        <Text style={{ fontSize: 14.5, color: t.mut, fontWeight: '600', marginTop: 8, maxWidth: 250, lineHeight: 22, textAlign: 'center' }}>Build your first split — Push, Pull, Legs, or your own.</Text>
        <View style={{ marginTop: 20, width: '100%', maxWidth: 240 }}>
          <Btn t={t} full size="lg" onPress={() => editRoutine(null)} icon="plus">Create routine</Btn>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: t.text, letterSpacing: -0.6 }}>Routines</Text>
        <IconBtn name="plus" t={t} onPress={() => editRoutine(null)} bg={t.orange} color={t.orangeInk} sw={2.6} size={42} />
      </View>
      <View style={{ gap: 11 }}>
        {state.routines.map(r => (
          <View key={r.id} style={{ backgroundColor: t.surface, borderRadius: 20, borderWidth: 1, borderColor: t.line2, overflow: 'hidden' }}>
            <Pressable onPress={() => editRoutine(r)} style={({ pressed }) => [{ padding: 16, opacity: pressed ? 0.9 : 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 99, backgroundColor: r.color }} />
                <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: t.text, letterSpacing: -0.3 }}>{r.name}</Text>
                <Pressable onPress={e => setMenu(r)} style={{ padding: 6 }}>
                  <DotsMenu color={t.mut2} />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11, marginLeft: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.elev, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8 }}>
                  <Icon name="calendar" size={11} color={t.mut} sw={2} />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut }}>{dayLabel(r.days)}</Text>
                </View>
                <Text style={{ fontSize: 12.5, color: t.mut, fontWeight: '700' }}>{r.exercises.length} exercises</Text>
              </View>
            </Pressable>
          </View>
        ))}
      </View>

      <Sheet open={!!menu} onClose={() => setMenu(null)} t={t} title={menu?.name}>
        <View style={{ gap: 8 }}>
          <MenuRow t={t} icon="play" label="Start this workout" onPress={() => { if (menu) startSession(menu); setMenu(null); }} />
          <MenuRow t={t} icon="pencil" label="Edit routine" onPress={() => { if (menu) editRoutine(menu); setMenu(null); }} />
          <MenuRow t={t} icon="trash" label="Delete routine" danger onPress={() => { if (menu) deleteRoutine(menu.id); setMenu(null); }} />
        </View>
      </Sheet>
    </ScrollView>
  );
}
