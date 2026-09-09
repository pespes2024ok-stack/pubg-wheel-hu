import { useState } from "react";
import { View, Text, FlatList, Pressable, Modal, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts, rarityColor } from "@/src/theme";
import { api } from "@/src/api";
import { GameButton, Icon, Img, RarityBadge, Coin, ScreenHeader, Loader, EmptyState } from "@/src/components/ui";
import { Field, SegmentPicker, Toggle } from "@/src/components/admin-fields";
import { ImageInput } from "@/src/components/image-input";
import { useToast } from "@/src/toast";

const RARITY_OPTS = [
  { key: "common", label: "عادي", color: "#9E9E9E" },
  { key: "rare", label: "نادر", color: "#4CAF50" },
  { key: "epic", label: "ملحمي", color: "#FF5722" },
  { key: "legendary", label: "أسطوري", color: "#FFD700" },
];
const CAT_OPTS = [
  { key: "UC", label: "UC" },
  { key: "سكنات", label: "سكنات" },
  { key: "صناديق", label: "صناديق" },
  { key: "بطاقات", label: "بطاقات" },
  { key: "أخرى", label: "أخرى" },
];

const empty = { name: "", image: "", description: "", category: "UC", rarity: "common", price_points: "500", quantity: "-1", active: true, order: "0" };

export default function AdminProducts() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const listQ = useQuery({ queryKey: ["admin-products"], queryFn: () => api.get("/admin/products", true) });

  const openNew = () => { setForm({ ...empty }); setEditingId(null); };
  const openEdit = (p: any) => {
    setForm({ name: p.name, image: p.image || "", description: p.description || "", category: p.category, rarity: p.rarity, price_points: String(p.price_points), quantity: String(p.quantity ?? -1), active: p.active, order: String(p.order ?? 0) });
    setEditingId(p.id);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.show("أدخل اسم المنتج", "error"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(), image: form.image.trim(), description: form.description.trim(), category: form.category,
      rarity: form.rarity, price_points: parseInt(form.price_points) || 0, quantity: parseInt(form.quantity),
      remaining: parseInt(form.quantity), active: form.active, order: parseInt(form.order) || 0,
    };
    try {
      if (editingId) await api.put(`/admin/products/${editingId}`, payload, true);
      else await api.post("/admin/products", payload, true);
      toast.show("تم الحفظ", "success");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) {
      toast.show(e?.message || "تعذر الحفظ", "error");
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try {
      await api.del(`/admin/products/${id}`, true);
      toast.show("تم الحذف", "success");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) { toast.show(e?.message || "تعذر الحذف", "error"); }
  };

  const set = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="منتجات المتجر" onBack={() => router.back()} right={<Pressable onPress={openNew} testID="add-product"><Icon name="plus-circle" size={28} color={colors.brandPrimary} /></Pressable>} />
      {listQ.isLoading ? (
        <Loader />
      ) : (
        <FlatList
          data={listQ.data || []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
          ListEmptyComponent={<EmptyState icon="storefront" title="لا توجد منتجات" subtitle="أضف أول منتج للمتجر" />}
          renderItem={({ item }) => {
            const rc = rarityColor(item.rarity, colors);
            return (
              <View style={[styles.row, { borderColor: rc + "55" }]}>
                <View style={[styles.imgWrap, { borderColor: rc }]}>
                  <Img uri={item.image} style={styles.img} fallbackIcon="gift" />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.metaRow}>
                    <RarityBadge rarity={item.rarity} size="sm" />
                    <Text style={styles.cat}>{item.category}</Text>
                    {!item.active ? <Text style={styles.hidden}>مخفي</Text> : null}
                  </View>
                  <View style={styles.priceRow}>
                    <Coin points={item.price_points} size={13} />
                    <Text style={styles.sub}>· الكمية: {item.quantity < 0 ? "∞" : item.remaining}</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Pressable onPress={() => openEdit(item)} style={styles.actBtn} testID={`edit-product-${item.id}`}><Icon name="pencil" size={18} color={colors.brandSecondary} /></Pressable>
                  <Pressable onPress={() => remove(item.id)} style={styles.actBtn} testID={`delete-product-${item.id}`}><Icon name="trash-can" size={18} color={colors.error} /></Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      {form ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setForm(null)}>
          <View style={styles.modalBg}>
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle}>{editingId ? "تعديل المنتج" : "منتج جديد"}</Text>
                <Pressable onPress={() => setForm(null)}><Icon name="close" size={24} color={colors.muted} /></Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
                <Field label="اسم المنتج" hint="الاسم الظاهر في المتجر، مثل: 325 UC" value={form.name} onChangeText={set("name")} testID="product-name" />
                <ImageInput value={form.image} onChange={set("image")} label="صورة المنتج" />
                <View style={{ height: 16 }} />
                <Field label="الوصف (اختياري)" hint="تفاصيل تظهر عند فتح المنتج" value={form.description} onChangeText={set("description")} multiline />
                <SegmentPicker label="الفئة" hint="تُستخدم لفلترة المنتجات في أعلى المتجر" options={CAT_OPTS} value={form.category} onChange={set("category")} />
                <SegmentPicker label="مستوى الندرة" hint="يحدد لون الإطار والشارة (الأسطوري بمؤثر ذهبي)" options={RARITY_OPTS} value={form.rarity} onChange={set("rarity")} />
                <Field label="السعر بالنقاط" hint="عدد النقاط التي يدفعها المستخدم لشراء المنتج" value={form.price_points} onChangeText={set("price_points")} keyboardType="numeric" testID="product-price" />
                <Field label="الكمية المتوفرة" hint="اكتب -1 لكمية غير محدودة، أو رقماً لتحديد المخزون" value={form.quantity} onChangeText={set("quantity")} keyboardType="numeric" />
                <Field label="الترتيب" hint="ترتيب الظهور في المتجر (الأصغر أولاً)" value={form.order} onChangeText={set("order")} keyboardType="numeric" />
                <Toggle label="مفعّل" hint="عند الإيقاف يختفي المنتج من المتجر" value={form.active} onChange={set("active")} testID="product-active" />
                <GameButton title="حفظ" icon="content-save" onPress={save} loading={saving} testID="save-product" />
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
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, padding: 12 },
  imgWrap: { width: 52, height: 52, borderRadius: 10, borderWidth: 1.5, overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  name: { color: colors.onSurface, fontSize: 15, fontFamily: fonts.textBold },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cat: { color: colors.onSurfaceTertiary, fontSize: 11, fontFamily: fonts.textRegular },
  hidden: { color: colors.error, fontSize: 11, fontFamily: fonts.textSemiBold },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sub: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular },
  actions: { gap: 8 },
  actBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, maxHeight: "92%" },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { color: colors.onSurface, fontSize: 19, fontFamily: fonts.textBold },
}));
