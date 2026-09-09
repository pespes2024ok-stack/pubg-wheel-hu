import { useState } from "react";
import { View, Text, FlatList, Pressable, Modal, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { api } from "@/src/api";
import { GameButton, Icon, Img, Coin, ScreenHeader, Loader, EmptyState } from "@/src/components/ui";
import { useToast } from "@/src/toast";

export default function AdminUsers() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [target, setTarget] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const usersQ = useQuery({ queryKey: ["admin-users"], queryFn: () => api.get("/admin/users", true) });

  const adjust = async (sign: number) => {
    const amt = (parseInt(amount) || 0) * sign;
    if (!amt) { toast.show("أدخل عدد النقاط", "error"); return; }
    setSaving(true);
    try {
      await api.post(`/admin/users/${target.user_id}/points`, { amount: amt, reason: reason.trim() || "تعديل الأدمن" }, true);
      toast.show("تم تعديل النقاط", "success");
      setTarget(null); setAmount(""); setReason("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) { toast.show(e?.message || "تعذر التعديل", "error"); } finally { setSaving(false); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="المستخدمون" onBack={() => router.back()} />
      {usersQ.isLoading ? <Loader /> : (
        <FlatList
          data={usersQ.data || []}
          keyExtractor={(i) => i.user_id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
          ListEmptyComponent={<EmptyState icon="account-group" title="لا يوجد مستخدمون بعد" />}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => { setTarget(item); setAmount(""); setReason(""); }} testID={`user-${item.user_id}`}>
              <View style={styles.avatarWrap}><Img uri={item.picture || item.avatar} style={styles.avatar} fallbackIcon="account" /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name || "لاعب"}</Text>
                <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
                <View style={styles.metaRow}>
                  <Coin points={item.points} size={13} />
                  <Text style={styles.ref}>· إحالات: {item.referrals_count ?? 0}</Text>
                </View>
              </View>
              <Icon name="pencil-box" size={22} color={colors.brandSecondary} />
            </Pressable>
          )}
        />
      )}

      {target ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setTarget(null)}>
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>تعديل نقاط {target.name || "المستخدم"}</Text>
              <Text style={styles.modalBalance}>الرصيد الحالي: {target.points} نقطة</Text>
              <TextInput value={amount} onChangeText={setAmount} placeholder="عدد النقاط" placeholderTextColor={colors.muted} keyboardType="numeric" style={styles.input} testID="points-amount" />
              <TextInput value={reason} onChangeText={setReason} placeholder="السبب (اختياري)" placeholderTextColor={colors.muted} style={styles.input} />
              <View style={styles.btnRow}>
                <GameButton title="خصم" icon="minus" variant="outline" onPress={() => adjust(-1)} loading={saving} testID="deduct-points" style={{ flex: 1 }} />
                <GameButton title="إضافة" icon="plus" onPress={() => adjust(1)} loading={saving} testID="add-points" style={{ flex: 1 }} />
              </View>
              <Pressable onPress={() => setTarget(null)} style={{ alignItems: "center", paddingVertical: 10 }}><Text style={styles.cancel}>إغلاق</Text></Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 },
  avatarWrap: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: colors.border, overflow: "hidden" },
  avatar: { width: "100%", height: "100%" },
  name: { color: colors.onSurface, fontSize: 15, fontFamily: fonts.textBold },
  email: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  ref: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 28 },
  modalCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 20, width: "100%", maxWidth: 360, gap: 12 },
  modalTitle: { color: colors.onSurface, fontSize: 18, fontFamily: fonts.textBold, textAlign: "center" },
  modalBalance: { color: colors.brandSecondary, fontSize: 14, fontFamily: fonts.textSemiBold, textAlign: "center" },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 11, color: colors.onSurface, fontSize: 15, fontFamily: fonts.textRegular, textAlign: "right" },
  btnRow: { flexDirection: "row", gap: 12 },
  cancel: { color: colors.muted, fontSize: 14, fontFamily: fonts.textSemiBold },
}));
