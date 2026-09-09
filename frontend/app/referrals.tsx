import { useState } from "react";
import { View, Text, Pressable, Share, TextInput, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { GameButton, Icon, ScreenHeader } from "@/src/components/ui";
import { GuestLock } from "@/src/components/guest-lock";
import { useToast } from "@/src/toast";

export default function Referrals() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings") });
  const bonus = settings?.referral_bonus ?? 50;

  const share = async () => {
    try {
      await Share.share({ message: `انضم إليّ في تطبيق هيبة HEEBA واربح جوائز PUBG! استخدم رمز الإحالة: ${user?.referral_code}` });
    } catch {}
  };

  const apply = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      await api.post("/referrals/apply", { code: code.trim() });
      toast.show(`تمت الإضافة! ربحت ${bonus} نقطة`, "success");
      setCode("");
      refresh();
    } catch (e: any) {
      toast.show(e?.message || "تعذر التطبيق", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="ادعُ أصدقاءك" onBack={() => router.back()} />
      {!user ? (
        <GuestLock title="ادعُ أصدقاءك واربح" subtitle="سجّل الدخول للحصول على رمز الإحالة الخاص بك وكسب النقاط" icon="account-multiple-plus-outline" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#FDD84E", colors.brandPrimary, "#D99400"]} style={styles.hero}>
          <Icon name="account-multiple-plus" size={40} color={colors.onBrandPrimary} />
          <Text style={styles.heroTitle}>اربح {bonus} نقطة</Text>
          <Text style={styles.heroSub}>لكل صديق يستخدم رمز الإحالة الخاص بك</Text>
        </LinearGradient>

        <View style={styles.codeCard}>
          <Text style={styles.label}>رمز الإحالة الخاص بك</Text>
          <View style={styles.codeBox}>
            <Text style={styles.code}>{user?.referral_code}</Text>
            <Pressable onPress={share} style={styles.shareBtn} testID="share-code">
              <Icon name="share-variant" size={18} color={colors.onBrandPrimary} />
            </Pressable>
          </View>
          <View style={styles.statRow}>
            <Icon name="account-group" size={18} color={colors.success} />
            <Text style={styles.statText}>عدد إحالاتك: {user?.referrals_count ?? 0}</Text>
          </View>
        </View>

        {!user?.referral_applied ? (
          <View style={styles.applyCard}>
            <Text style={styles.label}>هل لديك رمز إحالة؟</Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="أدخل الرمز"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              style={styles.input}
              testID="referral-input"
            />
            <GameButton title="تطبيق الرمز" icon="ticket-confirmation" onPress={apply} loading={busy} testID="apply-referral" style={{ marginTop: 12 }} />
          </View>
        ) : (
          <View style={styles.appliedCard} testID="referral-applied">
            <Icon name="check-decagram" size={22} color={colors.success} />
            <Text style={styles.appliedText}>لقد استخدمت رمز إحالة مسبقاً</Text>
          </View>
        )}
      </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { borderRadius: 20, padding: 24, alignItems: "center", gap: 6 },
  heroTitle: { color: colors.onBrandPrimary, fontSize: 26, fontFamily: fonts.textBold, marginTop: 6 },
  heroSub: { color: colors.onBrandPrimary, fontSize: 14, fontFamily: fonts.textRegular, textAlign: "center", opacity: 0.9 },
  codeCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 },
  label: { color: colors.onSurfaceSecondary, fontSize: 14, fontFamily: fonts.textSemiBold },
  codeBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceTertiary, borderRadius: 12, borderWidth: 1, borderColor: colors.brandSecondary + "55", borderStyle: "dashed", padding: 6, paddingStart: 16 },
  code: { flex: 1, color: colors.brandSecondary, fontSize: 26, fontFamily: fonts.displayBold, letterSpacing: 4 },
  shareBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statText: { color: colors.onSurfaceSecondary, fontSize: 14, fontFamily: fonts.textSemiBold },
  applyCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 13, color: colors.onSurface, fontSize: 16, fontFamily: fonts.displayBold, letterSpacing: 3, textAlign: "center", marginTop: 8 },
  appliedCard: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.success + "18", borderRadius: 16, borderWidth: 1, borderColor: colors.success + "55", padding: 16 },
  appliedText: { color: colors.success, fontSize: 14, fontFamily: fonts.textSemiBold },
}));
