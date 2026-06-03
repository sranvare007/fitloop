import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context';
import { Btn, Sheet, Stat, AppText as Text } from '../components/Shared';
import { Icon } from '../components/Icon';
import { DAYS, DAYS_FULL, monthLabel, fmtDur, sessionVolume, sessionSets, Session } from '../data';

const PAGE_SIZE = 20;

function SessionDetail({ session, onClose, onDelete }: { session: Session; onClose: () => void; onDelete: (id: string) => void }) {
  const { t, fmt } = useApp();
  const insets = useSafeAreaInsets();
  const [confirm, setConfirm] = useState(false);
  const vol = sessionVolume(session.exercises), sets = sessionSets(session.exercises);
  const d = new Date(session.startedAt);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ paddingTop: insets.top }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: t.line2 }}>
            <Pressable onPress={onClose} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: 8 }}>
              <Icon name="chevL" size={20} color={t.orange} sw={2.4} />
              <Text style={{ color: t.orange, fontWeight: '700', fontSize: 15.5 }}>History</Text>
            </Pressable>
            <Pressable onPress={() => setConfirm(true)} style={{ padding: 8 }}>
              <Icon name="trash" size={20} color={t.danger} sw={2} />
            </Pressable>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 27, fontWeight: '800', color: t.text, letterSpacing: -0.5 }}>{session.routineName}</Text>
          <Text style={{ fontSize: 14, color: t.mut, fontWeight: '700', marginTop: 4 }}>
            {DAYS_FULL[d.getDay()]}, {d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} · {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginVertical: 18 }}>
            <View style={{ flex: 1 }}><Stat t={t} label="VOLUME" value={vol.toLocaleString()} sub={fmt.wlabel} /></View>
            <View style={{ flex: 1 }}><Stat t={t} label="SETS" value={sets} /></View>
            <View style={{ flex: 1 }}><Stat t={t} label="TIME" value={fmtDur(session.durationSec)} /></View>
          </View>

          <View style={{ gap: 11 }}>
            {session.exercises.map((ex, i) => {
              const top = ex.sets.length ? ex.sets.reduce((a: any, x: any) => x.kg > a.kg ? x : a, ex.sets[0]) : null;
              return (
                <View key={i} style={{ backgroundColor: t.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: t.line2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: t.text }}>{ex.name}</Text>
                    {top && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.limeSoft, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8 }}>
                      <Icon name="star" size={10} color={t.limeInk} sw={0} fill="solid" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: t.limeInk }}>{fmt.w(top.kg)} {fmt.wlabel}</Text>
                    </View>}
                  </View>
                  <View style={{ flexDirection: 'row', paddingHorizontal: 2, paddingBottom: 6 }}>
                    <View style={{ width: 30 }}><Text style={{ fontSize: 10.5, fontWeight: '800', color: t.mut2, letterSpacing: 0.5 }}>SET</Text></View>
                    <Text style={{ flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: '800', color: t.mut2, letterSpacing: 0.5 }}>REPS</Text>
                    <Text style={{ flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: '800', color: t.mut2, letterSpacing: 0.5 }}>{fmt.wlabel.toUpperCase()}</Text>
                  </View>
                  {ex.sets.map((s: any, j: number) => (
                    <View key={j} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 2, borderTopWidth: j ? 1 : 0, borderTopColor: t.line2 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut }}>{j + 1}</Text>
                      </View>
                      <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: t.text }}>{s.reps}</Text>
                      <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: t.text }}>{fmt.w(s.kg)}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>

          {session.notes ? (
            <View style={{ marginTop: 14, backgroundColor: t.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: t.line2 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: t.mut2, letterSpacing: 0.5, marginBottom: 6 }}>NOTES</Text>
              <Text style={{ fontSize: 14.5, color: t.text, fontWeight: '500', lineHeight: 22 }}>{session.notes}</Text>
            </View>
          ) : null}
        </ScrollView>

        <Sheet open={confirm} onClose={() => setConfirm(false)} t={t} title="Delete this session?">
          <Text style={{ fontSize: 14.5, color: t.mut, fontWeight: '600', lineHeight: 22, marginBottom: 18 }}>This permanently removes the session and all its logged sets. This can't be undone.</Text>
          <Btn t={t} variant="danger" full size="lg" onPress={() => { onDelete(session.id); onClose(); }} icon="trash">Delete session</Btn>
          <View style={{ height: 9 }} />
          <Btn t={t} variant="ghost" full onPress={() => setConfirm(false)}>Cancel</Btn>
        </Sheet>
      </View>
    </Modal>
  );
}

