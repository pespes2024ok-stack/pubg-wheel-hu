import "react-native-gesture-handler";
import { useEffect } from "react";
import { I18nManager, Platform, View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { LogBox } from "react-native";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { AuthProvider, useAuth } from "@/src/auth";
import { AdminProvider } from "@/src/admin";
import { ToastProvider } from "@/src/toast";
import { LoginGateProvider } from "@/src/login-gate";
import { useTheme } from "@/src/theme";

LogBox.ignoreAllLogs(true);

// Force RTL for Arabic-first layout
try {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
} catch {}

// Push: foreground handler (module scope, native only)
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  }).catch(() => {});
}

function AuthGate() {
  const { user, loading, guest } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (loading) return;
    const root = segments[0];
    if (root === "admin") return; // admin has its own token gate
    if (!user && !guest && root !== "login") router.replace("/login");
    else if (user && root === "login") router.replace("/(tabs)");
  }, [user, loading, guest, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface }, animation: "fade" }} />
  );
}

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    "Rajdhani-Medium": require("../assets/fonts/Rajdhani-Medium.ttf"),
    "Rajdhani-SemiBold": require("../assets/fonts/Rajdhani-SemiBold.ttf"),
    "Rajdhani-Bold": require("../assets/fonts/Rajdhani-Bold.ttf"),
    "Cairo-Regular": require("../assets/fonts/Cairo-Regular.ttf"),
    "Cairo-SemiBold": require("../assets/fonts/Cairo-SemiBold.ttf"),
    "Cairo-Bold": require("../assets/fonts/Cairo-Bold.ttf"),
    MaterialDesignIcons: require("@react-native-vector-icons/material-design-icons/fonts/MaterialDesignIcons.ttf"),
  });

  useEffect(() => {
    if (Platform.OS === "web") return;
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data: any = response.notification.request.content.data || {};
      const url = data.deeplink || data.action_url;
      if (!url) return;
      url.startsWith("http") ? Linking.openURL(url) : router.push(url);
    });
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data: any = response.notification.request.content.data || {};
      const url = data.deeplink || data.action_url;
      if (url) (url.startsWith("http") ? Linking.openURL(url) : router.push(url));
    });
    return () => tapSub.remove();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0F1115" }}>
        <ActivityIndicator size="large" color="#F5B301" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <AdminProvider>
                <AuthProvider>
                  <LoginGateProvider>
                    <StatusBar style="light" />
                    <AuthGate />
                  </LoginGateProvider>
                </AuthProvider>
              </AdminProvider>
            </ToastProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
