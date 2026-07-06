/* eslint-disable react-hooks/immutability, react-hooks/purity --
 * The React-compiler rules can't see Reanimated worklets: gesture callbacks
 * mutate shared values ON THE UI THREAD (that is the whole render strategy —
 * ADR-0020 pillar 5), which the compiler misreads as render-time mutation. */
/**
 * THROWAWAY SPIKE (#47, ADR-0020) — dies after the device verdict.
 *
 * The library-ring device spike: does the inside-the-circle carousel hit
 * 60fps on the tablet with depth blur, using the committed render strategy?
 *
 *   - covers = textures snapshotted once (cover-textures.ts);
 *   - ring motion = ONE Reanimated shared value (`center`) driving per-cover
 *     transforms only — no repaint, no layout, no JS on the drag path;
 *   - depth blur = pre-blurred variants cross-faded by ring position.
 *
 * Slot recycling: 11 fixed slots at ring offsets −5…+5 each show whichever
 * book is nearest that offset (bookAtSlot). Slots are mounted in the order
 * [-5, 5, -4, 4, …, 0] — same-|offset| pairs never overlap each other, and
 * within a side |offset| orders depth monotonically, so this static paint
 * order is always back-to-front (Skia has no z-index; CSS's dynamic z dies).
 *
 * The HUD measures the #47 numbers: UI-thread fps + worst frame + dropped
 * frames (frame callback), drag latency (touch-event age at frame start),
 * exact texture bytes, and one-time texture build cost. It lives in its own
 * component so its 4Hz setState never re-renders the Canvas.
 */

import { Canvas, Fill, Group, Image, Oval } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  buildCoverTextures,
  SHADOW_H,
  SHADOW_W,
  type CoverTextures,
} from './cover-textures';
import { bookAtSlot, COVER_H, COVER_W, DRAG_PX_PER_BOOK, ringPose } from './ring';

const PAPER = '#efe6d2';
const INK = '#2b2118';
const INK2 = '#6b5c48';
const CARD = '#f7f0df';

/** Momentum projection: released velocity carries this many seconds of spin. */
const FLICK_PROJECTION_S = 0.3;
/** Overdamped snap — the prototype's exponential ease, no oscillation. */
const SNAP_SPRING = { damping: 32, stiffness: 140, mass: 1 } as const;
/** Frame budget: anything above this counts as a dropped frame (60Hz ≈ 16.7ms). */
const DROP_THRESHOLD_MS = 20;

/** Back-to-front static paint order (see file header). */
const SLOT_ORDER = [-5, 5, -4, 4, -3, 3, -2, 2, -1, 1, 0] as const;

const GROUP_NAMES = ['Torah', 'Prophets', 'Writings', 'Gospels', 'Acts', 'Letters', 'Revelation'];

function CoverSlot({
  slot,
  center,
  tex,
  cx,
  cy,
}: {
  slot: number;
  center: SharedValue<number>;
  tex: CoverTextures;
  cx: number;
  cy: number;
}) {
  const n = tex.books.length;
  const pose = useDerivedValue(() => ringPose(Math.round(center.value) + slot - center.value));

  const transform = useDerivedValue(() => {
    const p = pose.value;
    return [
      { translateX: cx + p.tx },
      { translateY: cy + p.arc },
      { perspective: 1000 },
      { rotateY: (p.ry * Math.PI) / 180 },
      { skewY: (p.sk * Math.PI) / 180 },
      { scale: p.scale },
    ];
  });
  const opacity = useDerivedValue(() => pose.value.op);
  // Blur cross-fade: sharp always underneath; the two pre-blurred variants
  // fade in on top as the target blur ramps 0 → 1.3 → 2.6 dp.
  const softOp = useDerivedValue(() => Math.min(1, Math.max(0, pose.value.blur / 1.3)));
  const softerOp = useDerivedValue(() => Math.min(1, Math.max(0, (pose.value.blur - 1.3) / 1.3)));

  const sharpImg = useDerivedValue(() => tex.sharp[bookAtSlot(center.value, slot, n)]);
  const softImg = useDerivedValue(() => tex.soft[bookAtSlot(center.value, slot, n)]);
  const softerImg = useDerivedValue(() => tex.softer[bookAtSlot(center.value, slot, n)]);

  const x = -COVER_W / 2;
  const y = -COVER_H / 2;
  return (
    <Group transform={transform} opacity={opacity}>
      <Image
        image={tex.shadow}
        x={-SHADOW_W / 2}
        y={-SHADOW_H / 2}
        width={SHADOW_W}
        height={SHADOW_H}
      />
      <Image image={sharpImg} x={x} y={y} width={COVER_W} height={COVER_H} />
      <Image image={softImg} x={x} y={y} width={COVER_W} height={COVER_H} opacity={softOp} />
      <Image image={softerImg} x={x} y={y} width={COVER_W} height={COVER_H} opacity={softerOp} />
    </Group>
  );
}

