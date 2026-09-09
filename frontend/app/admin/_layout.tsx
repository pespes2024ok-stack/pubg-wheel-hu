import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";

import { useAdmin } from "@/src/admin";
import { useTheme } from "@/src/theme";

export default function AdminLayout() {
  const { authed, loading } = useAdmin();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (loading) return;
    const onLogin = segments[1] === "login";
    if (!authed && !onLogin) router.replace("/admin/login");
    else if (authed && onLogin) router.replace("/admin");
  }, [authed, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />;
}
