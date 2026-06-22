import React, { useMemo, useRef, useState } from 'react';
import { View, Pressable, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context';
import { Icon } from '../components/Icon';
import { AppText as Text, Btn } from '../components/Shared';
import { PHYSIQUE_POSES, PhysiquePose } from '../data';

type Shot = { uri: string; pose: PhysiquePose };
const TIMERS = [0, 3, 5, 10];

export function PhysiqueCameraScreen() {
  const { t, physiquePhotos, lastMeasurement, addPhysiquePhotos, closePhysiqueCamera } = useApp();
  const insets = useSafeAreaInsets();
  const cam = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [pose, setPose] = useState<PhysiquePose>('front');
  const [shots, setShots] = useState<Shot[]>([]);
  const [showGhost, setShowGhost] = useState(true);
  const [timerIdx, setTimerIdx] = useState(0);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  // Most recent saved photo of the selected pose — used as an alignment overlay.
  const ghost = useMemo(() => physiquePhotos.find(p => p.pose === pose) ?? null, [physiquePhotos, pose]);

  const shoot = async () => {
    if (!cam.current) return;
    setBusy(true);
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.7 });
      if (pic?.uri) setShots(s => [...s, { uri: pic.uri, pose }]);
    } catch {
      /* swallow — a failed shot just doesn't get added */
    } finally {
      setBusy(false);
      setCount(null);
    }
  };

  const capture = () => {
    if (busy || count !== null) return;
    const secs = TIMERS[timerIdx];
    if (secs === 0) { shoot(); return; }
    let n = secs;
    setCount(n);
    const tick = () => {
      n -= 1;
      if (n <= 0) { shoot(); return; }
      setCount(n);
      setTimeout(tick, 1000);
    };
    setTimeout(tick, 1000);
  };

  const save = async () => {
    if (!shots.length || saving) return;
    setSaving(true);
    const weightKg = lastMeasurement?.weightKg ?? null;
    await addPhysiquePhotos(shots.map(s => ({ uri: s.uri, pose: s.pose, weightKg })));
    // context closes the camera on success
  };

  // ── Permission gate ─────────────────────────────────────────
  if (!permission) {
    return <View style={[styles.root, { backgroundColor: '#000' }]}><ActivityIndicator color="#fff" /></View>;
  }
  if (!permission.granted) {
    return (
      <View style={[styles.root, { backgroundColor: t.bg, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, paddingHorizontal: 24, justifyContent: 'center' }]}>
        <View style={{ alignItems: 'center', gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="camera" size={30} color={t.orange} sw={2} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: t.text, textAlign: 'center' }}>Camera access</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: t.mut, textAlign: 'center', lineHeight: 21 }}>
            Fitloop needs the camera to capture your physique progress photos. They stay private on this device.
          </Text>
          <View style={{ height: 6 }} />
          <Btn t={t} full size="lg" icon="camera" onPress={requestPermission}>Enable camera</Btn>
          <Btn t={t} full variant="ghost" onPress={closePhysiqueCamera}>Not now</Btn>
        </View>
      </View>
    );
  }

  const flashIconColor = flash === 'off' ? '#fff' : t.lime;
  const secs = TIMERS[timerIdx];

  return (
    <View style={[styles.root, { backgroundColor: '#000' }]}>
      <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} flash={flash} mirror />

      {/* Ghost alignment overlay */}
      {showGhost && ghost && (
        <Image source={{ uri: ghost.uri }} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} resizeMode="cover" />
      )}

      {/* Countdown */}
      {count !== null && (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Text style={{ fontSize: 120, fontWeight: '800', color: '#fff' }}>{count}</Text>
        </View>
      )}

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <RoundBtn icon="x" label="Close" onPress={closePhysiqueCamera} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <RoundBtn icon="clock" label="Self timer" onPress={() => setTimerIdx(i => (i + 1) % TIMERS.length)}
            badge={secs > 0 ? `${secs}s` : undefined} active={secs > 0} accent={t.lime} />
          <RoundBtn icon="bolt" label="Flash" onPress={() => setFlash(f => f === 'off' ? 'auto' : f === 'auto' ? 'on' : 'off')}
            color={flashIconColor} badge={flash !== 'off' ? flash : undefined} active={flash !== 'off'} accent={t.lime} />
          <RoundBtn icon="swap" label="Flip camera" onPress={() => setFacing(f => f === 'front' ? 'back' : 'front')} />
        </View>
      </View>

      {/* Ghost toggle (only when a reference exists) */}
      {ghost && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showGhost ? 'Hide alignment guide' : 'Show alignment guide'}
          onPress={() => setShowGhost(g => !g)}
          style={[styles.ghostToggle, { top: insets.top + 64, backgroundColor: showGhost ? t.orange : 'rgba(0,0,0,0.45)' }]}
        >
          <Icon name="image" size={15} color={showGhost ? t.orangeInk : '#fff'} sw={2.2} />
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: showGhost ? t.orangeInk : '#fff' }}>
            {showGhost ? 'Guide on' : 'Guide off'}
          </Text>
        </Pressable>
      )}

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}>
        {/* Pose selector */}
        <View style={styles.poseRow}>
          {PHYSIQUE_POSES.map(p => {
            const on = p.key === pose;
            return (
              <Pressable key={p.key} accessibilityRole="button" accessibilityLabel={`${p.label} pose`} onPress={() => setPose(p.key)}
                style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 11, backgroundColor: on ? t.orange : 'rgba(255,255,255,0.15)' }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: on ? t.orangeInk : '#fff' }}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Shutter row */}
        <View style={styles.shutterRow}>
          {/* Captured count / save */}
          <View style={{ width: 88, alignItems: 'flex-start' }}>
            {shots.length > 0 && (
              <Pressable accessibilityRole="button" accessibilityLabel="Remove last photo" onPress={() => setShots(s => s.slice(0, -1))}
                style={styles.thumbWrap}>
                <Image source={{ uri: shots[shots.length - 1].uri }} style={styles.thumb} />
                <View style={[styles.thumbBadge, { backgroundColor: t.orange }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: t.orangeInk }}>{shots.length}</Text>
                </View>
              </Pressable>
            )}
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Capture photo" onPress={capture} disabled={busy || count !== null}
            style={styles.shutterOuter}>
            <View style={[styles.shutterInner, { opacity: busy ? 0.5 : 1 }]} />
          </Pressable>

          <View style={{ width: 88, alignItems: 'flex-end' }}>
            {shots.length > 0 && (
              <Btn t={t} variant="pop" size="sm" icon="check" onPress={save}>
                {saving ? 'Saving' : 'Save'}
              </Btn>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function RoundBtn({ icon, label, onPress, color = '#fff', badge, active, accent }: {
  icon: string; label: string; onPress: () => void; color?: string; badge?: string; active?: boolean; accent?: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.round}>
      <Icon name={icon} size={20} color={color} sw={2.1} />
      {badge && (
        <View style={[styles.roundBadge, { backgroundColor: active && accent ? accent : 'rgba(0,0,0,0.6)' }]}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: active && accent ? '#0C0D10' : '#fff' }}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  round: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  roundBadge: {
    position: 'absolute', bottom: -2, right: -2, minWidth: 18, height: 16,
    borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center',
  },
  ghostToggle: {
    position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 11, borderRadius: 11,
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, gap: 18 },
  poseRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shutterOuter: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  thumbWrap: { width: 52, height: 52 },
  thumb: { width: 52, height: 52, borderRadius: 12, borderWidth: 2, borderColor: '#fff' },
  thumbBadge: {
    position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10,
    paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center',
  },
});