type Group = { key: string; items: Session[] };

export function HistoryScreen() {
  const { t, fmt, totalSessions, loadMoreSessions, deleteSession, detail, openDetail } = useApp();
  const [groups, setGroups] = useState<Group[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(async (currentOffset: number) => {
    if (loading) return;
    setLoading(true);
    const sessions = await loadMoreSessions(PAGE_SIZE, currentOffset);
    if (sessions.length < PAGE_SIZE) setHasMore(false);
    setGroups(prev => {
      const updated = [...prev];
      for (const s of sessions) {
        const key = monthLabel(s.startedAt);
        let g = updated.find(x => x.key === key);
        if (!g) { g = { key, items: [] }; updated.push(g); }
        if (!g.items.find(x => x.id === s.id)) g.items.push(s);
      }
      return updated;
    });
    setLoading(false);
  }, [loadMoreSessions]);

  useEffect(() => { loadPage(0); }, []);

  const loadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    await loadPage(nextOffset);
  };

  if (!loading && groups.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: t.line2 }}>
          <Icon name="clock" size={30} color={t.mut} sw={2} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: t.text }}>No sessions yet</Text>
        <Text style={{ fontSize: 14.5, color: t.mut, fontWeight: '600', marginTop: 8, maxWidth: 240, lineHeight: 22, textAlign: 'center' }}>Your finished workouts will appear here, newest first.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: t.text, letterSpacing: -0.6 }}>History</Text>
          <View style={{ backgroundColor: t.elev, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: t.mut }}>{totalSessions}</Text>
          </View>
        </View>

        {groups.map(g => (
          <View key={g.key} style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: t.mut2, letterSpacing: 0.5, marginBottom: 10, paddingLeft: 2 }}>{g.key.toUpperCase()}</Text>
            <View style={{ gap: 10 }}>
              {g.items.map(s => {
                const vol = sessionVolume(s.exercises), sets = sessionSets(s.exercises);
                const isFree = !s.routineId;
                return (
                  <Pressable key={s.id} onPress={() => openDetail(s)} style={({ pressed }) => [{ backgroundColor: t.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: t.line2, flexDirection: 'row', alignItems: 'center', gap: 13, opacity: pressed ? 0.8 : 1 }]}>
                    <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: isFree ? t.elev : t.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: isFree ? t.mut : t.limeInk, lineHeight: 20 }}>{new Date(s.startedAt).getDate()}</Text>
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: isFree ? t.mut2 : t.limeInk, letterSpacing: 0.3 }}>{DAYS[new Date(s.startedAt).getDay()].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontSize: 16.5, fontWeight: '800', color: t.text }}>{s.routineName}</Text>
                      <View style={{ flexDirection: 'row', gap: 11, marginTop: 4 }}>
                        <Text style={{ fontSize: 12.5, color: t.mut, fontWeight: '700' }}>{s.exercises.length} lifts</Text>
                        <Text style={{ fontSize: 12.5, color: t.mut, fontWeight: '700' }}>{sets} sets</Text>
                        <Text style={{ fontSize: 12.5, color: t.mut, fontWeight: '700' }}>{fmtDur(s.durationSec)}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: t.text }}>{vol.toLocaleString()}</Text>
                      <Text style={{ fontSize: 10.5, color: t.mut2, fontWeight: '800', letterSpacing: 0.3 }}>{fmt.wlabel.toUpperCase()} VOL</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* Load more */}
        {hasMore && (
          <Pressable onPress={loadMore} disabled={loading} style={{ padding: 16, alignItems: 'center', gap: 8 }}>
            {loading
              ? <ActivityIndicator color={t.orange} />
              : <Text style={{ color: t.orange, fontWeight: '800', fontSize: 14 }}>Load more</Text>}
          </Pressable>
        )}
        {loading && groups.length === 0 && <ActivityIndicator color={t.orange} style={{ marginTop: 40 }} />}
      </ScrollView>

      {detail && (
        <SessionDetail
          session={detail}
          onClose={() => openDetail(null)}
          onDelete={(id) => { deleteSession(id); openDetail(null); }}
        />
      )}
    </>
  );
}
