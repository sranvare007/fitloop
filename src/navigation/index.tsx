import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context';
import { Icon } from '../components/Icon';
import { AppText as Text } from '../components/Shared';
import { HomeScreen } from '../screens/HomeScreen';
import { RoutinesScreen } from '../screens/RoutinesScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const TABS = [
  { k: 'home', icon: 'home', label: 'Home' },
  { k: 'routines', icon: 'dumbbell', label: 'Routines' },
  { k: 'progress', icon: 'chart', label: 'Progress' },
  { k: 'history', icon: 'clock', label: 'History' },
  { k: 'settings', icon: 'gear', label: 'Settings' },
];

function CustomTabBar() {
  const { t, activeTab, setActiveTab } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
      backgroundColor: t.bar, borderTopWidth: 1, borderTopColor: t.line2,
      paddingTop: 8, paddingBottom: insets.bottom + 4,
    }}>
      {TABS.map(x => {
        const on = activeTab === x.k;
        return (
          <Pressable key={x.k} onPress={() => setActiveTab(x.k)} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 }}>
            <Icon name={x.icon} size={24} color={on ? t.orange : t.mut2} sw={on ? 2.3 : 2} />
            <Text style={{ fontSize: 10.5, fontWeight: on ? '800' : '700', color: on ? t.orange : t.mut2, letterSpacing: -0.1 }}>{x.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const SCREEN_COMPONENTS: Record<string, React.ComponentType> = {
  home: HomeScreen,
  routines: RoutinesScreen,
  progress: ProgressScreen,
  history: HistoryScreen,
  settings: SettingsScreen,
};

export function TabNavigator() {
  const { activeTab, t } = useApp();
  const Screen = SCREEN_COMPONENTS[activeTab] || HomeScreen;
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <Screen />
      </View>
      <CustomTabBar />
    </View>
  );
}
