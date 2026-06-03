import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useApp } from '../context';
import { Btn, Sheet, AppText as Text, AppTextInput as TextInput } from '../components/Shared';
import { Icon } from '../components/Icon';
import { DAYS, DAYS_FULL, DAY_MS, relDate, sessionVolume } from '../data';

function WeekStrip() {
  const { t, state, doneDays } = useApp();
  const today = state.todayDay;
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
      {order.map(d => {
        const assigned = state.routines.some(r => r.days.includes(d));
        const done = doneDays.has(d);
        const isToday = d === today;
        return (
          <View key={d} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: isToday ? t.text : t.mut2, letterSpacing: 0.2 }}>{DAYS[d][0]}</Text>
            <View style={{
              width: '100%', height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
              backgroundColor: done ? t.lime : assigned ? t.surface : 'transparent',
              borderWidth: isToday ? 1.8 : 1,
              borderColor: isToday ? t.orange : assigned ? t.line : t.line,
              borderStyle: assigned || isToday ? 'solid' : 'dashed',
            }}>
              {done
                ? <Icon name="check" size={16} color={t.onLime} sw={3} />
                : <View style={{ width: 5, height: 5, borderRadius: 99, backgroundColor: assigned ? t.mut2 : 'transparent' }} />}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function RoutineCard({ routine, onStart, onSwap, swappedFrom }: any) {
  const { t, fmt } = useApp();
  const shown = routine.exercises.slice(0, 4);
  const more = routine.exercises.length - shown.length;
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: t.line2, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: routine.color }} />
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: t.mut, letterSpacing: 0.3 }}>{swappedFrom ? 'TODAY · SWAPPED' : "TODAY'S ROUTINE"}</Text>
        <View style={{ flex: 1 }} />
        {onSwap && (
          <Pressable onPress={onSwap} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: t.line, backgroundColor: t.elev, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 9 }}>
            <Icon name="swap" size={14} color={t.text} sw={2.2} />
            <Text style={{ fontWeight: '800', fontSize: 12.5, color: t.text }}>Swap</Text>
          </Pressable>
        )}
      </View>
      <Text style={{ fontSize: 30, fontWeight: '800', color: t.text, letterSpacing: -0.6, marginTop: 8 }}>{routine.name}</Text>
      {swappedFrom && <Text style={{ fontSize: 12.5, color: t.mut, fontWeight: '600', marginTop: 3 }}>Replacing <Text style={{ color: t.text, fontWeight: '700' }}>{swappedFrom}</Text> for today</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
        {shown.map((e: string) => (
          <View key={e} style={{ backgroundColor: t.elev, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: t.text }}>{e}</Text>
          </View>
        ))}
        {more > 0 && <Text style={{ fontSize: 13, fontWeight: '700', color: t.mut, paddingVertical: 7 }}>+{more} more</Text>}
      </View>
      <View style={{ marginTop: 18 }}>
        <Btn t={t} full size="lg" onPress={onStart} icon="play" style={{ borderRadius: 16 }}>Start workout</Btn>
      </View>
    </View>
  );
}

