import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { useTheme, fonts } from "@/src/theme";
import { Icon } from "@/src/components/ui";
import { api } from "@/src/api";

export default function TabsLayout() {
  const { colors } = useTheme();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings") });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontFamily: fonts.textSemiBold, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: settings?.tab_home || "اللوبي", tabBarIcon: ({ color }) => <Icon name="home-variant" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="store"
        options={{ title: settings?.tab_store || "المتجر", tabBarIcon: ({ color }) => <Icon name="storefront" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="rewards"
        options={{ title: settings?.tab_rewards || "جوائزي", tabBarIcon: ({ color }) => <Icon name="treasure-chest" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: settings?.tab_profile || "الملف", tabBarIcon: ({ color }) => <Icon name="account-circle" size={24} color={color} /> }}
      />
    </Tabs>
  );
}
