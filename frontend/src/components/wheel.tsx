import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Svg, { G, Path, Circle, Text as SvgText, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme, fonts, rarityColor } from "@/src/theme";
import { Icon } from "@/src/components/ui";

export type WheelPrize = { id: string; name: string; value?: string; rarity: string; kind: string };

export type WheelHandle = { spinTo: (index: number) => void };

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

const LuckyWheel = forwardRef<WheelHandle, { prizes: WheelPrize[]; size: number; onComplete?: (index: number) => void }>(
  ({ prizes, size, onComplete }, ref) => {
    const { colors } = useTheme();
    const rotation = useSharedValue(0);
    const [spinning, setSpinning] = useState(false);
    const tickTimer = useRef<any>(null);

    const n = Math.max(prizes.length, 1);
    const seg = 360 / n;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

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

    return (
      <View style={{ width: size, height: size + 18, alignItems: "center" }}>
        {/* Pointer */}
        <View style={{ position: "absolute", top: 0, zIndex: 10, alignItems: "center" }}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 14,
              borderRightWidth: 14,
              borderTopWidth: 24,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderTopColor: colors.brandSecondary,
            }}
          />
        </View>

        <Animated.View style={[{ marginTop: 14 }, animStyle]}>
          <Svg width={size} height={size}>
            <Defs>
              <RadialGradient id="hub" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={colors.brandPrimary} />
                <Stop offset="100%" stopColor="#C8860B" />
              </RadialGradient>
            </Defs>
            <G>
              {prizes.map((p, i) => {
                const start = i * seg;
                const end = start + seg;
                const base = rarityColor(p.rarity, colors);
                const fill = i % 2 === 0 ? base : base + "CC";
                const mid = start + seg / 2;
                const lp = polar(cx, cy, r * 0.62, mid);
                const label = p.value && p.value !== "-" ? p.value : p.kind === "nothing" ? "حظ أوفر" : p.name;
                const short = label.length > 9 ? label.slice(0, 9) : label;
                return (
                  <G key={p.id}>
                    <Path d={slicePath(cx, cy, r - 4, start, end)} fill={fill} stroke={colors.surface} strokeWidth={2} />
                    <SvgText
                      x={lp.x}
                      y={lp.y}
                      fill="#0F1115"
                      fontSize={n > 8 ? 10 : 12}
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {short}
                    </SvgText>
                  </G>
                );
              })}
              <Circle cx={cx} cy={cy} r={r * 0.2} fill="url(#hub)" stroke={colors.brandSecondary} strokeWidth={3} />
            </G>
          </Svg>
          <View style={{ position: "absolute", top: cy - 16, left: cx - 16, width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
            <Icon name="crosshairs-gps" size={22} color={colors.onBrandPrimary} />
          </View>
        </Animated.View>
      </View>
    );
  },
);

LuckyWheel.displayName = "LuckyWheel";
export default LuckyWheel;
