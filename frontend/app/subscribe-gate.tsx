import { useState } from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { api } from "@/src/api";
import { GameButton, Icon, Img, ScreenHeader, Loader, EmptyState } from "@/src/components/ui";
import { useToast } from "@/src/toast";

const PLATFORM_ICON: Record<string, string> = {
  YouTube: "youtube",
  TikTok: "music-note",
  Instagram: "instagram",
  Twitch: "twitch",
  Twitter: "twitter",
  Telegram: "send",
  Discord: "discord",
};

export default function SubscribeGate() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  const subsQ = useQuery({ queryKey: ["subscriptions"], queryFn: () => api.get("/subscriptions") });
  const channels = subsQ.data?.channels || [];
  const allDone = subsQ.data?.all_done;

  const confirm = async (ch: any) => {
    setPending(ch.id);
    try {
      if (ch.url) await Linking.openURL(ch.url).catch(() => {});
      await api.post("/subscriptions/confirm", { channel_id: ch.id });
      await qc.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.show("تم تأكيد الاشتراك", "success");
    } catch (e: any) {
      toast.show(e?.message || "تعذر التأكيد", "error");
    } finally {
      setPending(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="اشترك لتدوير العجلة" onBack={() => router.back()} />
      {subsQ.isLoading ? (
        <Loader />
      ) : channels.length === 0 ? (
        <EmptyState icon="check-decagram" title="لا توجد شروط اشتراك" subtitle="يمكنك تدوير العجلة مباشرة" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={["#FDD84E", colors.brandPrimary, "#D99400"]} style={styles.hero}>
            <Icon name="lock-open-check" size={38} color={colors.onBrandPrimary} />
            <Text style={styles.heroTitle}>اشترك في القنوات التالية</Text>
            <Text style={styles.heroSub}>اشترك بكل الروابط لفتح عجلة الحظ</Text>
          </LinearGradient>

          {channels.map((ch: any) => (
            <View key={ch.id} style={[styles.row, ch.subscribed && styles.rowDone]} testID={`channel-${ch.id}`}>
              <View style={styles.chIcon}>
                {ch.image ? <Img uri={ch.image} style={{ width: "100%", height: "100%" }} /> : <Icon name={PLATFORM_ICON[ch.platform] || "web"} size={22} color={colors.brandSecondary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chTitle} numberOfLines={1}>{ch.title}</Text>
                <Text style={styles.chPlatform}>{ch.platform}</Text>
              </View>
              {ch.subscribed ? (
                <View style={styles.doneBadge}>
                  <Icon name="check-bold" size={16} color={colors.success} />
                  <Text style={styles.doneText}>تم</Text>
                </View>
              ) : (
                <Pressable style={styles.subBtn} onPress={() => confirm(ch)} disabled={pending === ch.id} testID={`subscribe-${ch.id}`}>
                  <Icon name="open-in-new" size={15} color={colors.onBrandPrimary} />
                  <Text style={styles.subText}>{pending === ch.id ? "..." : "اشترك"}</Text>
                </Pressable>
              )}
            </View>
          ))}

          <GameButton
            title={allDone ? "تم! عد إلى العجلة" : "أكمل الاشتراك بكل القنوات"}
            icon={allDone ? "ferris-wheel" : "lock"}
            disabled={!allDone}
            onPress={() => router.back()}
            testID="gate-done"
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { borderRadius: 20, padding: 22, alignItems: "center", gap: 4 },
  heroTitle: { color: colors.onBrandPrimary, fontSize: 20, fontFamily: fonts.textBold, marginTop: 6 },
  heroSub: { color: colors.onBrandPrimary, fontSize: 13, fontFamily: fonts.textRegular, opacity: 0.9 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 },
  rowDone: { borderColor: colors.success + "66", backgroundColor: colors.success + "12" },
  chIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  chTitle: { color: colors.onSurface, fontSize: 15, fontFamily: fonts.textBold },
  chPlatform: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular, marginTop: 2 },
  subBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.brandPrimary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  subText: { color: colors.onBrandPrimary, fontSize: 13, fontFamily: fonts.textBold },
  doneBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.success + "22", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  doneText: { color: colors.success, fontSize: 13, fontFamily: fonts.textBold },
}));