function MeasureCard() {
  const { t, fmt, addMeasurement, lastMeasurement } = useApp();
  const loggedToday = lastMeasurement && (Date.now() - lastMeasurement.at < DAY_MS) && new Date(lastMeasurement.at).getDate() === new Date().getDate();
  const [w, setW] = useState('');
  const [bf, setBf] = useState('');
  const [done, setDone] = useState(!!loggedToday);

  if (done || loggedToday) {
    return (
      <View style={{ backgroundColor: t.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: t.line2, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: t.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={22} color={t.limeInk} sw={2.6} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14.5, fontWeight: '800', color: t.text }}>Measurements logged</Text>
          {lastMeasurement && <Text style={{ fontSize: 13, color: t.mut, fontWeight: '600', marginTop: 1 }}>
            {fmt.w(lastMeasurement.weightKg)} {fmt.wlabel}{lastMeasurement.bodyFat ? ` · ${lastMeasurement.bodyFat}% body fat` : ''}
          </Text>}
        </View>
        <Pressable onPress={() => setDone(false)}>
          <Text style={{ color: t.orange, fontWeight: '800', fontSize: 14 }}>Edit</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: t.line2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 }}>
        <Icon name="ruler" size={18} color={t.mut} sw={2} />
        <Text style={{ fontSize: 14.5, fontWeight: '800', color: t.text }}>Log today's measurements</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 9 }}>
        <View style={{ flex: 1, backgroundColor: t.surface2, borderRadius: 13, padding: 8, borderWidth: 1, borderColor: t.line }}>
          <Text style={{ fontSize: 9.5, fontWeight: '800', color: t.mut2, letterSpacing: 0.4 }}>WEIGHT</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <TextInput value={w} onChangeText={v => setW(v.replace(/[^0-9.]/g, ''))} placeholder="0.0" placeholderTextColor={t.mut2} keyboardType="decimal-pad"
              style={{ flex: 1, color: t.text, fontWeight: '800', fontSize: 18, padding: 0 }} />
            <Text style={{ fontSize: 11, color: t.mut, fontWeight: '700' }}>{fmt.wlabel}</Text>
          </View>
        </View>
        <View style={{ flex: 1, backgroundColor: t.surface2, borderRadius: 13, padding: 8, borderWidth: 1, borderColor: t.line }}>
          <Text style={{ fontSize: 9.5, fontWeight: '800', color: t.mut2, letterSpacing: 0.4 }}>BODY FAT</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <TextInput value={bf} onChangeText={v => setBf(v.replace(/[^0-9.]/g, ''))} placeholder="—" placeholderTextColor={t.mut2} keyboardType="decimal-pad"
              style={{ flex: 1, color: t.text, fontWeight: '800', fontSize: 18, padding: 0 }} />
            <Text style={{ fontSize: 11, color: t.mut, fontWeight: '700' }}>%</Text>
          </View>
        </View>
        <Pressable onPress={() => { if (w) { addMeasurement(+w, bf ? +bf : null); setDone(true); } }}
          style={{ backgroundColor: w ? t.lime : t.elev, paddingHorizontal: 16, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontWeight: '800', fontSize: 14, color: w ? t.onLime : t.mut2 }}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function HomeScreen() {
  const { t, fmt, state, recentHistory, weekCount, nav, startSession, swapTodayRoutine } = useApp();
  const today = state.todayDay;
  const sched = state.routines.filter(r => r.days.includes(today));
  const ov = state.override && state.override.day === today ? state.routines.find(r => r.id === state.override!.id) : null;
  const todays = ov ? [ov] : sched;
  const swappedFrom = ov ? (sched.length ? sched.map(r => r.name).join(' / ') : 'a rest day') : null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const recent = recentHistory.slice(0, 3);
  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 24, gap: 18 }} showsVerticalScrollIndicator={false}>
      {/* Greeting */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: t.mut, fontWeight: '700' }}>{greeting},</Text>
          <Text style={{ fontSize: 30, fontWeight: '800', color: t.text, letterSpacing: -0.6, marginTop: 2 }}>{state.profile.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.surface, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: t.line2 }}>
          <Icon name="flame" size={17} color={t.orange} sw={0} fill="solid" />
          <Text style={{ fontSize: 15, fontWeight: '800', color: t.text }}>{weekCount}</Text>
          <Text style={{ fontSize: 12, color: t.mut, fontWeight: '700' }}>this wk</Text>
        </View>
      </View>

      {/* Week strip */}
      <WeekStrip />

      {/* Today's routine */}
      {todays.length > 0
        ? <View style={{ gap: 12 }}>
            {todays.map(r => <RoutineCard key={r.id} routine={r} onStart={() => startSession(r)} onSwap={() => setPickerOpen(true)} swappedFrom={swappedFrom} />)}
          </View>
        : <View style={{ backgroundColor: t.surface, borderRadius: 24, padding: 26, borderWidth: 1, borderColor: t.line2, alignItems: 'center' }}>
            <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Icon name="moon" size={28} color={t.mut} sw={1.8} />
            </View>
            <Text style={{ fontSize: 21, fontWeight: '800', color: t.text, letterSpacing: -0.3 }}>Rest day</Text>
            <Text style={{ fontSize: 14, color: t.mut, fontWeight: '600', marginTop: 6, lineHeight: 22, textAlign: 'center', maxWidth: 250 }}>No routine scheduled today. Recovery is part of the plan — or jump in anyway.</Text>
            <View style={{ flexDirection: 'row', gap: 9, marginTop: 18, width: '100%' }}>
              <Btn t={t} variant="ghost" full onPress={() => setPickerOpen(true)} icon="swap">Pick a routine</Btn>
              <Btn t={t} variant="pop" full onPress={() => startSession(null)} icon="bolt">Free workout</Btn>
            </View>
          </View>}

      {/* Measurements */}
      <MeasureCard />

      {/* Recent activity */}
      {recent.length > 0 && (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: t.text, letterSpacing: -0.2 }}>Recent activity</Text>
            <Pressable onPress={() => nav('history')}>
              <Text style={{ color: t.orange, fontWeight: '800', fontSize: 13.5 }}>See all</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 10 }}>
            {recent.map(s => (
              <Pressable key={s.id} onPress={() => nav('history')} style={({ pressed }) => [{ width: 158, backgroundColor: t.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: t.line2, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={{ fontSize: 12, color: t.mut, fontWeight: '700' }}>{relDate(s.startedAt)}</Text>
                <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: t.text, marginTop: 4 }}>{s.routineName}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: t.text }}>{sessionVolume(s.exercises).toLocaleString()}</Text>
                    <Text style={{ fontSize: 10.5, color: t.mut2, fontWeight: '700' }}>{fmt.wlabel.toUpperCase()} VOL</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: t.text }}>{s.exercises.length}</Text>
                    <Text style={{ fontSize: 10.5, color: t.mut2, fontWeight: '700' }}>LIFTS</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Routine picker sheet */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} t={t} title="Today's workout">
        <Text style={{ fontSize: 13, color: t.mut, fontWeight: '600', marginTop: -8, marginBottom: 14, lineHeight: 20 }}>Do a different routine today — your weekly schedule won't change.</Text>
        <View style={{ gap: 9 }}>
          {ov && (
            <Pressable onPress={() => { swapTodayRoutine(null); setPickerOpen(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line }}>
              <Icon name="back" size={18} color={t.mut} sw={2.2} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: t.text }}>Back to scheduled</Text>
            </Pressable>
          )}
          {state.routines.map(r => {
            const isToday = r.days.includes(today);
            const active = ov ? r.id === ov.id : isToday;
            return (
              <Pressable key={r.id} onPress={() => { swapTodayRoutine(r.id); setPickerOpen(false); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16,
                  backgroundColor: active ? t.limeSoft : t.surface2, borderWidth: active ? 1.5 : 1,
                  borderColor: active ? t.lime : t.line2 }}>
                <View style={{ width: 11, height: 11, borderRadius: 99, backgroundColor: r.color }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Text style={{ fontSize: 16.5, fontWeight: '800', color: t.text }}>{r.name}</Text>
                    {isToday && <View style={{ backgroundColor: t.limeSoft, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: t.limeInk }}>SCHEDULED</Text>
                    </View>}
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 12.5, color: t.mut, fontWeight: '600', marginTop: 2 }}>{r.exercises.slice(0, 3).join(' · ')}{r.exercises.length > 3 ? '…' : ''}</Text>
                </View>
                {active ? <Icon name="check" size={20} color={t.limeInk} sw={2.6} /> : <Icon name="chevR" size={17} color={t.mut2} sw={2.2} />}
              </Pressable>
            );
          })}
          <Pressable onPress={() => { setPickerOpen(false); startSession(null); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.line2 }}>
            <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bolt" size={17} color={t.orange} sw={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: t.text }}>Free workout</Text>
              <Text style={{ fontSize: 12.5, color: t.mut, fontWeight: '600', marginTop: 1 }}>Start fresh with no routine</Text>
            </View>
            <Icon name="chevR" size={17} color={t.mut2} sw={2.2} />
          </Pressable>
        </View>
      </Sheet>
    </ScrollView>
  );
}
