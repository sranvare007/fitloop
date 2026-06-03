import React, { useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context';
import { Btn, AppText as Text, AppTextInput as TextInput } from '../components/Shared';
import { Icon } from '../components/Icon';
import { Profile, Routine, uid, ROUTINE_COLORS } from '../data';

function LoopMark({ size = 96, orange, lime, elev }: { size: number; orange: string; lime: string; elev: string }) {
  const r = size / 2 - 8, c = size / 2, C = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} fill="none" stroke={elev} strokeWidth="9" />
      <Circle cx={c} cy={c} r={r} fill="none" stroke={orange} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${C * 0.62} ${C}`} rotation={-90} origin={`${c},${c}`} />
      <Circle cx={c} cy={c} r={r} fill="none" stroke={lime} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${C * 0.22} ${C}`} strokeDashoffset={`${-C * 0.66}`} rotation={-90} origin={`${c},${c}`} />
    </Svg>
  );
}

function OnbInput({ t, label, val, set, unit, mode = 'text', placeholder, flex }: any) {
  return (
    <View style={{ marginBottom: 14, flex }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut2, letterSpacing: 0.4, marginBottom: 7 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, borderRadius: 14, borderWidth: 1.5, borderColor: t.line, paddingHorizontal: 15 }}>
        <TextInput
          value={val} onChangeText={mode === 'num' ? (v: string) => set(v.replace(/[^0-9.]/g, '')) : set}
          keyboardType={mode === 'num' ? 'decimal-pad' : 'default'}
          placeholder={placeholder} placeholderTextColor={t.mut2}
          style={{ flex: 1, color: t.text, fontSize: 16, fontWeight: '700', paddingVertical: 15, minWidth: 0 }}
        />
        {unit && <Text style={{ fontSize: 13.5, color: t.mut, fontWeight: '700' }}>{unit}</Text>}
      </View>
    </View>
  );
}

function RoutineBuilder({ t, onSave, onCancel }: { t: any; onSave: (r: Routine) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [exs, setExs] = useState<{ id: string; name: string }[]>([]);
  const [days, setDays] = useState<Set<number>>(new Set());
  const [input, setInput] = useState('');
  const color = ROUTINE_COLORS[Math.floor(Math.random() * ROUTINE_COLORS.length)];
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const addEx = () => { if (input.trim()) { setExs([...exs, { id: uid(), name: input.trim() }]); setInput(''); } };
  const canSave = name.trim() && exs.length > 0;

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 26, fontWeight: '800', color: t.text, letterSpacing: -0.5, marginBottom: 18 }}>Build a routine</Text>
      <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut2, letterSpacing: 0.5, marginBottom: 9 }}>ROUTINE NAME</Text>
      <TextInput value={name} onChangeText={setName} placeholder="e.g. Push Day" placeholderTextColor={t.mut2}
        style={{ padding: 14, backgroundColor: t.surface, borderRadius: 13, borderWidth: 1.5, borderColor: t.line, color: t.text, fontSize: 15.5, fontWeight: '700', marginBottom: 20 }} />

      <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut2, letterSpacing: 0.5, marginBottom: 9 }}>EXERCISES</Text>
      {exs.map((e, i) => (
        <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: t.surface, borderRadius: 13, padding: 11, marginBottom: 7, borderWidth: 1, borderColor: t.line2 }}>
          <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut }}>{i + 1}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 15.5, fontWeight: '700', color: t.text }}>{e.name}</Text>
          <Pressable onPress={() => setExs(exs.filter(x => x.id !== e.id))}>
            <Icon name="x" size={16} color={t.mut2} sw={2.2} />
          </Pressable>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        <TextInput value={input} onChangeText={setInput} onSubmitEditing={addEx} placeholder="Add an exercise…" placeholderTextColor={t.mut2} returnKeyType="done"
          style={{ flex: 1, padding: 14, backgroundColor: t.surface, borderRadius: 13, borderWidth: 1.5, borderColor: t.line, color: t.text, fontSize: 15.5, fontWeight: '700' }} />
        <Pressable onPress={addEx} style={{ width: 50, borderRadius: 13, backgroundColor: input.trim() ? t.orange : t.elev, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={22} color={input.trim() ? t.orangeInk : t.mut2} sw={2.6} />
        </Pressable>
      </View>

      <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut2, letterSpacing: 0.5, marginBottom: 9 }}>ASSIGN TO DAYS</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
        {DAY_ORDER.map((d) => {
          const on = days.has(d);
          return (
            <Pressable key={d} onPress={() => { const n = new Set(days); n.has(d) ? n.delete(d) : n.add(d); setDays(n); }}
              style={{ flex: 1, height: 46, borderRadius: 13, borderWidth: on ? 0 : 1.5, borderColor: t.line, backgroundColor: on ? t.lime : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '800', fontSize: 13.5, color: on ? t.onLime : t.mut }}>{DAY_LABELS[d]}</Text>
            </Pressable>
          );
        })}
      </View>

      <Btn t={t} variant="pop" full size="lg" onPress={() => canSave && onSave({ id: uid(), name: name.trim(), exercises: exs.map(e => e.name), days: [...days], color })} disabled={!canSave}>
        Save routine
      </Btn>
      <View style={{ height: 10 }} />
      <Btn t={t} variant="ghost" full onPress={onCancel}>Cancel</Btn>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

