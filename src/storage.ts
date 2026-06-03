import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'fitloop' });

export const KEYS = {
  ONBOARDED: 'onboarded',
} as const;
