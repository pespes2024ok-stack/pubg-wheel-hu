import { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";

import { useTheme } from "@/src/theme";

const { height } = Dimensions.get("window");

function Spark({ index, color, rise }: { index: number; color: string; rise: number }) {
  const progress = useSharedValue(0);
  const left = `${(index * 37) % 100}%`;
  const size = 2 + (index % 3);
  const duration = 3200 + (index % 5) * 700;
  const delay = (index * 430) % 3600;
  const drift = (index % 2 === 0 ? 1 : -1) * (6 + (index % 4) * 4);

  useEffect(() => {
    progress.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1, false));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -progress.value * rise },
      { translateX: Math.sin(progress.value * Math.PI * 3) * drift },
      { scale: 1 - progress.value * 0.5 },
    ],
    opacity: progress.value < 0.15 ? progress.value * 6.6 : Math.max(0, 1 - progress.value),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          bottom: 0,
          left: left as any,
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.9,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

export function Sparks({ count = 18, rise, color }: { count?: number; rise?: number; color?: string }) {
  const { colors } = useTheme();
  const riseH = rise ?? height * 0.6;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }).map((_, i) => (
        <Spark key={i} index={i} rise={riseH} color={i % 3 === 0 ? colors.brandSecondary : colors.brandPrimary} />
      ))}
    </View>
  );
}
