import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useMesh } from '../mesh/MeshContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';

export default function FeedScreen() {
  const { status, peerCount, errorMessage } = useMesh();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const shouldPulse =
    status === 'starting' || (status === 'running' && peerCount > 0);

  useEffect(() => {
    if (!shouldPulse) {
      pulseAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulseAnim, shouldPulse]);

  const statusColor =
    status === 'starting'
      ? colors.accent
      : status === 'running'
        ? colors.hopIndicator
        : status === 'error'
          ? colors.error
          : colors.textMeta;

  const statusLabel =
    status === 'idle'
      ? 'MESH OFFLINE'
      : status === 'starting'
        ? 'INITIALIZING...'
        : status === 'running'
          ? 'MESH ACTIVE'
          : 'MESH ERROR';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>// OLNs</Text>

      <View style={styles.statusSection}>
        <Animated.Text
          style={[
            styles.statusText,
            { color: statusColor, opacity: status === 'starting' ? pulseAnim : 1 },
          ]}>
          {statusLabel}
        </Animated.Text>

        {status === 'running' && (
          <Animated.Text
            style={[
              styles.peerCount,
              { opacity: peerCount > 0 ? pulseAnim : 1 },
            ]}>
            {String(peerCount).padStart(2, '0')} PEERS
          </Animated.Text>
        )}

        {status === 'error' && errorMessage && (
          <Text style={styles.errorDetail}>{errorMessage}</Text>
        )}
      </View>

      <Text style={styles.label}>FEED</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.accent,
    fontSize: 24,
    fontFamily: fonts.bold,
  },
  statusSection: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    letterSpacing: 3,
  },
  peerCount: {
    color: colors.hopIndicator,
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 2,
  },
  errorDetail: {
    color: colors.textMeta,
    fontSize: 11,
    fontFamily: fonts.regular,
    letterSpacing: 3,
    textAlign: 'center',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.regular,
    letterSpacing: 4,
    marginTop: spacing.md,
  },
});
