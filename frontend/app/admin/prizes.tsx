import { useState } from "react";
import { View, Text, FlatList, Pressable, Modal, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts, rarityColor } from "@/src/theme";
import { api } from "@/src/api";
import { GameButton, Icon, Img, RarityBadge, ScreenHeader, Loader, EmptyState } from "@/src/components/ui";
import { Field, SegmentPicker, Toggle } from "@/src/components/admin-fields";
import { ImageInput } from "@/src/components/image-input";
import { useToast } from "@/src/toast";

const RARITY_OPTS = [
  { key: "common", label: "عادي", color: "#9E9E9E" },
  { key: "rare", label: "نادر", color: "#4CAF50" },
  { key: "epic", label: "ملحمي", color: "#FF5722" },
  { key: "legendary", label: "أسطوري", color: "#FFD700" },
];
const KIND_OPTS = [
  { key: "points", label: "نقاط" },
  { key: "item", label: "جائزة" },
  { key: "nothing", label: "حظ أوفر" },
];

const empty = {
  name: "", image: "", description: "", value: "", rarity: "common", kind: "points",
  points_reward: "0", win_chance: "10", quantity: "-1", active: true, order: "0",
};

export default function AdminPrizes() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const listQ = useQuery({ queryKey: ["admin-prizes"], queryFn: () => api.get("/admin/prizes", true) });

  const openNew = () => { setForm({ ...empty }); setEditingId(null); };
  const openEdit = (p: any) => {
    setForm({
      name: p.name, image: p.image || "", description: p.description || "", value: p.value || "",
      rarity: p.rarity, kind: p.kind, points_reward: String(p.points_reward ?? 0),
      win_chance: String(p.win_chance ?? 0), quantity: String(p.quantity ?? -1), active: p.active, order: String(p.order ?? 0),
    });
    setEditingId(p.id);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.show("أدخل اسم الجائزة", "error"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(), image: form.image.trim(), description: form.description.trim(), value: form.value.trim(),
      rarity: form.rarity, kind: form.kind, points_reward: parseInt(form.points_reward) || 0,
      win_chance: parseFloat(form.win_chance) || 0, quantity: parseInt(form.quantity),
      remaining: parseInt(form.quantity), active: form.active, order: parseInt(form.order) || 0,
    };
    try {
      if (editingId) await api.put(`/admin/prizes/${editingId}`, payload, true);
      else await api.post("/admin/prizes", payload, true);
      toast.show("تم الحفظ", "success");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["admin-prizes"] });
      qc.invalidateQueries({ queryKey: ["wheel-prizes"] });
    } catch (e: any) {
      toast.show(e?.message || "تعذر الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.del(`/admin/prizes/${id}`, true);
      toast.show("تم الحذف", "success");
      qc.invalidateQueries({ queryKey: ["admin-prizes"] });
      qc.invalidateQueries({ queryKey: ["wheel-prizes"] });
    } catch (e: any) {
      toast.show(e?.message || "تعذر الحذف", "error");
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="جوائز العجلة" onBack={() => router.back()} right={<Pressable onPress={openNew} testID="add-prize"><Icon name="plus-circle" size={28} color={colors.brandPrimary} /></Pressable>} />
      {listQ.isLoading ? (
        <Loader />
      ) : (
        <FlatList
          data={listQ.data || []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
          ListHeaderComponent={
            <View style={styles.tip}>
              <Icon name="lightbulb-on" size={16} color={colors.brandSecondary} />
              <Text style={styles.tipText}>نسبة الفوز الحقيقية: مجموع النسب لا يشترط أن يساوي 100. جائزة بنسبة 0 لن يفوز بها أحد.</Text>
            </View>
          }
          ListEmptyComponent={<EmptyState icon="ferris-wheel" title="لا توجد جوائز" subtitle="أضف أول جائزة للعجلة" />}
          renderItem={({ item }) => {
            const rc = rarityColor(item.rarity, colors);
            return (
              <View style={[styles.row, { borderColor: rc + "55" }]}>
                <View style={[styles.imgWrap, { borderColor: rc }]}>
                  <Img uri={item.image} style={styles.img} fallbackIcon={item.kind === "points" ? "hexagon-multiple" : item.kind === "nothing" ? "emoticon-sad" : "gift"} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.metaRow}>
                    <RarityBadge rarity={item.rarity} size="sm" />
                    <View style={styles.chanceTag}>
                      <Icon name="percent" size={11} color={item.win_chance > 0 ? colors.success : colors.error} />
                      <Text style={[styles.chanceText, { color: item.win_chance > 0 ? colors.success : colors.error }]}>{item.win_chance}</Text>
                    </View>
                    {!item.active ? <Text style={styles.hidden}>مخفية</Text> : null}
                  </View>
                  <Text style={styles.sub}>
                    {item.kind === "points" ? `+${item.points_reward} نقطة` : item.kind === "nothing" ? "بدون جائزة" : "جائزة"} · الكمية: {item.quantity < 0 ? "∞" : item.remaining}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable onPress={() => openEdit(item)} style={styles.actBtn} testID={`edit-prize-${item.id}`}><Icon name="pencil" size={18} color={colors.brandSecondary} /></Pressable>
                  <Pressable onPress={() => remove(item.id)} style={styles.actBtn} testID={`delete-prize-${item.id}`}><Icon name="trash-can" size={18} color={colors.error} /></Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      <FormModal
        form={form} setForm={setForm} onClose={() => setForm(null)} onSave={save} saving={saving} editing={!!editingId}
        title={editingId ? "تعديل الجائزة" : "جائزة جديدة"} colors={colors} styles={styles}
      />
    </View>
  );
}

function FormModal({ form, setForm, onClose, onSave, saving, editing, title, colors, styles }: any) {
  const insets = useSafeAreaInsets();
  if (!form) return null;
  const set = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose}><Icon name="close" size={24} color={colors.muted} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
            <Field label="اسم الجائزة" hint="الاسم الظاهر للمستخدم، مثل: 60 UC أو صندوق أسطوري" value={form.name} onChangeText={set("name")} placeholder="اسم الجائزة" testID="prize-name" />
            <ImageInput value={form.image} onChange={set("image")} label="صورة الجائزة (اختياري)" />
            <View style={{ height: 16 }} />
            <Field label="الوصف (اختياري)" hint="تفاصيل تظهر للمستخدم عند الفوز" value={form.description} onChangeText={set("description")} multiline />
            <Field label="النص المختصر على العجلة" hint="يظهر داخل شريحة العجلة (اجعله قصيراً)، مثل: 60 UC أو 100" value={form.value} onChangeText={set("value")} placeholder="مثال: 100" />
            <SegmentPicker label="نوع الجائزة" hint="نقاط = تُضاف لرصيد المستخدم · جائزة = تُضاف لمقتنياته · حظ أوفر = بدون فوز" options={KIND_OPTS} value={form.kind} onChange={set("kind")} />
            {form.kind === "points" ? (
              <Field label="عدد النقاط الممنوحة" hint="النقاط التي يحصل عليها المستخدم عند الفوز بهذه الشريحة" value={form.points_reward} onChangeText={set("points_reward")} keyboardType="numeric" placeholder="0" testID="prize-points" />
            ) : null}
            <SegmentPicker label="مستوى الندرة" hint="يحدد لون الشريحة ومؤثرات الفوز (الأسطوري بمؤثر خاص)" options={RARITY_OPTS} value={form.rarity} onChange={set("rarity")} />
            <Field label="نسبة الفوز (%)" hint="احتمالية الفوز. 0 = لا يفوز بها أحد. النِسب نسبية لبعضها وليست مجبرة على 100" value={form.win_chance} onChangeText={set("win_chance")} keyboardType="numeric" placeholder="10" testID="prize-chance" />
            <Field label="الكمية المتوفرة" hint="اكتب -1 لكمية غير محدودة، أو رقماً لتحديد عدد النسخ المتاحة" value={form.quantity} onChangeText={set("quantity")} keyboardType="numeric" placeholder="-1" />
            <Field label="الترتيب" hint="ترتيب ظهور الشريحة على العجلة (الأصغر أولاً)" value={form.order} onChangeText={set("order")} keyboardType="numeric" placeholder="0" />
            <Toggle label="مفعّلة" hint="عند الإيقاف تختفي الجائزة من العجلة" value={form.active} onChange={set("active")} testID="prize-active" />
            <GameButton title="حفظ" icon="content-save" onPress={onSave} loading={saving} testID="save-prize" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  tip: { flexDirection: "row", gap: 8, backgroundColor: colors.brandSecondary + "18", borderWidth: 1, borderColor: colors.brandSecondary + "44", borderRadius: 12, padding: 12, marginBottom: 12 },
  tipText: { color: colors.onSurfaceSecondary, fontSize: 12, fontFamily: fonts.textRegular, flexShrink: 1, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, padding: 12 },
  imgWrap: { width: 52, height: 52, borderRadius: 10, borderWidth: 1.5, overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  name: { color: colors.onSurface, fontSize: 15, fontFamily: fonts.textBold },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chanceTag: { flexDirection: "row", alignItems: "center", gap: 2 },
  chanceText: { fontSize: 12, fontFamily: fonts.displayBold },
  hidden: { color: colors.error, fontSize: 11, fontFamily: fonts.textSemiBold },
  sub: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular },
  actions: { gap: 8 },
  actBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, maxHeight: "92%" },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { color: colors.onSurface, fontSize: 19, fontFamily: fonts.textBold },
}));
