import React, { useEffect } from "react";
import { View, StatusBar, Modal } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from "@expo-google-fonts/hanken-grotesk";
import { AppProvider, useApp } from "./context";
import { TabNavigator } from "./navigation";
import { SessionScreen } from "./screens/SessionScreen";
import { RoutineEditor } from "./screens/RoutinesScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { Toast } from "./components/Shared";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const {
    t,
    sessionOn,
    sessionRoutine,
    saveSession,
    exitSession,
    routineEdit,
    saveRoutine,
    deleteRoutine,
    closeRoutineEdit,
    onboarded,
    toastState,
  } = useApp();

  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar
        barStyle={t.name === "dark" ? "light-content" : "dark-content"}
        backgroundColor={t.bg}
        translucent={false}
      />

      {/* Main tab navigator */}
      <TabNavigator />

      {/* Active workout session — slides up as a full-screen modal */}
      <Modal
        visible={sessionOn}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={exitSession}
      >
        <SessionScreen
          routine={sessionRoutine}
          onExit={exitSession}
          onSave={saveSession}
        />
      </Modal>

      {/* Routine editor — slides up when editing/creating a routine */}
      {routineEdit !== undefined && (
        <RoutineEditor
          routine={routineEdit}
          onSave={saveRoutine}
          onDelete={routineEdit ? deleteRoutine : undefined}
          onClose={closeRoutineEdit}
        />
      )}

      {/* Onboarding — shown on first launch */}
      <Modal
        visible={!onboarded}
        animationType="fade"
        presentationStyle="fullScreen"
      >
        <OnboardingScreen />
      </Modal>

      {/* Toast notification */}
      <Toast toast={toastState} t={t} />
    </View>
  );
}

export function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <AppShell />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
