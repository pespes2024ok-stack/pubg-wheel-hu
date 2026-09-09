import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { api } from "@/src/api";
import { GameButton, Icon, ScreenHeader, Loader } from "@/src/components/ui";
import { Field } from "@/src/components/admin-fields";
import { ImageInput } from "@/src/components/image-input";
import { useToast } from "@/src/toast";

export default function AdminSettings() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const settingsQ = useQuery({ queryKey: ["admin-settings"], queryFn: () => api.get("/admin/settings", true) });

  useEffect(() => {
    if (settingsQ.data && !form) {
      const d = settingsQ.data;
      setForm({
        app_name: d.app_name || "", app_subtitle: d.app_subtitle || "",
        tab_home: d.tab_home || "", tab_store: d.tab_store || "", tab_rewards: d.tab_rewards || "", tab_profile: d.tab_profile || "",
        store_title: d.store_title || "", home_background: d.home_background || "", profile_background: d.profile_background || "",
        signup_bonus: String(d.signup_bonus ?? 0), referral_bonus: String(d.referral_bonus ?? 0), spin_cooldown_hours: String(d.spin_cooldown_hours ?? 24),
      });
    }
  }, [settingsQ.data]);

  const set = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = {
      app_name: form.app_name, app_subtitle: form.app_subtitle,
      tab_home: form.tab_home, tab_store: form.tab_store, tab_rewards: form.tab_rewards, tab_profile: form.tab_profile,
      store_title: form.store_title, home_background: form.home_background, profile_background: form.profile_background,
      signup_bonus: parseInt(form.signup_bonus) || 0, referral_bonus: parseInt(form.referral_bonus) || 0, spin_cooldown_hours: parseInt(form.spin_cooldown_hours) || 24,
    };
    try {
      await api.put("/admin/settings", payload, true);
      toast.show("تم حفظ الإعدادات", "success");
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (e: any) { toast.show(e?.message || "تعذر الحفظ", "error"); } finally { setSaving(false); }
  };

  const changePw = async () => {
    if (!curPw || !newPw) { toast.show("أدخل كلمة المرور الحالية والجديدة", "error"); return; }
    setPwSaving(true);
    try {
      await api.post("/admin/change-password", { current_password: curPw, new_password: newPw }, true);
      toast.show("تم تغيير كلمة المرور", "success");
      setCurPw(""); setNewPw("");
    } catch (e: any) { toast.show(e?.message || "تعذر التغيير", "error"); } finally { setPwSaving(false); }
  };

  if (!form) return <Loader />;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="الإعدادات" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <Section title="هوية التطبيق" icon="cellphone" colors={colors} styles={styles}>
          <Field label="اسم التطبيق" hint="الاسم الرئيسي الظاهر في التطبيق" value={form.app_name} onChangeText={set("app_name")} testID="set-app-name" />
          <Field label="الوصف الفرعي" hint="نص صغير أسفل الاسم في شاشة الدخول" value={form.app_subtitle} onChangeText={set("app_subtitle")} />
          <Field label="عنوان المتجر" hint="العنوان الظاهر أعلى صفحة المتجر" value={form.store_title} onChangeText={set("store_title")} />
        </Section>

        <Section title="أسماء الشريط السفلي" icon="dock-bottom" colors={colors} styles={styles}>
          <Field label="تبويب اللوبي" hint="اسم التبويب الأول (الرئيسية)" value={form.tab_home} onChangeText={set("tab_home")} />
          <Field label="تبويب المتجر" hint="اسم تبويب المتجر" value={form.tab_store} onChangeText={set("tab_store")} />
          <Field label="تبويب الجوائز" hint="اسم تبويب جوائزي" value={form.tab_rewards} onChangeText={set("tab_rewards")} />
          <Field label="تبويب الملف" hint="اسم تبويب الملف الشخصي" value={form.tab_profile} onChangeText={set("tab_profile")} />
        </Section>

        <Section title="الخلفيات" icon="image-multiple" colors={colors} styles={styles}>
          <ImageInput value={form.home_background} onChange={set("home_background")} label="خلفية الصفحة الرئيسية وشاشة الدخول" />
          <View style={{ height: 16 }} />
          <ImageInput value={form.profile_background} onChange={set("profile_background")} label="خلفية الملف الشخصي" />
        </Section>

        <Section title="النقاط والدوران" icon="hexagon-multiple" colors={colors} styles={styles}>
          <Field label="نقاط الترحيب" hint="عدد النقاط التي يحصل عليها كل مستخدم جديد عند التسجيل" value={form.signup_bonus} onChangeText={set("signup_bonus")} keyboardType="numeric" testID="set-signup-bonus" />
          <Field label="نقاط الإحالة" hint="النقاط الممنوحة للطرفين عند استخدام رمز الإحالة" value={form.referral_bonus} onChangeText={set("referral_bonus")} keyboardType="numeric" />
          <Field label="فترة انتظار الدوران (ساعة)" hint="كم ساعة ينتظر المستخدم بين كل دورة وأخرى (افتراضي 24)" value={form.spin_cooldown_hours} onChangeText={set("spin_cooldown_hours")} keyboardType="numeric" />
        </Section>

        <GameButton title="حفظ الإعدادات" icon="content-save-all" onPress={save} loading={saving} testID="save-settings" />

        <Section title="تغيير كلمة مرور الأدمن" icon="lock-reset" colors={colors} styles={styles}>
          <Field label="كلمة المرور الحالية" value={curPw} onChangeText={setCurPw} placeholder="••••••" testID="cur-pw" />
          <Field label="كلمة المرور الجديدة" hint="4 أحرف على الأقل" value={newPw} onChangeText={setNewPw} placeholder="••••••" testID="new-pw" />
          <GameButton title="تغيير كلمة المرور" icon="key-change" variant="secondary" onPress={changePw} loading={pwSaving} testID="change-pw" />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, icon, children, colors, styles }: any) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Icon name={icon} size={18} color={colors.brandPrimary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  section: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 16 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionTitle: { color: colors.onSurface, fontSize: 16, fontFamily: fonts.textBold },
}));
