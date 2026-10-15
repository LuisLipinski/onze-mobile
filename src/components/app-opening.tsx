import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ONZE_COLORS } from '../theme/colors';

type AppOpeningProps = {
  ready: boolean;
  onReady: () => void;
  onSequenceComplete: () => void;
  onFinished: () => void;
};

export function AppOpening({ ready, onReady, onSequenceComplete, onFinished }: AppOpeningProps) {
  const { width, height } = useWindowDimensions();
  const [laidOut, setLaidOut] = useState(false);
  const [sequenceComplete, setSequenceComplete] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [motion] = useState(() => ({
    letters: [...'ONZE'].map((_, index) => new Animated.Value(index === 0 ? 1 : 0)),
    shot: new Animated.Value(0),
    ballOpacity: new Animated.Value(0),
    impact: new Animated.Value(0),
    logo: new Animated.Value(0),
    curtain: new Animated.Value(1),
  }));

  useEffect(() => {
    if (!laidOut) return;
    let active = true;
    let started = false;
    let completed = false;
    let sequence: Animated.CompositeAnimation | undefined;

    function completeSequence() {
      if (!active || completed) return;
      completed = true;
      sequence?.stop();
      motion.impact.setValue(1);
      motion.ballOpacity.setValue(0);
      motion.logo.setValue(1);
      setSequenceComplete(true);
      onSequenceComplete();
    }

    function start(reduced: boolean) {
      if (!active || started) return;
      started = true;
      setReduceMotion(reduced);
      onReady();
      if (reduced) {
        motion.impact.setValue(1);
        motion.logo.setValue(1);
        sequence = Animated.delay(350);
      } else {
        const timing = (value: Animated.Value, toValue: number, duration: number) =>
          Animated.timing(value, {
            toValue,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          });
        sequence = Animated.sequence([
          Animated.stagger(
            140,
            motion.letters.map((letter) => timing(letter, 1, 200)),
          ),
          Animated.delay(280),
          Animated.parallel([
            timing(motion.ballOpacity, 1, 70),
            Animated.timing(motion.shot, {
              toValue: 1,
              duration: 520,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            timing(motion.ballOpacity, 0, 90),
            timing(motion.impact, 1, 440),
            Animated.sequence([
              Animated.delay(100),
              Animated.spring(motion.logo, {
                toValue: 1,
                damping: 17,
                stiffness: 190,
                mass: 0.8,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.delay(650),
        ]);
      }
      sequence.start(completeSequence);
    }

    // A failed/interrupted animation must never trap the app behind the opening.
    const deadline = setTimeout(completeSequence, 6_000);
    const accessibilityDeadline = setTimeout(() => start(true), 750);
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(start)
      .catch(() => start(true));
    return () => {
      active = false;
      clearTimeout(deadline);
      clearTimeout(accessibilityDeadline);
      sequence?.stop();
    };
  }, [laidOut, motion, onReady, onSequenceComplete]);

  useEffect(() => {
    if (!sequenceComplete || !ready) return;
    const fade = Animated.timing(motion.curtain, {
      toValue: 0,
      duration: reduceMotion ? 120 : 260,
      useNativeDriver: true,
    });
    fade.start(({ finished }) => {
      if (finished) onFinished();
    });
    return () => fade.stop();
  }, [motion, onFinished, ready, reduceMotion, sequenceComplete]);

  const wordOpacity = motion.impact.interpolate({
    inputRange: [0, 0.25, 0.85, 1],
    outputRange: [1, 1, 0, 0],
  });
  const fontSize = Math.min(width * 0.19, 84);

  return (
    <Animated.View
      accessible
      accessibilityLabel="Onze"
      accessibilityRole="image"
      accessibilityViewIsModal
      testID="app-opening"
      onLayout={() => setLaidOut(true)}
      style={[styles.curtain, { opacity: motion.curtain }]}
    >
      <View pointerEvents="none" style={styles.pitchCircle} />
      <View pointerEvents="none" style={styles.pitchLine} />
      <Animated.View
        testID="app-opening-word"
        style={[
          styles.word,
          {
            opacity: wordOpacity,
            transform: [
              {
                translateX: motion.impact.interpolate({
                  inputRange: [0, 0.15, 0.35, 0.6, 1],
                  outputRange: [0, -9, 9, -5, 0],
                }),
              },
              {
                scale: motion.impact.interpolate({
                  inputRange: [0, 0.2, 1],
                  outputRange: [1, 0.94, 1.24],
                }),
              },
            ],
          },
        ]}
      >
        {[...'ONZE'].map((letter, index) => (
          <Animated.Text
            key={letter}
            allowFontScaling={false}
            testID={`app-opening-letter-${index}`}
            style={[
              styles.letter,
              {
                fontSize,
                lineHeight: fontSize * 1.25,
                opacity: motion.letters[index],
                transform: [
                  {
                    translateY: motion.letters[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {letter}
          </Animated.Text>
        ))}
      </Animated.View>
      <Animated.View
        testID="app-opening-ball"
        pointerEvents="none"
        style={[
          styles.ball,
          {
            opacity: motion.ballOpacity,
            transform: [
              { perspective: 700 },
              {
                translateX: motion.shot.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-width * 0.22, 0],
                }),
              },
              {
                translateY: motion.shot.interpolate({
                  inputRange: [0, 1],
                  outputRange: [height * 0.43, 0],
                }),
              },
              {
                scale: motion.shot.interpolate({
                  inputRange: [0, 0.35, 1],
                  outputRange: [3.8, 1.55, 0.6],
                }),
              },
              {
                rotate: motion.shot.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-100deg', '420deg'],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.ballGlow} />
        <Image
          source={require('../../assets/football.png')}
          resizeMode="contain"
          style={styles.ballImage}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.impactRing,
          {
            opacity: motion.impact.interpolate({
              inputRange: [0, 0.15, 1],
              outputRange: [0, 0.7, 0],
            }),
            transform: [
              { scale: motion.impact.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.8] }) },
            ],
          },
        ]}
      />
      <Animated.View
        testID="app-opening-logo"
        style={[
          styles.logo,
          {
            opacity: motion.logo.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
            transform: [
              { scale: motion.logo.interpolate({ inputRange: [0, 1], outputRange: [0.58, 1] }) },
              { translateY: motion.logo.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            ],
          },
        ]}
      >
        <Image
          source={require('../../assets/icon.png')}
          resizeMode="contain"
          style={styles.logoImage}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  curtain: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ONZE_COLORS.ink,
    overflow: 'hidden',
    zIndex: 100,
  },
  pitchCircle: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: ONZE_COLORS.successBorder,
    opacity: 0.12,
  },
  pitchLine: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: ONZE_COLORS.successBorder,
    opacity: 0.06,
  },
  word: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  letter: {
    color: ONZE_COLORS.surface,
    fontWeight: '900',
    letterSpacing: 1,
    includeFontPadding: false,
  },
  ball: {
    position: 'absolute',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballGlow: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: ONZE_COLORS.surface,
    opacity: 0.12,
  },
  ballImage: { width: 128, height: 128 },
  impactRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: ONZE_COLORS.surface,
  },
  logo: {
    position: 'absolute',
    padding: 8,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: ONZE_COLORS.successBorder,
    backgroundColor: ONZE_COLORS.green,
  },
  logoImage: { width: 128, height: 128, borderRadius: 28 },
});
