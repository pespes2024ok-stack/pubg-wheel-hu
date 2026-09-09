import { useState } from "react";
import { View, Text, FlatList, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { api } from "@/src/api";
import { GameButton, Icon, ScreenHeader, Loader, EmptyState } from "@/src/components/ui";
import { useToast } from "@/src/toast";

export default function AdminNotifications() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const listQ = useQuery({ queryKey: ["admin-notifications"], queryFn: () => api.get("/admin/notifications", true) });

  const send = async () => {
    if (!title.trim() || !message.trim()) { toast.show("أدخل العنوان والنص", "error"); return; }
    setSending(true);
    try {
      await api.post("/admin/notifications", { title: title.trim(), message: message.trim() }, true);
      toast.show("تم إرسال الإشعار", "success");
      setTitle(""); setMessage("");
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
    } catch (e: any) { toast.show(e?.message || "تعذر الإرسال", "error"); } finally { setSending(false); }
  };

  const remove = async (id: string) => {
    try { await api.del(`/admin/notifications/${id}`, true); qc.invalidateQueries({ queryKey: ["admin-notifications"] }); toast.show("تم الحذف", "success"); }
    catch (e: any) { toast.show(e?.message || "تعذر الحذف", "error"); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="الإشعارات" onBack={() => router.back()} />
      {listQ.isLoading ? <Loader /> : (
        <FlatList
          data={listQ.data || []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
          ListHeaderComponent={
            <View style={styles.composer}>
              <Text style={styles.composerTitle}>إرسال إشعار جديد</Text>
              <Text style={styles.hint}>يصل الإشعار لجميع المستخدمين (داخل التطبيق + إشعار Push بعد النشر)</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="العنوان" placeholderTextColor={colors.muted} style={styles.input} testID="notif-title" />
              <TextInput value={message} onChangeText={setMessage} placeholder="نص الإشعار" placeholderTextColor={colors.muted} multiline style={[styles.input, { height: 80, textAlignVertical: "top" }]} testID="notif-message" />
              <GameButton title="إرسال للجميع" icon="send" onPress={send} loading={sending} testID="send-notif" style={{ marginTop: 4 }} />
              <Text style={styles.historyLabel}>السجل</Text>
            </View>
          }
          ListEmptyComponent={<EmptyState icon="bell-outline" title="لا توجد إشعارات مرسلة" />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.iconWrap}><Icon name="bell-ring" size={18} color={colors.brandPrimary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.notifMsg} numberOfLines={2}>{item.message}</Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleString("ar")}</Text>
              </View>
              <Pressable onPress={() => remove(item.id)} style={styles.actBtn} testID={`delete-notif-${item.id}`}><Icon name="trash-can" size={18} color={colors.error} /></Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  composer: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10, marginBottom: 8 },
  composerTitle: { color: colors.onSurface, fontSize: 17, fontFamily: fonts.textBold },
  hint: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular, lineHeight: 17 },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 11, color: colors.onSurface, fontSize: 15, fontFamily: fonts.textRegular, textAlign: "right" },
  historyLabel: { color: colors.onSurfaceSecondary, fontSize: 14, fontFamily: fonts.textBold, marginTop: 8 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  notifTitle: { color: colors.onSurface, fontSize: 15, fontFamily: fonts.textBold },
  notifMsg: { color: colors.onSurfaceSecondary, fontSize: 13, fontFamily: fonts.textRegular, marginTop: 2 },
  date: { color: colors.muted, fontSize: 11, fontFamily: fonts.textRegular, marginTop: 4 },
  actBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
}));
