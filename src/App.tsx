import React, { useEffect, useRef, useState } from "react";
import { View, StatusBar, Modal, Animated, StyleSheet, Image } from "react-native";
import LottieView from "lottie-react-native";
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

  const [splashDone, setSplashDone] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  // Captured once at mount — onboarded may change later when user completes onboarding
  const isFirstLaunch = useRef(!onboarded).current;

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // First launch: Lottie at 3× speed = 2s. Subsequent opens: image for 1.5s.
  // Timer is more reliable than onAnimationFinish which fires immediately on some builds.
  useEffect(() => {
    if (!fontsLoaded) return;
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => setSplashDone(true));
    }, isFirstLaunch ? 2000 : 1500);
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
        onRequestClose={exitSession}
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

      {/* Splash — Lottie on first-ever launch, static image on all subsequent opens */}
      {!splashDone && (
        <Animated.View
          style={[styles.splash, { backgroundColor: t.bg, opacity: splashOpacity }]}
          pointerEvents="auto"
        >
          {isFirstLaunch ? (
            <LottieView
              source={require("./assets/splash-animation.lottie")}
              autoPlay
              loop={false}
              speed={3}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <Image
              source={require("./assets/splash-image.png")}
              style={styles.splashImage}
              resizeMode="contain"
            />
          )}
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
  splashImage: {
    width: '80%',
    height: '80%',
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
