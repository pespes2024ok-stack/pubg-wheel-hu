import { useState } from "react";
import { View, Text, FlatList, Pressable, Modal, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { api } from "@/src/api";
import { GameButton, Icon, Img, ScreenHeader, Loader, EmptyState } from "@/src/components/ui";
import { Field, SegmentPicker, Toggle } from "@/src/components/admin-fields";
import { ImageInput } from "@/src/components/image-input";
import { useToast } from "@/src/toast";

const PLATFORM_OPTS = [
  { key: "YouTube", label: "YouTube" },
  { key: "TikTok", label: "TikTok" },
  { key: "Instagram", label: "Instagram" },
  { key: "Telegram", label: "Telegram" },
  { key: "Discord", label: "Discord" },
  { key: "Twitter", label: "Twitter" },
];
const empty = { title: "", url: "", platform: "YouTube", image: "", active: true, order: "0" };

export default function AdminChannels() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const listQ = useQuery({ queryKey: ["admin-channels"], queryFn: () => api.get("/admin/channels", true) });
  const set = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-channels"] });
    qc.invalidateQueries({ queryKey: ["subscriptions"] });
  };

  const save = async () => {
    if (!form.title.trim()) { toast.show("أدخل اسم القناة", "error"); return; }
    setSaving(true);
    const payload = { title: form.title.trim(), url: form.url.trim(), platform: form.platform, image: form.image.trim(), active: form.active, order: parseInt(form.order) || 0 };
    try {
      if (editingId) await api.put(`/admin/channels/${editingId}`, payload, true);
      else await api.post("/admin/channels", payload, true);
      toast.show("تم الحفظ", "success");
      setForm(null);
      refreshAll();
    } catch (e: any) { toast.show(e?.message || "تعذر الحفظ", "error"); } finally { setSaving(false); }
  };
  const remove = async (id: string) => {
    try { await api.del(`/admin/channels/${id}`, true); refreshAll(); toast.show("تم الحذف", "success"); }
    catch (e: any) { toast.show(e?.message || "تعذر الحذف", "error"); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="اشتراك العجلة الإجباري" onBack={() => router.back()} right={<Pressable onPress={() => { setForm({ ...empty }); setEditingId(null); }} testID="add-channel"><Icon name="plus-circle" size={28} color={colors.brandPrimary} /></Pressable>} />
      {listQ.isLoading ? <Loader /> : (
        <FlatList
          data={listQ.data || []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
          ListHeaderComponent={
            <View style={styles.tip}>
              <Icon name="information-outline" size={16} color={colors.brandSecondary} />
              <Text style={styles.tipText}>هذه الروابط إجبارية: لن يتمكن المستخدم من تدوير العجلة قبل الاشتراك بجميع القنوات المفعّلة. إن حذفت الكل يصبح التدوير مفتوحاً.</Text>
            </View>
          }
          ListEmptyComponent={<EmptyState icon="lock-open-check" title="لا توجد قنوات إجبارية" subtitle="أضف روابط يجب الاشتراك بها قبل التدوير" />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.chIcon}>{item.image ? <Img uri={item.image} style={{ width: "100%", height: "100%" }} /> : <Icon name="link-variant" size={20} color={colors.brandSecondary} />}</View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.sub} numberOfLines={1}>{item.platform}{item.url ? ` · ${item.url}` : ""}</Text>
                {!item.active ? <Text style={styles.hidden}>معطّلة</Text> : null}
              </View>
              <View style={styles.actions}>
                <Pressable onPress={() => { setForm({ title: item.title, url: item.url || "", platform: item.platform, image: item.image || "", active: item.active, order: String(item.order ?? 0) }); setEditingId(item.id); }} style={styles.actBtn} testID={`edit-channel-${item.id}`}><Icon name="pencil" size={18} color={colors.brandSecondary} /></Pressable>
                <Pressable onPress={() => remove(item.id)} style={styles.actBtn} testID={`delete-channel-${item.id}`}><Icon name="trash-can" size={18} color={colors.error} /></Pressable>
              </View>
            </View>
          )}
        />
      )}
      {form ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setForm(null)}>
          <View style={styles.modalBg}>
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle}>{editingId ? "تعديل القناة" : "قناة إجبارية جديدة"}</Text>
                <Pressable onPress={() => setForm(null)}><Icon name="close" size={24} color={colors.muted} /></Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
                <Field label="اسم القناة" hint="الاسم الظاهر للمستخدم في شاشة الاشتراك" value={form.title} onChangeText={set("title")} testID="channel-title" />
                <Field label="الرابط" hint="الرابط الذي يُفتح للمستخدم للاشتراك" value={form.url} onChangeText={set("url")} placeholder="https://..." testID="channel-url" />
                <SegmentPicker label="المنصة" hint="تحدد الأيقونة الظاهرة" options={PLATFORM_OPTS} value={form.platform} onChange={set("platform")} />
                <ImageInput value={form.image} onChange={set("image")} label="شعار القناة (اختياري)" />
                <View style={{ height: 16 }} />
                <Field label="الترتيب" hint="ترتيب الظهور (الأصغر أولاً)" value={form.order} onChangeText={set("order")} keyboardType="numeric" />
                <Toggle label="إجبارية ومفعّلة" hint="عند الإيقاف لا تُحتسب ضمن شروط التدوير" value={form.active} onChange={set("active")} testID="channel-active" />
                <GameButton title="حفظ" icon="content-save" onPress={save} loading={saving} testID="save-channel" />
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  tip: { flexDirection: "row", gap: 8, backgroundColor: colors.brandSecondary + "18", borderWidth: 1, borderColor: colors.brandSecondary + "44", borderRadius: 12, padding: 12, marginBottom: 4 },
  tipText: { color: colors.onSurfaceSecondary, fontSize: 12, fontFamily: fonts.textRegular, flexShrink: 1, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 },
  chIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  name: { color: colors.onSurface, fontSize: 15, fontFamily: fonts.textBold },
  sub: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular },
  hidden: { color: colors.error, fontSize: 11, fontFamily: fonts.textSemiBold },
  actions: { flexDirection: "row", gap: 8 },
  actBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, maxHeight: "92%" },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { color: colors.onSurface, fontSize: 19, fontFamily: fonts.textBold },
}));
