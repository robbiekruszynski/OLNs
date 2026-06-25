import { StyleSheet, Text, View } from 'react-native';

import { MAX_HOPS } from '../mesh/MeshContext';
import { colors, getNoteTypeColor } from '../theme/colors';
import { fonts } from '../theme/typography';
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
      color: colors.error,
    };
  }

  if (note.hopOrigin >= 2) {
    return {
      label: `HOP ${note.hopOrigin}`,
      color: colors.accent,
    };
  }

  if (note.hopOrigin === 1) {
    return {
      label: 'HOP 1',
      color: colors.textSecondary,
    };
  }

  return {
    label: 'ORIGIN',
    color: colors.hopIndicator,
  };
}

export default function NoteCard({ note, isOwn, isGhost }: NoteCardProps) {
  const previewSuffix = note.body.length > note.preview.length ? '...' : '';
  const hopBadge = getHopBadge(note);
  const typeColor = getNoteTypeColor(note.type);
  const accentColor = isGhost ? colors.textMeta : typeColor;
  const borderColor = isGhost
    ? colors.border
    : isOwn
      ? `${typeColor}99`
      : typeColor;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isGhost ? colors.ghostNote : colors.surface,
          borderColor,
        },
      ]}>
      <View style={styles.cardInner}>
        <View
          style={[
            styles.accentBar,
            {
              backgroundColor: accentColor,
            },
          ]}
        />
        <View style={styles.cardContent}>
          <View style={styles.topRow}>
            <Text style={[styles.typeLabel, { color: accentColor }]}>
              {note.type.toUpperCase()}
            </Text>
            <View style={styles.badgeRow}>
              {isGhost && (
                <Text style={styles.ghostIndicator}>SIGNAL LOST</Text>
              )}
              <Text style={[styles.hopBadge, { color: hopBadge.color }]}>
                {hopBadge.label}
              </Text>
            </View>
          </View>

          {!isGhost && (
            <View
              style={[
                styles.typeStrip,
                { backgroundColor: `${typeColor}4D` },
              ]}
            />
          )}

          <Text
            style={[
              styles.title,
              { color: isGhost ? colors.textSecondary : colors.textPrimary },
            ]}>
            {note.title}
          </Text>
          <Text style={styles.preview} numberOfLines={3}>
            {note.preview}
            {previewSuffix}
          </Text>

          <View style={styles.bottomRow}>
            <Text style={styles.metaLeft}>
              FROM {note.authorId.slice(0, 8).toUpperCase()}
              {isOwn ? ' (YOU)' : ''}
            </Text>
            <Text style={styles.metaRight}>
              {formatTimestamp(note.timestamp)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
  },
  accentBar: {
    width: 3,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeLabel: {
    fontSize: 10,
    letterSpacing: 3,
    fontFamily: fonts.bold,
  },
  ghostIndicator: {
    color: colors.error,
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: fonts.regular,
  },
  hopBadge: {
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: fonts.regular,
  },
  typeStrip: {
    height: 1,
    marginTop: 6,
  },
  title: {
    fontSize: 15,
    fontFamily: fonts.bold,
    marginTop: 6,
  },
  preview: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metaLeft: {
    color: colors.textMeta,
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: fonts.regular,
    flexShrink: 1,
    marginRight: 8,
  },
  metaRight: {
    color: colors.textMeta,
    fontSize: 9,
    fontFamily: fonts.regular,
  },
});