interface HudProps {
  tex: CoverTextures;
  center: SharedValue<number>;
  frames: SharedValue<number>;
  sumMs: SharedValue<number>;
  dropped: SharedValue<number>;
  worstMs: SharedValue<number>;
  worstLatency: SharedValue<number>;
  onFullRing: () => void;
}

/** Overlay: measurements + focus readout. Samples shared values at 4Hz from
 * the JS thread — its re-renders stay inside this component. */
function PerfHud({ tex, center, frames, sumMs, dropped, worstMs, worstLatency, onFullRing }: HudProps) {
  const [stats, setStats] = useState({
    fps: 0,
    worstMs: 0,
    dropped: 0,
    worstLatencyMs: 0,
    focusedBook: '',
    focusedGroup: '',
  });
  const prev = useRef({ frames: 0, sumMs: 0 });

  useEffect(() => {
    const id = setInterval(() => {
      const df = frames.value - prev.current.frames;
      const dms = sumMs.value - prev.current.sumMs;
      prev.current = { frames: frames.value, sumMs: sumMs.value };
      const book = tex.books[bookAtSlot(center.value, 0, tex.books.length)];
      setStats({
        fps: df > 0 && dms > 0 ? (1000 * df) / dms : 0,
        worstMs: worstMs.value,
        dropped: dropped.value,
        worstLatencyMs: worstLatency.value,
        focusedBook: book.name,
        focusedGroup: book.group,
      });
    }, 250);
    return () => clearInterval(id);
  }, [tex, center, frames, sumMs, dropped, worstMs, worstLatency]);

  const resetStats = () => {
    worstMs.value = 0;
    dropped.value = 0;
    worstLatency.value = 0;
  };

  return (
    <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.overlay}>
      <View style={styles.hud} pointerEvents="none">
        <Text style={styles.hudText}>
          fps {stats.fps.toFixed(0)} · worst {stats.worstMs.toFixed(1)}ms · dropped{' '}
          {stats.dropped}
        </Text>
        <Text style={styles.hudText}>
          touch-age {stats.worstLatencyMs.toFixed(1)}ms · textures{' '}
          {(tex.textureBytes / (1024 * 1024)).toFixed(1)}MB · build {tex.buildMs}ms
        </Text>
      </View>

      <View style={styles.ticker} pointerEvents="none">
        {GROUP_NAMES.map((g) => (
          <Text key={g} style={[styles.tickerChip, g === stats.focusedGroup && styles.tickerChipOn]}>
            {g}
          </Text>
        ))}
      </View>

      <View style={styles.spacer} pointerEvents="none" />

      <View style={styles.focus} pointerEvents="none">
        <Text style={styles.focusGroup}>{stats.focusedGroup}</Text>
        <Text style={styles.focusBook}>{stats.focusedBook}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.btn} onPress={resetStats}>
          <Text style={styles.btnText}>reset stats</Text>
        </Pressable>
        <Text style={styles.hint}>drag · flick · tap side cover</Text>
        <Pressable style={styles.btn} onPress={onFullRing}>
          <Text style={styles.btnText}>full ring</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export function CarouselLab() {
  const viewport = useWindowDimensions();
  const [tex, setTex] = useState<CoverTextures | null>(null);

  // Build textures one tick after mount so the "building…" frame paints first.
  useEffect(() => {
    const id = setTimeout(() => setTex(buildCoverTextures()), 16);
    return () => clearTimeout(id);
  }, []);

  const center = useSharedValue(0);
  const dragging = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const lastTouchTs = useSharedValue(0);

  // Frame stats, written on the UI thread, sampled by the JS-side HUD interval.
  const frames = useSharedValue(0);
  const sumMs = useSharedValue(0);
  const dropped = useSharedValue(0);
  const worstMs = useSharedValue(0);
  const worstLatency = useSharedValue(0);

  useFrameCallback((info) => {
    const dt = info.timeSincePreviousFrame;
    if (dt == null) return;
    frames.value += 1;
    sumMs.value += dt;
    if (dt > DROP_THRESHOLD_MS) dropped.value += 1;
    if (dt > worstMs.value) worstMs.value = dt;
    if (dragging.value === 1 && lastTouchTs.value > 0) {
      const lat = performance.now() - lastTouchTs.value;
      if (lat > worstLatency.value) worstLatency.value = lat;
    }
  });

  const n = tex?.books.length ?? 66;
  const cx = viewport.width / 2;
  const cy = viewport.height * 0.47;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          cancelAnimation(center);
          dragStart.value = center.value;
          dragging.value = 1;
        })
        .onUpdate((e) => {
          lastTouchTs.value = performance.now();
          center.value = dragStart.value - e.translationX / DRAG_PX_PER_BOOK;
        })
        .onFinalize((e) => {
          dragging.value = 0;
          lastTouchTs.value = 0;
          const projected = center.value - (e.velocityX * FLICK_PROJECTION_S) / DRAG_PX_PER_BOOK;
          center.value = withSpring(Math.round(projected), SNAP_SPRING);
        }),
    [center, dragStart, dragging, lastTouchTs],
  );

  // Tap a side cover → rotate it to center (prototype behavior); the step
  // count inverts the ring's x-spacing (170 first step, 116 after).
  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd((e) => {
        const dx = e.x - cx;
        const adx = Math.abs(dx);
        if (adx <= 105) return; // hero tap opens the book — not wired, by contract
        const steps = Math.min(4, 1 + Math.max(0, Math.round((adx - 170) / 116)));
        center.value = withSpring(Math.round(center.value) + Math.sign(dx) * steps, SNAP_SPRING);
      }),
    [center, cx],
  );
  const gesture = useMemo(() => Gesture.Exclusive(pan, tap), [pan, tap]);

  const fullRingSpin = () => {
    center.value = withTiming(Math.round(center.value) + n, {
      duration: 4500,
      easing: Easing.inOut(Easing.cubic),
    });
  };

  if (!tex) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.hint}>building 66 covers × 3 variants…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Fill color={PAPER} />
            <Oval
              x={cx - viewport.width * 0.62}
              y={cy + COVER_H / 2 - 40}
              width={viewport.width * 1.24}
              height={130}
              style="stroke"
              strokeWidth={1.5}
              color="rgba(43,33,24,0.13)"
            />
            {SLOT_ORDER.map((slot) => (
              <CoverSlot key={slot} slot={slot} center={center} tex={tex} cx={cx} cy={cy} />
            ))}
          </Canvas>
        </Animated.View>
      </GestureDetector>

      <PerfHud
        tex={tex}
        center={center}
        frames={frames}
        sumMs={sumMs}
        dropped={dropped}
        worstMs={worstMs}
        worstLatency={worstLatency}
        onFullRing={fullRingSpin}
      />
    </View>
  );
}

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
  center: { alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  hud: {
    alignSelf: 'center',
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(34,30,25,0.75)',
  },
  hudText: { fontFamily: MONO, fontSize: 11, color: '#f4ecd9', textAlign: 'center' },

  ticker: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 4,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tickerChip: {
    fontSize: 10,
    letterSpacing: 0.8,
    color: INK2,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tickerChipOn: { backgroundColor: INK, color: PAPER },

  spacer: { flex: 1 },

  focus: { alignItems: 'center', paddingBottom: 4 },
  focusGroup: { fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase', color: '#9a7d3b' },
  focusBook: {
    fontSize: 24,
    color: INK,
    fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  btn: {
    borderWidth: 1,
    borderColor: INK2,
    backgroundColor: CARD,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  btnText: { fontSize: 12, color: INK },
  hint: { fontSize: 11, color: INK2 },
});
