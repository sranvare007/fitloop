import React, { useMemo, useState } from 'react';
import { View, Pressable, Image, Modal, Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context';
import { Icon } from './Icon';
import { AppText as Text, Btn } from './Shared';
import { PhysiquePhoto, PhysiquePose, PHYSIQUE_POSES, poseLabel, relDate } from '../data';

const SCREEN_W = Dimensions.get('window').width;
const COLS = 3;
const GAP = 8;
const THUMB = (SCREEN_W - 36 - GAP * (COLS - 1)) / COLS;

type DayGroup = { key: string; label: string; photos: PhysiquePhoto[] };

function groupByDay(photos: PhysiquePhoto[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const p of photos) {
    const d = new Date(p.at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.photos.push(p);
    else groups.push({ key, label: relDate(p.at), photos: [p] });
  }
  return groups;
}

export function PhysiqueTimeline() {
  const { t, physiquePhotos, openPhysiqueCamera } = useApp();
  const [filter, setFilter] = useState<PhysiquePose | 'all'>('all');
  const [viewer, setViewer] = useState<number | null>(null);

  // Poses that actually have photos — drives the filter chips.
  const usedPoses = useMemo(() => {
    const set = new Set(physiquePhotos.map(p => p.pose));
    return PHYSIQUE_POSES.filter(p => set.has(p.key));
  }, [physiquePhotos]);

  const filtered = useMemo(
    () => filter === 'all' ? physiquePhotos : physiquePhotos.filter(p => p.pose === filter),
    [physiquePhotos, filter]
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  if (physiquePhotos.length === 0) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: t.surface, borderRadius: 22, padding: 28, borderWidth: 1, borderColor: t.line2, gap: 12 }}>
        <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="camera" size={28} color={t.orange} sw={2} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: t.text, textAlign: 'center' }}>Track your physique</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: t.mut, textAlign: 'center', lineHeight: 20 }}>
          Snap a photo after your workout. Capture the same poses over time to watch your progress.
        </Text>
        <Btn t={t} full size="lg" icon="camera" onPress={openPhysiqueCamera}>Capture first photo</Btn>
      </View>
    );
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: t.mut }}>
          {physiquePhotos.length} photo{physiquePhotos.length === 1 ? '' : 's'}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Capture progress photo" onPress={openPhysiqueCamera}
          style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.orange, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12, opacity: pressed ? 0.85 : 1 }]}>
          <Icon name="camera" size={16} color={t.orangeInk} sw={2.3} />
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: t.orangeInk }}>Capture</Text>
        </Pressable>
      </View>

      {/* Pose filter */}
      {usedPoses.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
          {[{ key: 'all' as const, label: 'All' }, ...usedPoses].map(p => {
            const on = filter === p.key;
            return (
              <Pressable key={p.key} accessibilityRole="button" accessibilityLabel={`Filter ${p.label}`} onPress={() => setFilter(p.key as any)}
                style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 11, backgroundColor: on ? t.text : t.surface, borderWidth: on ? 0 : 1, borderColor: t.line2 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: on ? t.bg : t.mut }}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {groups.map(g => (
        <View key={g.key} style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: t.mut2, letterSpacing: 0.3, marginBottom: 10 }}>{g.label.toUpperCase()}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
            {g.photos.map(photo => {
              const idx = filtered.indexOf(photo);
              return (
                <Pressable key={photo.id} accessibilityRole="imagebutton" accessibilityLabel={`${poseLabel(photo.pose)} photo`} onPress={() => setViewer(idx)}>
                  <Image source={{ uri: photo.uri }} style={{ width: THUMB, height: THUMB * 1.3, borderRadius: 14, backgroundColor: t.elev }} />
                  <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 7 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#fff' }}>{poseLabel(photo.pose)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <PhotoViewer photos={filtered} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />
    </View>
  );
}

function PhotoViewer({ photos, index, onIndex, onClose }: {
  photos: PhysiquePhoto[]; index: number | null; onIndex: (i: number) => void; onClose: () => void;
}) {
  const { t, fmt, deletePhysiquePhoto } = useApp();
  const insets = useSafeAreaInsets();
  const [confirm, setConfirm] = useState(false);

  const open = index !== null && index >= 0 && index < photos.length;
  const photo = open ? photos[index!] : null;

  const close = () => { setConfirm(false); onClose(); };
  const go = (delta: number) => {
    if (index === null) return;
    const next = index + delta;
    if (next >= 0 && next < photos.length) { setConfirm(false); onIndex(next); }
  };
  const doDelete = async () => {
    if (!photo) return;
    const wasLast = photos.length === 1;
    const curIdx = index!;
    await deletePhysiquePhoto(photo.id);
    setConfirm(false);
    if (wasLast) close();
    else onIndex(Math.min(curIdx, photos.length - 2));
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.viewerRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {photo && (
          <>
            <View style={styles.viewerTop}>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.viewerRound}>
                <Icon name="x" size={22} color="#fff" sw={2.2} />
              </Pressable>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>{relDate(photo.at)}</Text>
              <View style={{ width: 44 }} />
            </View>

            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              {index! > 0 && (
                <Pressable accessibilityRole="button" accessibilityLabel="Previous photo" onPress={() => go(-1)} style={[styles.navBtn, { left: 10 }]}>
                  <Icon name="chevL" size={24} color="#fff" sw={2.4} />
                </Pressable>
              )}
              {index! < photos.length - 1 && (
                <Pressable accessibilityRole="button" accessibilityLabel="Next photo" onPress={() => go(1)} style={[styles.navBtn, { right: 10 }]}>
                  <Icon name="chevR" size={24} color="#fff" sw={2.4} />
                </Pressable>
              )}
            </View>

            <View style={{ paddingHorizontal: 18, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 9 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>{poseLabel(photo.pose)}</Text>
                </View>
                {photo.weightKg != null && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 9 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>{fmt.wStr(photo.weightKg)} {fmt.wlabel}</Text>
                  </View>
                )}
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginLeft: 'auto' }}>
                  {index! + 1} / {photos.length}
                </Text>
              </View>
              {photo.note ? <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>{photo.note}</Text> : null}

              {confirm ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><Btn t={t} variant="ghost" full onPress={() => setConfirm(false)}>Cancel</Btn></View>
                  <View style={{ flex: 1 }}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Confirm delete" onPress={doDelete}
                      style={({ pressed }) => [{ backgroundColor: t.danger, borderRadius: 14, paddingVertical: 13, alignItems: 'center', opacity: pressed ? 0.85 : 1 }]}>
                      <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#fff' }}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel="Delete photo" onPress={() => setConfirm(true)}
                  style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, opacity: pressed ? 0.6 : 1 }]}>
                  <Icon name="trash" size={18} color={t.danger} sw={2.1} />
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: t.danger }}>Delete photo</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewerRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' },
  viewerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  viewerRound: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  navBtn: {
    position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
