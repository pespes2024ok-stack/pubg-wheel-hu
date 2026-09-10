import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Platform, View, Text, Pressable } from "react-native";
import Svg, { G, Path, Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import { fonts } from "@/src/theme";
import { resolveImage } from "@/src/api";

export type WheelPrize = { id: string; name: string; value?: string; rarity: string; kind: string; image?: string };

export type WheelHandle = { spinTo: (index: number) => void };

const GOLD = "#F5B301";
const GOLD_SOFT = "#C8860B";

function polar(cx: number, cy: number, r: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function slicePath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} Z`;
}

const LuckyWheel = forwardRef<
  WheelHandle,
  { prizes: WheelPrize[]; size: number; onComplete?: (index: number) => void; onCenterPress?: () => void; spinning?: boolean }
>(({ prizes, size, onComplete, onCenterPress, spinning: extSpinning }, ref) => {
  const rotation = useSharedValue(0);
  const [spinning, setSpinning] = useState(false);
  const tickTimer = useRef<any>(null);

  const n = Math.max(prizes.length, 1);
  const seg = 360 / n;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const MED = Math.round(size * 0.21);
  const CENTER = Math.round(size * 0.29);

  const finish = (index: number) => {
    if (tickTimer.current) clearInterval(tickTimer.current);
    setSpinning(false);
    onComplete?.(index);
  };

  useImperativeHandle(ref, () => ({
    spinTo(index: number) {
      if (spinning) return;
      setSpinning(true);
      if (Platform.OS !== "web") {
        tickTimer.current = setInterval(() => {
          Haptics.selectionAsync().catch(() => {});
        }, 130);
      }
      const center = index * seg + seg / 2;
      const current = ((rotation.value % 360) + 360) % 360;
      const target = (360 - center + 360) % 360;
      let delta = (target - current + 360) % 360;
      delta += 360 * 6;
      rotation.value = withTiming(
        rotation.value + delta,
        { duration: 4500, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(finish)(index);
        },
      );
    },
  }));

  const animStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const busy = spinning || extSpinning;

  return (
    <View style={{ width: size, height: size + 20, alignItems: "center" }}>
      {/* Pointer */}
      <View style={{ position: "absolute", top: 0, zIndex: 10, alignItems: "center" }}>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 13,
            borderRightWidth: 13,
            borderTopWidth: 22,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: GOLD,
          }}
        />
      </View>

      <Animated.View style={[{ marginTop: 16 }, animStyle]}>
        <Svg width={size} height={size}>
          {/* Quadrant/segment fills + gold dividers */}
          <G>
            {prizes.map((p, i) => {
              const start = i * seg;
              const end = start + seg;
              const fill = i % 2 === 0 ? "#211B10" : "#161B27";
              return <Path key={`slice-${p.id}`} d={slicePath(cx, cy, r - 3, start, end)} fill={fill} stroke={GOLD_SOFT} strokeWidth={1.5} />;
            })}
          </G>
          {/* Outer gold ring */}
          <Circle cx={cx} cy={cy} r={r - 3} fill="none" stroke={GOLD} strokeWidth={4} />
          <Circle cx={cx} cy={cy} r={r - 10} fill="none" stroke={GOLD_SOFT + "66"} strokeWidth={1.5} />
        </Svg>

        {/* Prize medallions with centered name (rotate with wheel) */}
        {prizes.map((p, i) => {
          const mid = i * seg + seg / 2;
          const mp = polar(cx, cy, r * 0.62, mid);
          const src = resolveImage(p.image);
          const label = p.kind === "nothing" ? "حظ أوفر" : p.name;
          return (
            <View
              key={`med-${p.id}`}
              style={{
                position: "absolute",
                left: mp.x - MED / 2,
                top: mp.y - MED / 2,
                width: MED,
                height: MED,
                borderRadius: MED / 2,
                borderWidth: 2,
                borderColor: GOLD,
                overflow: "hidden",
                backgroundColor: "#0F0A04",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {src ? <Image source={{ uri: src }} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" /> : null}
              {src ? <View style={{ position: "absolute", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.55)" }} /> : null}
              <Text
                numberOfLines={2}
                style={{ color: "#FFFFFF", fontSize: 11, lineHeight: 14, fontFamily: fonts.textBold, textAlign: "center", paddingHorizontal: 4, textShadowColor: "#000", textShadowRadius: 4 }}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </Animated.View>

      {/* Center spin button (upright, tappable) */}
      <View style={{ position: "absolute", top: 16 + cy - CENTER / 2, left: cx - CENTER / 2, width: CENTER, height: CENTER }}>
        <Pressable
          onPress={onCenterPress}
          disabled={busy}
          testID="wheel-center-spin"
          style={{ width: "100%", height: "100%", borderRadius: CENTER / 2, overflow: "hidden", borderWidth: 3, borderColor: GOLD, alignItems: "center", justifyContent: "center" }}
        >
          <Svg width={CENTER} height={CENTER} style={{ position: "absolute" }}>
            <Defs>
              <RadialGradient id="hub" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#3A2A0E" />
                <Stop offset="100%" stopColor="#0F0A04" />
              </RadialGradient>
            </Defs>
            <Circle cx={CENTER / 2} cy={CENTER / 2} r={CENTER / 2} fill="url(#hub)" />
          </Svg>
          <Text style={{ color: GOLD, fontSize: Math.round(size * 0.075), fontFamily: fonts.textBold }}>أدر</Text>
        </Pressable>
      </View>
    </View>
  );
});

LuckyWheel.displayName = "LuckyWheel";
export default LuckyWheel;