export function OnboardingScreen() {
  const { t, fmt, setUnit, completeOnboarding } = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [building, setBuilding] = useState(false);

  const validProfile = name.trim().length >= 1 && +age >= 13 && +age <= 100 && gender && +height > 0 && +weight > 0;

  const finish = () => {
    const profile: Profile = {
      name: name.trim() || 'Athlete', age: +age || 18, gender: gender || 'PREFER_NOT_TO_SAY',
      heightCm: +height || 170, weightKg: fmt.unit === 'kg' ? (+weight || 70) : (+weight || 154) / 2.20462,
    };
    completeOnboarding(profile, routines);
  };

  const dots = (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', paddingBottom: 12 }}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 99, backgroundColor: i === step ? t.orange : t.elev2 }} />
      ))}
    </View>
  );

  const shell = (content: React.ReactNode, footer?: React.ReactNode) => (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: insets.top + 16 }}>{dots}</View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {content}
        {!footer && <View style={{ height: 20 }} />}
      </ScrollView>
      {footer && (
        <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20, backgroundColor: t.bg }}>
          {footer}
        </View>
      )}
    </View>
  );

  if (step === 0) return shell(
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
      <LoopMark size={104} orange={t.orange} lime={t.lime} elev={t.elev} />
      <Text style={{ fontSize: 44, fontWeight: '800', color: t.text, letterSpacing: -1.2, marginTop: 26 }}>FitLoop</Text>
      <Text style={{ fontSize: 17, color: t.mut, fontWeight: '600', marginTop: 10, textAlign: 'center', lineHeight: 26 }}>
        Track lifts. See progress.{'\n'}Stay consistent.
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 22 }}>
        {['Offline-first', 'No account', 'Private'].map(x => (
          <View key={x} style={{ backgroundColor: t.elev, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: t.mut }}>{x}</Text>
          </View>
        ))}
      </View>
    </View>,
    <Btn t={t} full size="lg" onPress={() => setStep(1)} style={{ borderRadius: 16 }}>Get started</Btn>
  );

  if (step === 1) return shell(
    <View>
      <Text style={{ fontSize: 30, fontWeight: '800', color: t.text, letterSpacing: -0.6, marginBottom: 6 }}>About you</Text>
      <Text style={{ fontSize: 14.5, color: t.mut, fontWeight: '600', marginBottom: 22, lineHeight: 22 }}>We use this to personalise your stats. It never leaves your device.</Text>
      <OnbInput t={t} label="NAME" val={name} set={setName} placeholder="Your name" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <OnbInput t={t} label="AGE" val={age} set={setAge} unit="yrs" mode="num" placeholder="—" flex={1} />
        <OnbInput t={t} label="HEIGHT" val={height} set={setHeight} unit="cm" mode="num" placeholder="—" flex={1} />
      </View>
      <View style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut2, letterSpacing: 0.4 }}>WEIGHT</Text>
          <View style={{ flexDirection: 'row', backgroundColor: t.elev, borderRadius: 9, padding: 2 }}>
            {(['kg', 'lbs'] as const).map(u => (
              <Pressable key={u} onPress={() => setUnit(u)} style={{ borderRadius: 7, paddingVertical: 4, paddingHorizontal: 11, backgroundColor: fmt.unit === u ? t.surface : 'transparent' }}>
                <Text style={{ fontWeight: '800', fontSize: 12.5, color: fmt.unit === u ? t.text : t.mut }}>{u}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, borderRadius: 14, borderWidth: 1.5, borderColor: t.line, paddingHorizontal: 15 }}>
          <TextInput value={weight} onChangeText={v => setWeight(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={t.mut2}
            style={{ flex: 1, color: t.text, fontSize: 16, fontWeight: '700', paddingVertical: 15 }} />
          <Text style={{ fontSize: 13.5, color: t.mut, fontWeight: '700' }}>{fmt.wlabel}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut2, letterSpacing: 0.4, marginBottom: 8 }}>GENDER</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 20 }}>
        {([['MALE', 'Male'], ['FEMALE', 'Female'], ['OTHER', 'Other'], ['PREFER_NOT_TO_SAY', 'Prefer not to say']] as [string, string][]).map(([v, l]) => (
          <Pressable key={v} onPress={() => setGender(v)} style={{ borderWidth: gender === v ? 0 : 1.5, borderColor: t.line, backgroundColor: gender === v ? t.lime : 'transparent', paddingVertical: 11, paddingHorizontal: 15, borderRadius: 12 }}>
            <Text style={{ fontWeight: '800', fontSize: 13.5, color: gender === v ? t.onLime : t.mut }}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </View>,
    <Btn t={t} full size="lg" onPress={() => validProfile && setStep(2)} style={{ borderRadius: 16, opacity: validProfile ? 1 : 0.4 }}>Continue</Btn>
  );

  if (step === 2) {
    if (building) return shell(
      <RoutineBuilder t={t} onSave={(r) => { setRoutines([...routines, r]); setBuilding(false); }} onCancel={() => setBuilding(false)} />
    );
    return shell(
      <View>
        <Text style={{ fontSize: 30, fontWeight: '800', color: t.text, letterSpacing: -0.6, marginBottom: 6 }}>Your routines</Text>
        <Text style={{ fontSize: 14.5, color: t.mut, fontWeight: '600', marginBottom: 22, lineHeight: 22 }}>Create a weekly split — like Push, Pull, Legs. You can always do this later.</Text>
        {routines.map(r => (
          <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: t.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: t.line2 }}>
            <View style={{ width: 10, height: 10, borderRadius: 99, backgroundColor: r.color }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: t.text }}>{r.name}</Text>
              <Text style={{ fontSize: 12.5, color: t.mut, fontWeight: '600', marginTop: 1 }}>{r.exercises.length} exercises</Text>
            </View>
            <Icon name="check" size={20} color={t.limeInk} sw={2.6} />
          </View>
        ))}
        <Pressable onPress={() => setBuilding(true)} style={{ padding: 15, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          <Icon name="plus" size={18} color={t.orange} sw={2.6} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: t.text }}>{routines.length ? 'Add another routine' : 'Create your first routine'}</Text>
        </Pressable>
      </View>,
      <Btn t={t} full size="lg" onPress={() => setStep(3)} style={{ borderRadius: 16 }}>{routines.length ? 'Continue' : 'Skip for now'}</Btn>
    );
  }

  // Step 3 — Ready
  return shell(
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
      <View style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: t.lime, alignItems: 'center', justifyContent: 'center', shadowColor: t.lime, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.4, shadowRadius: 40 }}>
        <Icon name="check" size={48} color={t.onLime} sw={3} />
      </View>
      <Text style={{ fontSize: 32, fontWeight: '800', color: t.text, letterSpacing: -0.8, marginTop: 26 }}>
        You&apos;re all set{name ? `, ${name.split(' ')[0]}` : ''}!
      </Text>
      <Text style={{ fontSize: 15.5, color: t.mut, fontWeight: '600', marginTop: 10, textAlign: 'center', lineHeight: 24 }}>
        {routines.length ? `${routines.length} routine${routines.length > 1 ? 's' : ''} ready. Time to log your first session.` : "Jump in whenever you're ready to lift."}
      </Text>
    </View>,
    <Btn t={t} variant="pop" full size="lg" onPress={finish} style={{ borderRadius: 16 }} icon="bolt">Start tracking</Btn>
  );
}
