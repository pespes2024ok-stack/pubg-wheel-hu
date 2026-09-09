import { useState } from "react";
import { View, Text, ScrollView, Pressable, ImageBackground, Modal, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { GameButton, Icon, Img, Loader } from "@/src/components/ui";
import { GuestLock } from "@/src/components/guest-lock";
import { useBackgrounds, pickBackground } from "@/src/hooks";
import { useToast } from "@/src/toast";

const TX_META: Record<string, { icon: string; label: string }> = {
  spin: { icon: "ferris-wheel", label: "عجلة الحظ" },
  purchase: { icon: "cart", label: "شراء" },
  referral: { icon: "account-multiple-plus", label: "إحالة" },
  bonus: { icon: "gift", label: "مكافأة" },
  admin: { icon: "shield-crown", label: "تعديل الأدمن" },
};

export default function Profile() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, signOut, refresh } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings") });
  const bgs = useBackgrounds();
  const profileBg = pickBackground(bgs.data, "profile", settings?.profile_background);
  const txQ = useQuery({ queryKey: ["transactions"], queryFn: () => api.get("/transactions"), enabled: !!user });

  const saveAvatar = async () => {
    if (!avatarUrl.trim()) return;
    try {
      await api.post("/me/avatar", { avatar: avatarUrl.trim() });
      toast.show("تم تحديث الصورة", "success");
      setEditing(false);
      setAvatarUrl("");
      refresh();
    } catch (e: any) {
      toast.show(e?.message || "تعذر التحديث", "error");
    }
  };

  if (!user) return <GuestLock title="ملف اللاعب" subtitle="سجّل الدخول لعرض نقاطك وإحالاتك وجوائزك وسجل عملياتك" icon="account-circle-outline" />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground source={{ uri: profileBg || "" }} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <LinearGradient colors={["rgba(15,17,21,0.5)", "rgba(15,17,21,0.9)"]} style={styles.heroOverlay} />
          <View style={styles.avatarWrap}>
            <Img uri={user.picture} style={styles.avatar} fallbackIcon="account" />
            <Pressable style={styles.editBtn} onPress={() => setEditing(true)} testID="edit-avatar">
              <Icon name="pencil" size={14} color={colors.onBrandPrimary} />
            </Pressable>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </ImageBackground>

        {/* Stats */}
        <View style={styles.stats}>
          <Stat icon="hexagon-multiple" value={user.points} label="النقاط" color={colors.brandSecondary} />
          <View style={styles.statDivider} />
          <Stat icon="account-multiple" value={user.referrals_count} label="الإحالات" color={colors.success} />
          <View style={styles.statDivider} />
          <Stat icon="trophy" value={user.rewards_count} label="الجوائز" color={colors.brandPrimary} />
        </View>

        {/* Points history */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={styles.accent} />
              <Text style={styles.sectionTitle}>سجل النقاط</Text>
            </View>
          </View>
          {txQ.isLoading ? (
            <Loader />
          ) : (txQ.data || []).length === 0 ? (
            <Text style={styles.emptyTx}>لا توجد عمليات بعد</Text>
          ) : (
            (txQ.data || []).map((tx: any) => {
              const meta = TX_META[tx.type] || { icon: "swap-horizontal", label: tx.type };
              const positive = tx.amount >= 0;
              return (
                <View key={tx.id} style={styles.txRow} testID={`tx-${tx.id}`}>
                  <View style={styles.txIcon}>
                    <Icon name={meta.icon} size={18} color={colors.onSurfaceSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                    <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString("ar")}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: positive ? colors.success : colors.error }]}>
                    {positive ? "+" : ""}{tx.amount}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <GameButton title="تسجيل الخروج" icon="logout" variant="outline" onPress={signOut} testID="logout-button" />
        </View>
      </ScrollView>

      {/* Edit avatar modal */}
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>تغيير الصورة</Text>
            <Text style={styles.modalHint}>الصق رابط صورة (URL)</Text>
            <TextInput
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://..."
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoCapitalize="none"
              testID="avatar-url-input"
            />
            <GameButton title="حفظ" onPress={saveAvatar} testID="save-avatar" style={{ marginTop: 12 }} />
            <Pressable onPress={() => setEditing(false)} style={{ alignItems: "center", paddingVertical: 12 }}>
              <Text style={styles.cancel}>إلغاء</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Stat({ icon, value, label, color }: any) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 240, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary },
  heroOverlay: { ...StyleSheetAbsolute() },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: colors.brandPrimary },
  editBtn: { position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface },
  name: { color: colors.onSurface, fontSize: 22, fontFamily: fonts.textBold },
  email: { color: colors.onSurfaceTertiary, fontSize: 13, fontFamily: fonts.textRegular, marginTop: 2 },
  stats: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, marginHorizontal: 16, marginTop: -24, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 16 },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 24, fontFamily: fonts.displayBold },
  statLabel: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular },
  statDivider: { width: 1, height: 40, backgroundColor: colors.divider },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHead: { marginBottom: 12 },
  accent: { width: 4, height: 18, borderRadius: 2, backgroundColor: colors.brandPrimary },
  sectionTitle: { color: colors.onSurface, fontSize: 17, fontFamily: fonts.textBold },
  emptyTx: { color: colors.muted, fontSize: 13, fontFamily: fonts.textRegular, textAlign: "center", paddingVertical: 20 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8 },
  txIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  txDesc: { color: colors.onSurface, fontSize: 14, fontFamily: fonts.textSemiBold },
  txDate: { color: colors.muted, fontSize: 11, fontFamily: fonts.textRegular, marginTop: 2 },
  txAmount: { fontSize: 18, fontFamily: fonts.displayBold },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 28 },
  modalCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 20, width: "100%", maxWidth: 360 },
  modalTitle: { color: colors.onSurface, fontSize: 18, fontFamily: fonts.textBold, textAlign: "center" },
  modalHint: { color: colors.muted, fontSize: 13, fontFamily: fonts.textRegular, textAlign: "center", marginTop: 4, marginBottom: 12 },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, color: colors.onSurface, fontSize: 14, fontFamily: fonts.textRegular, textAlign: "left" },
  cancel: { color: colors.muted, fontSize: 14, fontFamily: fonts.textSemiBold },
}));

function StyleSheetAbsolute() {
  return { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
}
