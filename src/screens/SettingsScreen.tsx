import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useApp } from '../context';
import { Btn, Chip, Sheet, Segmented, Switch, AppText as Text, AppTextInput as TextInput } from '../components/Shared';
import { Icon } from '../components/Icon';
import { Profile, LB } from '../data';
import { ACCENT_OPTIONS, POP_OPTIONS } from '../theme';

function Row({ t, icon, iconBg, title, sub, right, onPress, danger, last }: any) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 16, opacity: pressed ? 0.7 : 1, position: 'relative' }]}>
      {icon && (
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: iconBg || t.elev, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={18} color={danger ? t.danger : t.text} sw={2} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15.5, fontWeight: '700', color: danger ? t.danger : t.text }}>{title}</Text>
        {sub && <Text style={{ fontSize: 12.5, color: t.mut, fontWeight: '600', marginTop: 1 }}>{sub}</Text>}
      </View>
      {right}
      {!last && <View style={{ position: 'absolute', left: icon ? 63 : 16, right: 0, bottom: 0, height: 1, backgroundColor: t.line2 }} />}
    </Pressable>
  );
}

function Group({ t, header, children }: any) {
  return (
    <View style={{ marginBottom: 20 }}>
      {header && <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut2, letterSpacing: 0.5, marginLeft: 4, marginBottom: 9 }}>{header}</Text>}
      <View style={{ backgroundColor: t.surface, borderRadius: 18, borderWidth: 1, borderColor: t.line2, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

function Swatches({ t, label, desc, options, value, onChange }: any) {
  const current = options.find((o: any) => o.hex === value);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Text style={{ fontSize: 15.5, fontWeight: '700', color: t.text }}>{label}</Text>
          {current && <View style={{ backgroundColor: `${value}2a`, paddingVertical: 2, paddingHorizontal: 9, borderRadius: 7 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: value }}>{current.name}</Text>
          </View>}
        </View>
        <Text style={{ fontSize: 11.5, color: t.mut2, fontWeight: '600' }}>{desc}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 11, flexWrap: 'wrap' }}>
        {options.map((o: any) => {
          const on = o.hex === value;
          return (
            <Pressable key={o.hex} onPress={() => onChange(o.hex)} style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: o.hex, shadowColor: on ? o.hex : 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: on ? 1 : 0, shadowRadius: on ? 6 : 0, elevation: on ? 4 : 0, alignItems: 'center', justifyContent: 'center' }}>
              {on && <Icon name="check" size={19} color="#0C0D10" sw={3} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ProfileForm({ t, fmt, profile, onSave }: { t: any; fmt: any; profile: Profile; onSave: (p: Profile) => void }) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(String(profile.age));
  const [gender, setGender] = useState(profile.gender);
  const [height, setHeight] = useState(String(Math.round(profile.heightCm)));
  const [weight, setWeight] = useState(String(fmt.w(profile.weightKg)));

  const fld = (label: string, val: string, set: (v: string) => void, unit?: string, mode = 'text') => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut2, letterSpacing: 0.4, marginBottom: 7 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface2, borderRadius: 13, borderWidth: 1.5, borderColor: t.line, paddingHorizontal: 14 }}>
        <TextInput value={val} onChangeText={mode === 'num' ? (v: string) => set(v.replace(/[^0-9.]/g, '')) : set}
          keyboardType={mode === 'num' ? 'decimal-pad' : 'default'}
          style={{ flex: 1, color: t.text, fontWeight: '700', fontSize: 16, paddingVertical: 14 }} />
        {unit && <Text style={{ fontSize: 13, color: t.mut, fontWeight: '700' }}>{unit}</Text>}
      </View>
    </View>
  );

  return (
    <View>
      {fld('NAME', name, setName)}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>{fld('AGE', age, setAge, 'yrs', 'num')}</View>
        <View style={{ flex: 1 }}>{fld('HEIGHT', height, setHeight, 'cm', 'num')}</View>
      </View>
      {fld('WEIGHT', weight, setWeight, fmt.wlabel, 'num')}
      <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut2, letterSpacing: 0.4, marginBottom: 7 }}>GENDER</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
        {([['MALE','Male'],['FEMALE','Female'],['OTHER','Other'],['PREFER_NOT_TO_SAY','Prefer not to say']] as [string,string][]).map(([v, l]) => (
          <Pressable key={v} onPress={() => setGender(v)} style={{ borderWidth: gender === v ? 0 : 1.5, borderColor: t.line, backgroundColor: gender === v ? t.lime : 'transparent', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 }}>
            <Text style={{ fontWeight: '800', fontSize: 13.5, color: gender === v ? t.onLime : t.mut }}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <Btn t={t} variant="pop" full size="lg" onPress={() => onSave({
        name: name.trim() || 'Athlete', age: +age || 18, gender, heightCm: +height || 170,
        weightKg: fmt.unit === 'kg' ? (+weight || 70) : (+weight || 154) / LB,
      })}>Save profile</Btn>
    </View>
  );
}

export function SettingsScreen() {
  const { t, fmt, state, setUnit, themeName, setTheme, accent, pop, setAccent, setPop, replayOnboarding, clearData, updateProfile, exportData, importData, toast } = useApp();
  const [editProfile, setEditProfile] = useState(false);
  const [clearStep, setClearStep] = useState(0);
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    setImporting(true);
    const result = await importData();
    setImporting(false);
    if (result) {
      const total = result.routines + result.sessions + result.measurements;
      toast({ icon: 'check', msg: total > 0 ? `Imported ${total} item${total === 1 ? '' : 's'}` : 'Nothing new to import' });
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 30, fontWeight: '800', color: t.text, letterSpacing: -0.6, marginBottom: 18 }}>Settings</Text>

      {/* Profile card */}
      <Pressable onPress={() => setEditProfile(true)} style={({ pressed }) => [{ backgroundColor: t.surface, borderRadius: 20, borderWidth: 1, borderColor: t.line2, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20, opacity: pressed ? 0.9 : 1 }]}>
        <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: t.orange }}>{state.profile.name[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: t.text }}>{state.profile.name}</Text>
          <Text style={{ fontSize: 13, color: t.mut, fontWeight: '600', marginTop: 2 }}>{state.profile.age} · {Math.round(state.profile.heightCm)} cm · {fmt.w(state.profile.weightKg)} {fmt.wlabel}</Text>
        </View>
        <Icon name="chevR" size={18} color={t.mut2} sw={2.2} />
      </Pressable>

      <Group t={t} header="PREFERENCES">
        <View style={{ padding: 13, borderBottomWidth: 1, borderBottomColor: t.line2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 11 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="dumbbell" size={18} color={t.text} sw={2} />
            </View>
            <Text style={{ flex: 1, fontSize: 15.5, fontWeight: '700', color: t.text }}>Weight unit</Text>
          </View>
          <Segmented t={t} options={[{ value: 'kg', label: 'Kilograms (kg)' }, { value: 'lbs', label: 'Pounds (lbs)' }]} value={fmt.unit} onChange={(v) => setUnit(v as 'kg' | 'lbs')} />
        </View>
        <View style={{ padding: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 11 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={t.name === 'dark' ? 'moon' : 'sun'} size={18} color={t.text} sw={2} />
            </View>
            <Text style={{ flex: 1, fontSize: 15.5, fontWeight: '700', color: t.text }}>Appearance</Text>
          </View>
          <Segmented t={t} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]} value={themeName} onChange={setTheme} />
        </View>
      </Group>

      <Group t={t} header="THEME COLOR">
        <View style={{ padding: 14 }}>
          <Swatches t={t} label="Accent" desc="Buttons & primary actions" options={ACCENT_OPTIONS} value={accent} onChange={setAccent} />
        </View>
        <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: t.line2 }}>
          <Swatches t={t} label="Highlight" desc="Progress, PRs & checkmarks" options={POP_OPTIONS} value={pop} onChange={setPop} />
        </View>
      </Group>

      <Group t={t} header="ACCOUNT">
        <Row t={t} icon="user" title="Cloud sync" sub="Back up & sync across devices" last
          right={<View style={{ backgroundColor: `${t.orange}22`, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 7 }}><Text style={{ fontSize: 12, fontWeight: '800', color: t.orange }}>SOON</Text></View>} />
      </Group>

      <Group t={t} header="DATA">
        <Row t={t} icon="upload" title="Export data" sub="Share routines & history as a backup file" onPress={exportData} right={<Icon name="chevR" size={18} color={t.mut2} sw={2.2} />} />
        <Row t={t} icon="download" title="Import data" sub="Restore from a backup file" onPress={importing ? undefined : handleImport}
          right={importing
            ? <Text style={{ fontSize: 13, color: t.mut, fontWeight: '600' }}>Loading…</Text>
            : <Icon name="chevR" size={18} color={t.mut2} sw={2.2} />} />
        <Row t={t} icon="play" title="Replay onboarding" onPress={replayOnboarding} right={<Icon name="chevR" size={18} color={t.mut2} sw={2.2} />} />
        <Row t={t} icon="trash" title="Clear all data" sub="Wipes everything on this device" danger last onPress={() => setClearStep(1)} right={<Icon name="chevR" size={18} color={t.danger} sw={2.2} />} />
      </Group>

      <Group t={t} header="ABOUT">
        <Row t={t} icon="info" title="Version" right={<Text style={{ fontSize: 14, color: t.mut, fontWeight: '600' }}>1.0.0</Text>} />
        <Row t={t} icon="drop" title="Privacy" sub="All data stays on your device" right={<Icon name="chevR" size={18} color={t.mut2} sw={2.2} />} onPress={() => {}} last />
      </Group>

      <Text style={{ textAlign: 'center', color: t.mut2, fontSize: 12.5, fontWeight: '600', marginTop: 8 }}>FitLoop · Offline-first · No account needed</Text>

      {/* Profile editor */}
      <Sheet open={editProfile} onClose={() => setEditProfile(false)} t={t} title="Edit profile">
        <ProfileForm t={t} fmt={fmt} profile={state.profile} onSave={p => { updateProfile(p); setEditProfile(false); }} />
      </Sheet>

      {/* Clear data */}
      <Sheet open={clearStep > 0} onClose={() => setClearStep(0)} t={t} title={clearStep === 1 ? 'Clear all data?' : 'Are you absolutely sure?'}>
        <Text style={{ fontSize: 14.5, color: t.mut, fontWeight: '600', lineHeight: 22, marginBottom: 18 }}>
          {clearStep === 1 ? 'This removes every routine, session, and measurement stored on this device.' : 'This is your last chance. All progress will be permanently erased and cannot be recovered.'}
        </Text>
        {clearStep === 1
          ? <Btn t={t} variant="danger" full size="lg" onPress={() => setClearStep(2)}>Continue</Btn>
          : <Btn t={t} variant="danger" full size="lg" onPress={() => { clearData(); setClearStep(0); }} icon="trash">Erase everything</Btn>}
        <View style={{ height: 9 }} />
        <Btn t={t} variant="ghost" full onPress={() => setClearStep(0)}>Cancel</Btn>
      </Sheet>

    </ScrollView>
  );
}
