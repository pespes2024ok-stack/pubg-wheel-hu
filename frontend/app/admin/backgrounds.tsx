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

const TARGET_OPTS = [
  { key: "login", label: "شاشة الدخول" },
  { key: "home", label: "الرئيسية" },
  { key: "profile", label: "الملف" },
  { key: "wheel", label: "العجلة" },
  { key: "store", label: "المتجر" },
  { key: "general", label: "عام" },
];
const TARGET_LABEL: Record<string, string> = Object.fromEntries(TARGET_OPTS.map((t) => [t.key, t.label]));
const empty = { title: "", image: "", target: "home", active: true, order: "0" };

export default function AdminBackgrounds() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const listQ = useQuery({ queryKey: ["admin-backgrounds"], queryFn: () => api.get("/admin/backgrounds", true) });
  const set = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-backgrounds"] });
    qc.invalidateQueries({ queryKey: ["backgrounds"] });
  };

  const save = async () => {
    if (!form.image.trim()) { toast.show("أضف صورة الخلفية", "error"); return; }
    setSaving(true);
    const payload = { title: form.title.trim(), image: form.image.trim(), target: form.target, active: form.active, order: parseInt(form.order) || 0 };
    try {
      if (editingId) await api.put(`/admin/backgrounds/${editingId}`, payload, true);
      else await api.post("/admin/backgrounds", payload, true);
      toast.show("تم الحفظ", "success");
      setForm(null);
      refreshAll();
    } catch (e: any) { toast.show(e?.message || "تعذر الحفظ", "error"); } finally { setSaving(false); }
  };
  const remove = async (id: string) => {
    try { await api.del(`/admin/backgrounds/${id}`, true); refreshAll(); toast.show("تم الحذف", "success"); }
    catch (e: any) { toast.show(e?.message || "تعذر الحذف", "error"); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="خلفيات التطبيق" onBack={() => router.back()} right={<Pressable onPress={() => { setForm({ ...empty }); setEditingId(null); }} testID="add-bg"><Icon name="plus-circle" size={28} color={colors.brandPrimary} /></Pressable>} />
      {listQ.isLoading ? <Loader /> : (
        <FlatList
          data={listQ.data || []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
          ListHeaderComponent={
            <View style={styles.tip}>
              <Icon name="information-outline" size={16} color={colors.brandSecondary} />
              <Text style={styles.tipText}>لكل شاشة خلفية خاصة. تُستخدم أول خلفية مفعّلة لكل شاشة. عند الحذف تعود الخلفية الافتراضية.</Text>
            </View>
          }
          ListEmptyComponent={<EmptyState icon="image-multiple" title="لا توجد خلفيات" subtitle="أضف أول خلفية للتطبيق" />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.imgWrap}><Img uri={item.image} style={styles.img} fallbackIcon="image" /></View>
              <View style={styles.cardBody}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.title} numberOfLines={1}>{item.title || "خلفية"}</Text>
                  <View style={styles.tags}>
                    <View style={styles.targetTag}><Text style={styles.targetText}>{TARGET_LABEL[item.target] || item.target}</Text></View>
                    {!item.active ? <Text style={styles.hidden}>مخفية</Text> : null}
                  </View>
                </View>
                <View style={styles.actions}>
                  <Pressable onPress={() => { setForm({ title: item.title || "", image: item.image || "", target: item.target, active: item.active, order: String(item.order ?? 0) }); setEditingId(item.id); }} style={styles.actBtn} testID={`edit-bg-${item.id}`}><Icon name="pencil" size={18} color={colors.brandSecondary} /></Pressable>
                  <Pressable onPress={() => remove(item.id)} style={styles.actBtn} testID={`delete-bg-${item.id}`}><Icon name="trash-can" size={18} color={colors.error} /></Pressable>
                </View>
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
                <Text style={styles.sheetTitle}>{editingId ? "تعديل الخلفية" : "خلفية جديدة"}</Text>
                <Pressable onPress={() => setForm(null)}><Icon name="close" size={24} color={colors.muted} /></Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
                <ImageInput value={form.image} onChange={set("image")} label="صورة الخلفية (رفع من الجهاز أو رابط)" />
                <View style={{ height: 16 }} />
                <Field label="العنوان (اختياري)" hint="اسم للتمييز فقط داخل اللوحة" value={form.title} onChangeText={set("title")} />
                <SegmentPicker label="الشاشة المستهدفة" hint="أين تظهر هذه الخلفية؟ (عام = تُستخدم كبديل لأي شاشة)" options={TARGET_OPTS} value={form.target} onChange={set("target")} />
                <Field label="الترتيب" hint="عند وجود أكثر من خلفية لنفس الشاشة تُستخدم صاحبة الرقم الأصغر" value={form.order} onChangeText={set("order")} keyboardType="numeric" />
                <Toggle label="مفعّلة" hint="عند الإيقاف لا تُستخدم هذه الخلفية" value={form.active} onChange={set("active")} testID="bg-active" />
                <GameButton title="حفظ" icon="content-save" onPress={save} loading={saving} testID="save-bg" />
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
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  imgWrap: { height: 130, backgroundColor: colors.surfaceTertiary },
  img: { width: "100%", height: "100%" },
  cardBody: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  title: { color: colors.onSurface, fontSize: 15, fontFamily: fonts.textBold },
  tags: { flexDirection: "row", alignItems: "center", gap: 8 },
  targetTag: { backgroundColor: colors.surfaceTertiary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  targetText: { color: colors.brandSecondary, fontSize: 11, fontFamily: fonts.textSemiBold },
  hidden: { color: colors.error, fontSize: 11, fontFamily: fonts.textSemiBold },
  actions: { flexDirection: "row", gap: 8 },
  actBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, maxHeight: "92%" },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { color: colors.onSurface, fontSize: 19, fontFamily: fonts.textBold },
}));
