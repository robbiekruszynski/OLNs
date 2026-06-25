import * as Crypto from 'expo-crypto';
import { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getOrCreateUserId } from '../identity/getOrCreateUserId';
import { useMesh } from '../mesh/MeshContext';
import { colors, getNoteTypeColor } from '../theme/colors';
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
  const [successTypeColor, setSuccessTypeColor] = useState(colors.typeInformation);
  const successOpacity = useRef(new Animated.Value(0)).current;

  const canBroadcast =
    title.trim().length > 0 && body.trim().length > 0 && !isBroadcasting;
  const selectedTypeColor = getNoteTypeColor(selectedType);

  function showSuccessFlash() {
    setSuccessVisible(true);
    successOpacity.setValue(1);

    Animated.timing(successOpacity, {
      toValue: 0,
      duration: 1500,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setSuccessVisible(false);
      }
    });
  }

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

      setSuccessTypeColor(getNoteTypeColor(selectedType));
      setTitle('');
      setBody('');
      setSelectedType('information');
      showSuccessFlash();
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
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          },
        ]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>// COMPOSE</Text>
          <Pressable
            onPress={handleBroadcast}
            disabled={!canBroadcast}
            style={[
              styles.broadcastButton,
              canBroadcast
                ? {
                    backgroundColor: selectedTypeColor,
                    borderColor: selectedTypeColor,
                  }
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
            const typeColor = getNoteTypeColor(type);

            return (
              <Pressable
                key={type}
                onPress={() => setSelectedType(type)}
                style={[
                  styles.typePill,
                  selected
                    ? {
                        backgroundColor: `${typeColor}33`,
                        borderColor: typeColor,
                      }
                    : styles.typePillDefault,
                ]}>
                <Text
                  style={[
                    styles.typePillLabel,
                    selected
                      ? {
                          color: typeColor,
                          fontFamily: fonts.bold,
                        }
                      : styles.typePillLabelDefault,
                  ]}>
                  {type.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.titleBlock}>
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

        <View style={styles.bodyBlock}>
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

        {errorVisible && (
          <Text style={styles.errorMessage}>BROADCAST FAILED</Text>
        )}
      </View>

      {successVisible && (
        <Animated.View
          style={[styles.successOverlay, { opacity: successOpacity }]}
          pointerEvents="none">
          <Text
            style={[
              styles.successText,
              { color: successTypeColor },
            ]}>
            // TRANSMITTED
          </Text>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    ...typography.lg,
    fontFamily: fonts.bold,
    color: colors.accent,
  },
  broadcastButton: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  broadcastButtonInactive: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  broadcastLabel: {
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: fonts.bold,
  },
  broadcastLabelActive: {
    color: colors.background,
  },
  broadcastLabelInactive: {
    color: colors.textMeta,
    fontFamily: fonts.bold,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  typePillDefault: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  typePillLabel: {
    fontSize: 10,
    letterSpacing: 3,
    fontFamily: fonts.regular,
  },
  typePillLabelDefault: {
    color: colors.textMeta,
    fontFamily: fonts.regular,
  },
  titleBlock: {
    marginBottom: 16,
  },
  titleInput: {
    ...typography.base,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    paddingRight: 32,
  },
  titleCount: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: colors.textMeta,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  bodyBlock: {
    flex: 1,
  },
  bodyInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  bodyCount: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: colors.textMeta,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  successOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    fontSize: 16,
    letterSpacing: 3,
    fontFamily: fonts.bold,
  },
  errorMessage: {
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: fonts.regular,
    color: colors.error,
    textAlign: 'center',
    marginTop: 16,
  },
});
