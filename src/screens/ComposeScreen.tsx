import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getOrCreateUserId } from '../identity/getOrCreateUserId';
import { useMesh } from '../mesh/MeshContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fonts, typography } from '../theme/typography';
import type { Note, NoteType } from '../types/Note';

const NOTE_TYPES: NoteType[] = [
  'emergency',
  'resource',
  'information',
  'waypoint',
];

const TITLE_MAX = 80;
const BODY_MAX = 1000;

export default function ComposeScreen() {
  const insets = useSafeAreaInsets();
  const { broadcastNote } = useMesh();

  const [selectedType, setSelectedType] = useState<NoteType>('information');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);

  const canBroadcast =
    title.trim().length > 0 && body.trim().length > 0 && !isBroadcasting;

  async function handleBroadcast() {
    if (!canBroadcast) {
      return;
    }

    setIsBroadcasting(true);
    setErrorVisible(false);
    setSuccessVisible(false);

    try {
      const authorId = await getOrCreateUserId();
      const trimmedBody = body.trim();

      const note: Note = {
        noteId: Crypto.randomUUID(),
        type: selectedType,
        title: title.trim(),
        body: trimmedBody,
        preview: trimmedBody.slice(0, 100),
        authorId,
        timestamp: new Date().toISOString(),
        hopOrigin: 0,
      };

      await broadcastNote(note);

      setTitle('');
      setBody('');
      setSelectedType('information');
      setSuccessVisible(true);

      setTimeout(() => {
        setSuccessVisible(false);
      }, 2000);
    } catch {
      setErrorVisible(true);
    } finally {
      setIsBroadcasting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>// COMPOSE</Text>
          <Pressable
            onPress={handleBroadcast}
            disabled={!canBroadcast}
            style={[
              styles.broadcastButton,
              canBroadcast
                ? styles.broadcastButtonActive
                : styles.broadcastButtonInactive,
            ]}>
            <Text
              style={[
                styles.broadcastLabel,
                canBroadcast
                  ? styles.broadcastLabelActive
                  : styles.broadcastLabelInactive,
              ]}>
              BROADCAST
            </Text>
          </Pressable>
        </View>

        <View style={styles.typeRow}>
          {NOTE_TYPES.map(type => {
            const selected = selectedType === type;
            return (
              <Pressable
                key={type}
                onPress={() => setSelectedType(type)}
                style={[
                  styles.typePill,
                  selected ? styles.typePillSelected : styles.typePillDefault,
                ]}>
                <Text
                  style={[
                    styles.typePillLabel,
                    selected
                      ? styles.typePillLabelSelected
                      : styles.typePillLabelDefault,
                  ]}>
                  {type.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.fieldBlock}>
          <TextInput
            value={title}
            onChangeText={value => setTitle(value.slice(0, TITLE_MAX))}
            placeholder="TRANSMISSION TITLE"
            placeholderTextColor={colors.textMeta}
            style={styles.titleInput}
            maxLength={TITLE_MAX}
          />
          <Text style={styles.titleCount}>
            {String(title.length).padStart(2, '0')}/{TITLE_MAX}
          </Text>
        </View>

        <View style={styles.fieldBlock}>
          <TextInput
            value={body}
            onChangeText={value => setBody(value.slice(0, BODY_MAX))}
            placeholder="COMPOSE YOUR NOTE..."
            placeholderTextColor={colors.textMeta}
            style={styles.bodyInput}
            multiline
            textAlignVertical="top"
            maxLength={BODY_MAX}
          />
          <Text style={styles.bodyCount}>
            {String(body.length).padStart(4, '0')}/{BODY_MAX}
          </Text>
        </View>

        {successVisible && (
          <Text style={styles.successMessage}>// TRANSMITTED</Text>
        )}
        {errorVisible && (
          <Text style={styles.errorMessage}>BROADCAST FAILED</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.lg,
    fontFamily: fonts.bold,
    color: colors.accent,
  },
  broadcastButton: {
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  broadcastButtonActive: {
    borderColor: colors.accent,
  },
  broadcastButtonInactive: {
    borderColor: colors.border,
  },
  broadcastLabel: {
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: fonts.regular,
  },
  broadcastLabelActive: {
    color: colors.accent,
  },
  broadcastLabelInactive: {
    color: colors.textMeta,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  typePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 2,
  },
  typePillSelected: {
    backgroundColor: colors.accent,
  },
  typePillDefault: {
    backgroundColor: colors.surfaceAlt,
  },
  typePillLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: fonts.regular,
  },
  typePillLabelSelected: {
    color: colors.background,
  },
  typePillLabelDefault: {
    color: colors.textSecondary,
  },
  fieldBlock: {
    marginBottom: spacing.lg,
  },
  titleInput: {
    ...typography.base,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    paddingRight: spacing.xl,
  },
  titleCount: {
    ...typography.xs,
    color: colors.textMeta,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  bodyInput: {
    ...typography.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 144,
    padding: spacing.sm,
    paddingBottom: spacing.lg,
  },
  bodyCount: {
    ...typography.xs,
    color: colors.textMeta,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  successMessage: {
    ...typography.lg,
    fontFamily: fonts.bold,
    color: colors.hopIndicator,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  errorMessage: {
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: fonts.regular,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
