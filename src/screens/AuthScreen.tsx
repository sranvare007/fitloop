import React, { useState } from 'react';
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context';
import { Icon } from '../components/Icon';
import { AppText as Text, AppTextInput as TextInput, Btn } from '../components/Shared';

type Mode = 'login' | 'signup';

export function AuthScreen() {
  const { t, signIn, signUp, closeAuth } = useApp();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    if (!email.trim() || !password) { setErr('Email and password are required.'); return; }
    if (mode === 'signup' && password.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') await signIn(email, password);
      else await signUp(email, password, name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, value: string, set: (v: string) => void, opts?: {
    placeholder?: string; keyboardType?: 'email-address' | 'default'; secure?: boolean; toggleSecure?: boolean;
  }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: t.mut2, letterSpacing: 0.4, marginBottom: 7 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface2, borderRadius: 13, borderWidth: 1.5, borderColor: t.line, paddingHorizontal: 14 }}>
        <TextInput
          value={value}
          onChangeText={set}
          placeholder={opts?.placeholder}
          placeholderTextColor={t.mut2}
          autoCapitalize={opts?.keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
          keyboardType={opts?.keyboardType ?? 'default'}
          secureTextEntry={opts?.secure && !show}
          style={{ flex: 1, color: t.text, fontWeight: '700', fontSize: 16, paddingVertical: 14 }}
        />
        {opts?.toggleSecure && (
          <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} onPress={() => setShow(s => !s)} hitSlop={10}>
            <Icon name={show ? 'sun' : 'moon'} size={18} color={t.mut} sw={2} />
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={closeAuth}
          style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface2 }}>
          <Icon name="x" size={22} color={t.text} sw={2.2} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: t.elev, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <Icon name="user" size={28} color={t.orange} sw={2} />
          </View>
          <Text style={{ fontSize: 30, fontWeight: '800', color: t.text, letterSpacing: -0.6 }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: t.mut, marginTop: 6, marginBottom: 24, lineHeight: 21 }}>
            {mode === 'login'
              ? 'Sign in to back up and sync your workouts across devices.'
              : 'Sign up to keep your routines, history and progress safely in the cloud.'}
          </Text>

          {mode === 'signup' && field('NAME', name, setName, { placeholder: 'Your name' })}
          {field('EMAIL', email, setEmail, { placeholder: 'you@example.com', keyboardType: 'email-address' })}
          {field('PASSWORD', password, setPassword, { placeholder: mode === 'signup' ? 'At least 8 characters' : 'Your password', secure: true, toggleSecure: true })}

          {err && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,84,112,0.14)', borderRadius: 12, padding: 12, marginBottom: 14 }}>
              <Icon name="info" size={17} color={t.danger} sw={2} />
              <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: t.danger }}>{err}</Text>
            </View>
          )}

          <Btn t={t} variant="pop" full size="lg" onPress={busy ? undefined : submit} disabled={busy} icon={busy ? undefined : 'check'}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Btn>

          <Pressable accessibilityRole="button" accessibilityLabel={mode === 'login' ? 'Switch to sign up' : 'Switch to sign in'}
            onPress={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setErr(null); }}
            style={{ alignItems: 'center', paddingVertical: 18 }}>
            <Text style={{ fontSize: 14.5, fontWeight: '600', color: t.mut }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ fontWeight: '800', color: t.orange }}>{mode === 'login' ? 'Sign up' : 'Sign in'}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
