import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NoteCard from '../components/NoteCard';
import { useMesh } from '../mesh/MeshContext';
import { colors } from '../theme/colors';
import { fonts, typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import type { Note } from '../types/Note';

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const {
    status,
    peerCount,
    errorMessage,
    userId,
    activePeerIds,
    allNotes,
    isDiscovering,
    startDiscovery,
  } = useMesh();

  const [refreshing, setRefreshing] = useState(false);
  const meshPulseAnim = useRef(new Animated.Value(1)).current;
  const discoveryPulseAnim = useRef(new Animated.Value(1)).current;

  const shouldPulseMesh =
    status === 'starting' || (status === 'running' && peerCount > 0);

  useEffect(() => {
    if (!shouldPulseMesh) {
      meshPulseAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(meshPulseAnim, {
          toValue: 0.35,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(meshPulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [meshPulseAnim, shouldPulseMesh]);

  useEffect(() => {
    if (!isDiscovering) {
      discoveryPulseAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(discoveryPulseAnim, {
          toValue: 0.35,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(discoveryPulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [discoveryPulseAnim, isDiscovering]);

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

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await startDiscovery();
    } finally {
      setRefreshing(false);
    }
  }

  function renderNote({ item }: { item: Note }) {
    const isOwn = item.authorId === userId;
    const isGhost =
      !isOwn && !activePeerIds.includes(item.authorId);

    return (
      <NoteCard note={item} isOwn={isOwn} isGhost={isGhost} />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>// OLNs</Text>

        <View style={styles.statusSection}>
          <Animated.Text
            style={[
              styles.statusText,
              {
                color: statusColor,
                opacity: status === 'starting' ? meshPulseAnim : 1,
              },
            ]}>
            {statusLabel}
          </Animated.Text>

          {status === 'running' && (
            <Animated.Text
              style={[
                styles.peerCount,
                { opacity: peerCount > 0 ? meshPulseAnim : 1 },
              ]}>
              {String(peerCount).padStart(2, '0')} PEERS
            </Animated.Text>
          )}

          {status === 'error' && errorMessage && (
            <Text style={styles.errorDetail}>{errorMessage}</Text>
          )}
        </View>

        {isDiscovering ? (
          <Animated.Text
            style={[styles.discoveryText, { opacity: discoveryPulseAnim }]}>
            SCANNING...
          </Animated.Text>
        ) : (
          <Text style={styles.discoveryTextMuted}>LISTENING</Text>
        )}
      </View>

      <FlatList
        data={allNotes}
        keyExtractor={item => item.noteId}
        renderItem={renderNote}
        contentContainerStyle={[
          styles.listContent,
          allNotes.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>NO TRANSMISSIONS</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  title: {
    ...typography.xxl,
    fontFamily: fonts.bold,
    color: colors.accent,
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
  discoveryText: {
    marginTop: spacing.sm,
    color: colors.accent,
    fontSize: 10,
    letterSpacing: 3,
    fontFamily: fonts.regular,
  },
  discoveryTextMuted: {
    marginTop: spacing.sm,
    color: colors.textMeta,
    fontSize: 10,
    letterSpacing: 3,
    fontFamily: fonts.regular,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.sm,
    color: colors.textMeta,
    letterSpacing: 3,
    fontFamily: fonts.regular,
  },
});
