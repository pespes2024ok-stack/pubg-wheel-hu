import { View, Text, FlatList, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { api } from "@/src/api";
import { Icon, Img, ScreenHeader, Loader, EmptyState } from "@/src/components/ui";

const PLATFORM_ICON: Record<string, string> = {
  YouTube: "youtube",
  TikTok: "music-note",
  Instagram: "instagram",
  Twitch: "twitch",
  Twitter: "twitter",
};

export default function Creators() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const creatorsQ = useQuery({ queryKey: ["creators"], queryFn: () => api.get("/creators") });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="صناع المحتوى" onBack={() => router.back()} />
      {creatorsQ.isLoading ? (
        <Loader />
      ) : (
        <FlatList
          data={creatorsQ.data || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
          ListEmptyComponent={<EmptyState icon="video-off-outline" title="لا يوجد صناع محتوى" subtitle="سيتم إضافتهم قريباً" testID="creators-empty" />}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => item.url && Linking.openURL(item.url)} testID={`creator-${item.id}`}>
              <View style={styles.avatarWrap}>
                <Img uri={item.image} style={styles.avatar} fallbackIcon="account-star" />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {item.subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
                <View style={styles.platformTag}>
                  <Icon name={PLATFORM_ICON[item.platform] || "web"} size={13} color={colors.brandSecondary} />
                  <Text style={styles.platformText}>{item.platform}</Text>
                </View>
              </View>
              <Icon name="open-in-new" size={20} color={colors.muted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12 },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.brandPrimary, overflow: "hidden" },
  avatar: { width: "100%", height: "100%" },
  name: { color: colors.onSurface, fontSize: 16, fontFamily: fonts.textBold },
  subtitle: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular },
  platformTag: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: colors.surfaceTertiary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  platformText: { color: colors.brandSecondary, fontSize: 11, fontFamily: fonts.textSemiBold },
}));
