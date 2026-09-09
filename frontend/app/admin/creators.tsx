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
  { key: "Twitch", label: "Twitch" },
  { key: "Twitter", label: "Twitter" },
];
const empty = { name: "", image: "", platform: "YouTube", subtitle: "", url: "", active: true, order: "0" };

export default function AdminCreators() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const listQ = useQuery({ queryKey: ["admin-creators"], queryFn: () => api.get("/admin/creators", true) });
  const set = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { toast.show("أدخل الاسم", "error"); return; }
    setSaving(true);
    const payload = { name: form.name.trim(), image: form.image.trim(), platform: form.platform, subtitle: form.subtitle.trim(), url: form.url.trim(), active: form.active, order: parseInt(form.order) || 0 };
    try {
      if (editingId) await api.put(`/admin/creators/${editingId}`, payload, true);
      else await api.post("/admin/creators", payload, true);
      toast.show("تم الحفظ", "success");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["admin-creators"] });
      qc.invalidateQueries({ queryKey: ["creators"] });
    } catch (e: any) { toast.show(e?.message || "تعذر الحفظ", "error"); } finally { setSaving(false); }
  };
  const remove = async (id: string) => {
    try { await api.del(`/admin/creators/${id}`, true); qc.invalidateQueries({ queryKey: ["admin-creators"] }); qc.invalidateQueries({ queryKey: ["creators"] }); toast.show("تم الحذف", "success"); }
    catch (e: any) { toast.show(e?.message || "تعذر الحذف", "error"); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="صناع المحتوى" onBack={() => router.back()} right={<Pressable onPress={() => { setForm({ ...empty }); setEditingId(null); }} testID="add-creator"><Icon name="plus-circle" size={28} color={colors.brandPrimary} /></Pressable>} />
      {listQ.isLoading ? <Loader /> : (
        <FlatList
          data={listQ.data || []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
          ListEmptyComponent={<EmptyState icon="video-vintage" title="لا يوجد صناع محتوى" subtitle="أضف أول قناة" />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatarWrap}><Img uri={item.image} style={styles.avatar} fallbackIcon="account-star" /></View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.sub} numberOfLines={1}>{item.platform}{item.subtitle ? ` · ${item.subtitle}` : ""}</Text>
                {!item.active ? <Text style={styles.hidden}>مخفي</Text> : null}
              </View>
              <View style={styles.actions}>
                <Pressable onPress={() => { setForm({ name: item.name, image: item.image || "", platform: item.platform, subtitle: item.subtitle || "", url: item.url || "", active: item.active, order: String(item.order ?? 0) }); setEditingId(item.id); }} style={styles.actBtn} testID={`edit-creator-${item.id}`}><Icon name="pencil" size={18} color={colors.brandSecondary} /></Pressable>
                <Pressable onPress={() => remove(item.id)} style={styles.actBtn} testID={`delete-creator-${item.id}`}><Icon name="trash-can" size={18} color={colors.error} /></Pressable>
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
                <Text style={styles.sheetTitle}>{editingId ? "تعديل" : "صانع محتوى جديد"}</Text>
                <Pressable onPress={() => setForm(null)}><Icon name="close" size={24} color={colors.muted} /></Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
                <Field label="الاسم" hint="اسم القناة أو صانع المحتوى" value={form.name} onChangeText={set("name")} testID="creator-name" />
                <ImageInput value={form.image} onChange={set("image")} label="صورة القناة" />
                <View style={{ height: 16 }} />
                <SegmentPicker label="المنصة" hint="المنصة التي ينشر عليها المحتوى" options={PLATFORM_OPTS} value={form.platform} onChange={set("platform")} />
                <Field label="وصف مختصر" hint="نبذة تظهر أسفل الاسم" value={form.subtitle} onChangeText={set("subtitle")} />
                <Field label="الرابط" hint="رابط القناة الذي يُفتح عند الضغط" value={form.url} onChangeText={set("url")} placeholder="https://..." />
                <Field label="الترتيب" hint="ترتيب الظهور (الأصغر أولاً)" value={form.order} onChangeText={set("order")} keyboardType="numeric" />
                <Toggle label="مفعّل" value={form.active} onChange={set("active")} testID="creator-active" />
                <GameButton title="حفظ" icon="content-save" onPress={save} loading={saving} testID="save-creator" />
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
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 },
  avatarWrap: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: colors.brandPrimary, overflow: "hidden" },
  avatar: { width: "100%", height: "100%" },
  name: { color: colors.onSurface, fontSize: 15, fontFamily: fonts.textBold },
  sub: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular },
  hidden: { color: colors.error, fontSize: 11, fontFamily: fonts.textSemiBold },
  actions: { gap: 8 },
  actBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, maxHeight: "92%" },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { color: colors.onSurface, fontSize: 19, fontFamily: fonts.textBold },
}));
