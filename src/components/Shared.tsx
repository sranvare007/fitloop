import React from 'react';
import {
  View, Text as RNText, TextInput as RNTextInput, Pressable, StyleSheet, Modal,
  TouchableWithoutFeedback, ScrollView, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme';
import { Icon, DotsMenu } from './Icon';

// ── Hanken Grotesk font helpers ──────────────────────────────
const HK: Record<string, string> = {
  '100': 'HankenGrotesk_100Thin',
  '200': 'HankenGrotesk_200ExtraLight',
  '300': 'HankenGrotesk_300Light',
  '400': 'HankenGrotesk_400Regular',
  'normal': 'HankenGrotesk_400Regular',
  '500': 'HankenGrotesk_500Medium',
  '600': 'HankenGrotesk_600SemiBold',
  '700': 'HankenGrotesk_700Bold',
  'bold': 'HankenGrotesk_700Bold',
  '800': 'HankenGrotesk_800ExtraBold',
  '900': 'HankenGrotesk_900Black',
};

export function AppText({ style, ...props }: React.ComponentProps<typeof RNText>) {
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, ...restFlat } = flat as any;
  return (
    <RNText
      style={[{ fontFamily: HK[String(fontWeight ?? '400')] ?? HK['400'] }, restFlat]}
      {...props}
    />
  );
}

export function AppTextInput({ style, ...props }: React.ComponentProps<typeof RNTextInput>) {
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, ...restFlat } = flat as any;
  return (
    <RNTextInput
      style={[{ fontFamily: HK[String(fontWeight ?? '400')] ?? HK['400'] }, restFlat]}
      {...props}
    />
  );
}

// ── Btn ──────────────────────────────────────────────────────
interface BtnProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'pop' | 'soft' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  t: Theme;
  style?: ViewStyle;
  full?: boolean;
  icon?: string;
  disabled?: boolean;
}

export function Btn({ children, onPress, variant = 'primary', size = 'md', t, style, full, icon, disabled }: BtnProps) {
  const pads = { sm: { paddingVertical: 9, paddingHorizontal: 14 }, md: { paddingVertical: 13, paddingHorizontal: 18 }, lg: { paddingVertical: 16, paddingHorizontal: 20 } };
  const fss = { sm: 14, md: 15.5, lg: 17 };
  const variants: Record<string, { backgroundColor: string; borderColor?: string; borderWidth?: number }> = {
    primary: { backgroundColor: t.orange },
    pop: { backgroundColor: t.lime },
    soft: { backgroundColor: t.elev },
    ghost: { backgroundColor: 'transparent', borderColor: t.line, borderWidth: 1.5 },
    danger: { backgroundColor: 'transparent', borderColor: t.danger, borderWidth: 1.5 },
  };
  const textColors: Record<string, string> = {
    primary: t.orangeInk, pop: t.onLime, soft: t.text, ghost: t.text, danger: t.danger,
  };
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn, pads[size], variants[variant],
        full && { width: '100%' }, { borderRadius: 14, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <View style={styles.btnInner}>
        {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} color={textColors[variant]} sw={2.4} />}
        <AppText style={[styles.btnText, { fontSize: fss[size], color: textColors[variant] }]}>{children}</AppText>
      </View>
    </Pressable>
  );
}

// ── IconBtn ──────────────────────────────────────────────────
export function IconBtn({ name, onPress, t, size = 38, color, bg, sw = 2 }: { name: string; onPress?: () => void; t: Theme; size?: number; color?: string; bg?: string; sw?: number }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width: size, height: size, borderRadius: 12, backgroundColor: bg || t.surface2, justifyContent: 'center', alignItems: 'center', opacity: pressed ? 0.7 : 1 }]}>
      <Icon name={name} size={size * 0.46} color={color || t.text} sw={sw} />
    </Pressable>
  );
}

// ── Chip ─────────────────────────────────────────────────────
interface ChipProps {
  children: React.ReactNode;
  t: Theme;
  tone?: 'soft' | 'pop' | 'orange';
  style?: ViewStyle;
}
export function Chip({ children, t, tone = 'soft', style }: ChipProps) {
  const tones = {
    soft: { backgroundColor: t.elev, color: t.mut },
    pop: { backgroundColor: t.limeSoft, color: t.limeInk },
    orange: { backgroundColor: `${t.orange}22`, color: t.orange },
  };
  return (
    <View style={[styles.chip, { backgroundColor: tones[tone].backgroundColor }, style]}>
      {typeof children === 'string'
        ? <AppText style={{ fontSize: 12, fontWeight: '800', color: tones[tone].color }}>{children}</AppText>
        : children}
    </View>
  );
}

