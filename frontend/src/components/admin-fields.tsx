import React from "react";
import { View, Text, TextInput, Pressable, Switch } from "react-native";

import { makeStyles, useTheme, fonts } from "@/src/theme";

export function Field({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  testID,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && { height: 80, textAlignVertical: "top" }]}
        testID={testID}
      />
    </View>
  );
}

export function SegmentPicker({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { key: string; label: string; color?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.segRow}>
        {options.map((o) => {
          const active = value === o.key;
          const c = o.color || colors.brandPrimary;
          return (
            <Pressable
              key={o.key}
              onPress={() => onChange(o.key)}
              style={[styles.seg, active && { backgroundColor: c + "22", borderColor: c }]}
              testID={`seg-${o.key}`}
            >
              <Text style={[styles.segText, active && { color: c }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Toggle({ label, hint, value, onChange, testID }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.field, styles.toggleRow]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }}
        thumbColor={colors.onSurface}
        testID={testID}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  field: { marginBottom: 16, gap: 6 },
  label: { color: colors.onSurface, fontSize: 14, fontFamily: fonts.textBold },
  hint: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular, lineHeight: 17 },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 11, color: colors.onSurface, fontSize: 15, fontFamily: fonts.textRegular, textAlign: "right" },
  segRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  seg: { borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 14, paddingVertical: 9 },
  segText: { color: colors.onSurfaceTertiary, fontSize: 13, fontFamily: fonts.textSemiBold },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
}));
