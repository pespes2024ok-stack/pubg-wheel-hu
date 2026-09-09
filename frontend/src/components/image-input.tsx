import { useState } from "react";
import { View, Text, Pressable, TextInput, Platform, Linking, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { API, getAdminToken } from "@/src/api";
import { Icon, Img } from "@/src/components/ui";
import { useToast } from "@/src/toast";

export function ImageInput({ value, onChange, label = "الصورة" }: { value: string; onChange: (v: string) => void; label?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);

  const pick = async () => {
    const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    let status = perm.status;
    if (status !== "granted") {
      if (perm.canAskAgain || status === "undetermined") {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") {
        toast.show("يلزم إذن الوصول للصور. افتح الإعدادات لتفعيله", "error");
        Linking.openSettings();
        return;
      }
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    setUploading(true);
    try {
      const form = new FormData();
      const name = asset.fileName || `img_${Date.now()}.jpg`;
      const type = asset.mimeType || "image/jpeg";
      if (Platform.OS === "web") {
        const blob = await (await fetch(asset.uri)).blob();
        form.append("file", blob, name);
      } else {
        form.append("file", { uri: asset.uri, name, type } as any);
      }
      const resp = await fetch(`${API}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        body: form,
      });
      if (!resp.ok) throw new Error("upload failed");
      const data = await resp.json();
      onChange(data.path);
      toast.show("تم رفع الصورة", "success");
    } catch {
      toast.show("تعذر رفع الصورة", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.preview}>
        <Img uri={value} style={styles.previewImg} fallbackIcon="image-plus" />
      </View>
      <View style={styles.btnRow}>
        <Pressable style={styles.btn} onPress={pick} disabled={uploading} testID="upload-image-device">
          {uploading ? <ActivityIndicator size="small" color={colors.brandPrimary} /> : <Icon name="cloud-upload" size={18} color={colors.brandPrimary} />}
          <Text style={styles.btnText}>رفع من الجهاز</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => setUrlMode((v) => !v)} testID="toggle-url-mode">
          <Icon name="link-variant" size={18} color={colors.brandSecondary} />
          <Text style={styles.btnText}>رابط URL</Text>
        </Pressable>
      </View>
      {urlMode ? (
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="https://..."
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          style={styles.input}
          testID="image-url-input"
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: 8 },
  label: { color: colors.onSurfaceSecondary, fontSize: 13, fontFamily: fonts.textSemiBold },
  preview: { height: 120, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary },
  previewImg: { width: "100%", height: "100%" },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 11 },
  btnText: { color: colors.onSurface, fontSize: 13, fontFamily: fonts.textSemiBold },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.onSurface, fontSize: 13, fontFamily: fonts.textRegular, textAlign: "left" },
}));
