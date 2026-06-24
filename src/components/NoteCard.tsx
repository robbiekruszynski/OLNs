import { StyleSheet, Text, View } from 'react-native';

import { MAX_HOPS } from '../mesh/MeshContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import type { Note } from '../types/Note';

interface NoteCardProps {
  note: Note;
  isOwn: boolean;
  isGhost: boolean;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();

  return `${hours}:${minutes} · ${day} ${month}`;
}

function getHopBadge(note: Note) {
  if (note.hopOrigin >= MAX_HOPS - 1) {
    return {
      label: `HOP ${note.hopOrigin} ⚠`,
      style: styles.hopBadgeLimit,
    };
  }

  if (note.hopOrigin >= 2) {
    return {
      label: `HOP ${note.hopOrigin}`,
      style: styles.hopBadgeTraveling,
    };
  }

  if (note.hopOrigin === 1) {
    return {
      label: 'HOP 1',
      style: styles.hopBadgeRelay,
    };
  }

  return {
    label: 'ORIGIN',
    style: styles.hopBadgeOrigin,
  };
}

export default function NoteCard({ note, isOwn, isGhost }: NoteCardProps) {
  const previewSuffix = note.body.length > note.preview.length ? '...' : '';
  const hopBadge = getHopBadge(note);

  return (
    <View
      style={[
        styles.card,
        isGhost
          ? styles.cardGhost
          : isOwn
            ? styles.cardOwn
            : styles.cardReceived,
        isOwn && !isGhost && styles.cardOwnAccent,
      ]}>
      <View style={styles.topRow}>
        <Text style={styles.typeLabel}>{note.type.toUpperCase()}</Text>
        <View style={styles.badgeRow}>
          {isGhost && <Text style={styles.ghostIndicator}>SIGNAL LOST</Text>}
          <Text style={[styles.hopBadge, hopBadge.style]}>{hopBadge.label}</Text>
        </View>
      </View>

      <Text style={styles.title}>{note.title}</Text>
      <Text style={styles.preview} numberOfLines={3}>
        {note.preview}
        {previewSuffix}
      </Text>

      <View style={styles.bottomRow}>
        <Text style={styles.metaLeft}>
          FROM {note.authorId.slice(0, 8).toUpperCase()}
          {isOwn ? ' (YOU)' : ''}
        </Text>
        <Text style={styles.metaRight}>{formatTimestamp(note.timestamp)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardOwn: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.accentDim,
  },
  cardReceived: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  cardGhost: {
    backgroundColor: colors.ghostNote,
    borderColor: colors.border,
  },
  cardOwnAccent: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeLabel: {
    color: colors.accent,
    fontSize: 10,
    letterSpacing: 3,
    fontFamily: fonts.bold,
  },
  ghostIndicator: {
    color: colors.textMeta,
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: fonts.regular,
  },
  hopBadge: {
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: fonts.regular,
  },
  hopBadgeOrigin: {
    color: colors.hopIndicator,
  },
  hopBadgeRelay: {
    color: colors.textSecondary,
  },
  hopBadgeTraveling: {
    color: colors.accent,
  },
  hopBadgeLimit: {
    color: colors.error,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.bold,
    marginTop: spacing.xs,
  },
  preview: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  metaLeft: {
    color: colors.textMeta,
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: fonts.regular,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  metaRight: {
    color: colors.textMeta,
    fontSize: 9,
    fontFamily: fonts.regular,
  },
});
