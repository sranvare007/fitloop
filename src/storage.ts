import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'fitloop' });

export const KEYS = {
  ONBOARDED: 'onboarded',
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
} as const;
