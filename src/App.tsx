import React, { useEffect, useRef, useState } from "react";
import { View, StatusBar, Modal, Animated, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import { useFonts } from "expo-font";
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from "@expo-google-fonts/hanken-grotesk";
import { AppProvider, useApp } from "./context";
import { AppText } from "./components/Shared";
import { TabNavigator } from "./navigation";
import { SessionScreen } from "./screens/SessionScreen";
import { RoutineEditor } from "./screens/RoutinesScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { Toast } from "./components/Shared";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

function AppUpdateOverlay() {
  const { t } = useApp();
  const { isDownloading, isUpdatePending, isUpdateAvailable, isRestarting, downloadProgress } = Updates.useUpdates();
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!Updates.isEnabled) return;
    Updates.checkForUpdateAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (isUpdateAvailable) {
      Updates.fetchUpdateAsync().catch(() => {});
    }
  }, [isUpdateAvailable]);

  useEffect(() => {
    if (isUpdatePending) {
      Updates.reloadAsync().catch(() => {});
    }
  }, [isUpdatePending]);

  useEffect(() => {
    const target = isUpdatePending ? 1 : (downloadProgress ?? 0);
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [downloadProgress, isUpdatePending]);

  if (!isDownloading && !isUpdatePending && !isRestarting) return null;

  const pct = Math.round((isUpdatePending ? 1 : (downloadProgress ?? 0)) * 100);

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.updateOverlay, { backgroundColor: t.bg }]}>
      <LottieView
        source={require('./assets/app-update-animation.lottie')}
        autoPlay
        loop
        style={styles.updateLottie}
      />
      <AppText style={{ fontSize: 18, fontWeight: '800', color: t.text, marginBottom: 6 }}>
        Update in progress
      </AppText>
      <AppText style={{ fontSize: 13, fontWeight: '600', color: t.mut, marginBottom: 24 }}>
        Please keep the app open
      </AppText>
      <View style={[styles.progressTrack, { backgroundColor: t.elev }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: t.orange,
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
      <AppText style={{ fontSize: 13, fontWeight: '700', color: t.mut, marginTop: 10 }}>
        {pct}%
      </AppText>
    </View>
  );
}

function AppShell() {
  const {
    t,
    sessionOn,
    sessionRoutine,
    sessionResumeData,
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

  // splashDone gates the onboarding modal — set to true before the fade so the
  // modal is visible before the overlay turns transparent (prevents home screen flash).
  const [splashDone, setSplashDone] = useState(false);
  // overlayVisible controls whether the overlay node stays in the tree.
  const [overlayVisible, setOverlayVisible] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  // Captured once at mount — onboarded may change later when user completes onboarding
  const isFirstLaunch = useRef(!onboarded).current;

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // First launch: Lottie at 3× speed = ~2s. Subsequent opens: dismiss immediately after fonts load.
  useEffect(() => {
    if (!fontsLoaded) return;
    const delay = isFirstLaunch ? 2000 : 0;
    const timer = setTimeout(() => {
      setSplashDone(true);
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => setOverlayVisible(false));
    }, delay);
    return () => clearTimeout(timer);
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
        onRequestClose={() => {}}
      >
        <SessionScreen
          routine={sessionRoutine}
          onExit={exitSession}
          onSave={saveSession}
          resumeData={sessionResumeData}
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

      {/* Onboarding — shown after splash completes on first launch */}
      <Modal
        visible={splashDone && !onboarded}
        animationType="fade"
        presentationStyle="fullScreen"
      >
        <OnboardingScreen />
      </Modal>

      {/* Toast notification */}
      <Toast toast={toastState} t={t} />

      {/* OTA update — shown while downloading and applying an update */}
      <AppUpdateOverlay />

      {/* Splash — Lottie animation on first-ever launch only */}
      {overlayVisible && isFirstLaunch && (
        <Animated.View
          style={[styles.splash, { backgroundColor: t.bg, opacity: splashOpacity }]}
          pointerEvents="auto"
        >
          <LottieView
            source={require("./assets/splash-animation.lottie")}
            autoPlay
            loop={false}
            speed={3}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateOverlay: {
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateLottie: {
    width: 220,
    height: 220,
  },
  progressTrack: {
    width: '60%',
    height: 5,
    borderRadius: 99,
    marginTop: 32,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
});

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