// ── Segmented ────────────────────────────────────────────────
export function Segmented({ options, value, onChange, t, style }: { options: (string | { value: string; label: string })[]; value: string; onChange: (v: string) => void; t: Theme; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: t.elev, borderRadius: 13, padding: 3, gap: 3 }, style]}>
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const on = v === value;
        return (
          <Pressable key={v} onPress={() => onChange(v)} style={[{ flex: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 6, backgroundColor: on ? t.surface : 'transparent', alignItems: 'center' }]}>
            <AppText style={{ fontWeight: '700', fontSize: 13.5, color: on ? t.text : t.mut }}>{label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Switch ───────────────────────────────────────────────────
export function Switch({ on, onChange, t }: { on: boolean; onChange: (v: boolean) => void; t: Theme }) {
  return (
    <Pressable onPress={() => onChange(!on)} style={{ width: 50, height: 30, borderRadius: 999, backgroundColor: on ? t.lime : t.elev2, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: 999, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3 }} />
    </Pressable>
  );
}

// ── Sheet (bottom sheet via Modal) ───────────────────────────
interface SheetProps {
  open: boolean;
  onClose: () => void;
  t: Theme;
  children: React.ReactNode;
  title?: string;
  height?: number | string;
}
export function Sheet({ open, onClose, t, children, title, height }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={{
              backgroundColor: t.surface,
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              paddingHorizontal: 18, paddingTop: 10,
              paddingBottom: insets.bottom + 20,
              maxHeight: typeof height === 'number' ? height : '85%',
              borderTopWidth: 1, borderTopColor: t.line,
            }}>
              <View style={{ width: 40, height: 5, borderRadius: 99, backgroundColor: t.elev2, alignSelf: 'center', marginBottom: 14 }} />
              {title && <AppText style={{ fontSize: 19, fontWeight: '800', color: t.text, marginBottom: 14, letterSpacing: -0.3 }}>{title}</AppText>}
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {children}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ── Toast ────────────────────────────────────────────────────
export function Toast({ toast, t }: { toast: any; t: Theme }) {
  if (!toast) return null;
  return (
    <View style={[styles.toast, { backgroundColor: t.name === 'dark' ? '#23252E' : '#16171C' }]}>
      {toast.icon && (
        <View style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: toast.tone === 'danger' ? t.danger : t.lime, justifyContent: 'center', alignItems: 'center' }}>
          <Icon name={toast.icon} size={13} color={toast.tone === 'danger' ? '#fff' : '#0C0D10'} sw={2.6} />
        </View>
      )}
      <AppText style={{ flex: 1, color: '#fff', fontSize: 14.5, fontWeight: '600' }}>{toast.msg}</AppText>
      {toast.action && (
        <Pressable onPress={toast.action.fn}>
          <AppText style={{ color: t.lime, fontWeight: '800', fontSize: 14.5 }}>{toast.action.label}</AppText>
        </Pressable>
      )}
    </View>
  );
}

// ── MenuRow ──────────────────────────────────────────────────
export function MenuRow({ t, icon, label, onPress, danger, rot }: { t: Theme; icon: string; label: string; onPress: () => void; danger?: boolean; rot?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 14, backgroundColor: t.surface2, opacity: pressed ? 0.7 : 1 }]}>
      <Icon name={icon} size={20} color={danger ? t.danger : t.mut} sw={2.1} />
      <AppText style={{ fontSize: 15.5, fontWeight: '700', color: danger ? t.danger : t.text }}>{label}</AppText>
    </Pressable>
  );
}

// ── Stat block ───────────────────────────────────────────────
export function Stat({ t, label, value, sub }: { t: Theme; label: string; value: string | number; sub?: string }) {
  return (
    <View style={{ backgroundColor: t.surface2, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: t.line2 }}>
      <AppText style={{ fontSize: 10, fontWeight: '800', color: t.mut2, letterSpacing: 0.5, marginBottom: 6 }}>{label}</AppText>
      <AppText style={{ fontSize: 20, fontWeight: '800', color: t.text }}>
        {value}{sub ? <AppText style={{ fontSize: 11, color: t.mut, fontWeight: '600' }}> {sub}</AppText> : null}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontWeight: '800' as const, letterSpacing: -0.2, lineHeight: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8 },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 90, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 30, elevation: 15 },
});
