import React, { useState } from 'react';
import { View, Pressable, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context';
import { Btn, IconBtn, Chip, Sheet, MenuRow, AppText as Text, AppTextInput as TextInput } from '../components/Shared';
import { Icon, DotsMenu } from '../components/Icon';
import { Routine, dayLabel, uid, ROUTINE_COLORS, DAYS } from '../data';

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
  const color = routine?.color || ROUTINE_COLORS[Math.floor(Math.random() * ROUTINE_COLORS.length)];
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const addExercise = (nm?: string) => {
    const v = (nm || input).trim();
    if (!v) return;
    setExs([...exs, { id: uid(), name: v }]);
    setInput('');
  };
  const removeEx = (id: string) => setExs(exs.filter(e => e.id !== id));
  const toggleDay = (d: number) => { const n = new Set(days); n.has(d) ? n.delete(d) : n.add(d); setDays(n); };
  const canSave = name.trim() && exs.length > 0;
  const save = () => canSave && onSave({ id: routine?.id || uid(), name: name.trim(), exercises: exs.map(e => e.name), days: [...days], color });

  const body = (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
        <View style={{ gap: 7, marginBottom: 10 }}>
          {exs.map((e, i) => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: t.surface, borderRadius: 13, padding: 11, borderWidth: 1, borderColor: t.line2 }}>
              <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 15.5, fontWeight: '700', color: t.text }}>{e.name}</Text>
              <Pressable onPress={() => removeEx(e.id)} style={{ padding: 4 }}>
                <Icon name="x" size={16} color={t.mut2} sw={2.2} />
              </Pressable>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={input} onChangeText={setInput} onSubmitEditing={() => addExercise()} placeholder="Add an exercise…" placeholderTextColor={t.mut2} returnKeyType="done"
            style={[inputStyle(t), { flex: 1 }]} />
          <Pressable onPress={() => addExercise()} style={{ width: 50, borderRadius: 13, backgroundColor: input.trim() ? t.orange : t.elev, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={22} color={input.trim() ? t.orangeInk : t.mut2} sw={2.6} />
          </Pressable>
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
      <View style={{ flex: 1, backgroundColor: t.bg }}>
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
      </View>
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
