import * as Crypto from 'expo-crypto';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getOrCreateUserId } from '../identity/getOrCreateUserId';
import { useMesh } from '../mesh/MeshContext';
import type { RootTabParamList } from '../navigation/AppNavigator';
import { colors, getNoteTypeColor } from '../theme/colors';
import { fonts } from '../theme/typography';
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
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { broadcastNote } = useMesh();

  const [selectedType, setSelectedType] = useState<NoteType>('information');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [successTypeColor, setSuccessTypeColor] = useState(colors.typeInformation);
  const successOverlayOpacity = useRef(new Animated.Value(0)).current;

  const canBroadcast =
    title.trim().length > 0 && body.trim().length > 0 && !isBroadcasting;
  const selectedTypeColor = getNoteTypeColor(selectedType);

  function showSuccessFlash(typeColor: string) {
    setSuccessTypeColor(typeColor);
    setSuccessVisible(true);
    successOverlayOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(successOverlayOpacity, {
        toValue: 0.95,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(successOverlayOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        return;
      }

      setSuccessVisible(false);
      setTitle('');
      setBody('');
      setSelectedType('information');
      navigation.navigate('Feed');
    });
  }

  async function handleBroadcast() {
    if (!canBroadcast) {
      return;
    }

    Keyboard.dismiss();
    setIsBroadcasting(true);
    setErrorVisible(false);
    setSuccessVisible(false);

    try {
      const authorId = await getOrCreateUserId();
      const trimmedBody = body.trim();
      const typeColor = getNoteTypeColor(selectedType);

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
      showSuccessFlash(typeColor);
    } catch {
      setErrorVisible(true);
    } finally {
      setIsBroadcasting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.flex}>
          <View
            pointerEvents="none"
            style={[
              styles.moodTint,
              {
                backgroundColor: selectedTypeColor,
              },
            ]}
          />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>// COMPOSE</Text>
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
                    styles.typeCard,
                    selected
                      ? {
                          backgroundColor: `${typeColor}1F`,
                          borderColor: typeColor,
                        }
                      : styles.typeCardDefault,
                  ]}>
                  <View
                    style={[
                      styles.typeDot,
                      {
                        backgroundColor: selected
                          ? typeColor
                          : `${typeColor}99`,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      selected
                        ? { color: typeColor }
                        : styles.typeLabelDefault,
                    ]}>
                    {type.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.inputArea}>
            <TextInput
              value={title}
              onChangeText={value => setTitle(value.slice(0, TITLE_MAX))}
              placeholder="TRANSMISSION TITLE"
              placeholderTextColor={colors.textMeta}
              style={styles.titleInput}
              maxLength={TITLE_MAX}
            />
            <View
              style={[
                styles.titleBorder,
                { backgroundColor: selectedTypeColor },
              ]}
            />
            <Text style={styles.titleCount}>
              {title.length}/{TITLE_MAX}
            </Text>

            <View style={styles.sectionDivider} />

            <View style={styles.bodyContainer}>
              <TextInput
                value={body}
                onChangeText={value => setBody(value.slice(0, BODY_MAX))}
                placeholder="COMPOSE YOUR TRANSMISSION..."
                placeholderTextColor={colors.textMeta}
                style={styles.bodyInput}
                multiline
                textAlignVertical="top"
                maxLength={BODY_MAX}
              />
              <Text style={styles.bodyCount}>
                {body.length}/{BODY_MAX}
              </Text>
            </View>

            {errorVisible && (
              <Text style={styles.errorMessage}>BROADCAST FAILED</Text>
            )}
          </View>

          <View
            style={[
              styles.broadcastZone,
              { paddingBottom: insets.bottom + 16 },
            ]}>
            <Pressable
              onPress={handleBroadcast}
              disabled={!canBroadcast}
              style={[
                styles.broadcastButton,
                canBroadcast
                  ? {
                      backgroundColor: `${selectedTypeColor}26`,
                      borderColor: selectedTypeColor,
                    }
                  : styles.broadcastButtonInactive,
              ]}>
              <Text
                style={[
                  styles.broadcastLabel,
                  canBroadcast
                    ? { color: selectedTypeColor }
                    : styles.broadcastLabelInactive,
                ]}>
                BROADCAST
              </Text>
            </Pressable>
          </View>
        </View>

        {successVisible && (
          <Animated.View
            style={[
              styles.successOverlay,
              {
                backgroundColor: colors.background,
                opacity: successOverlayOpacity,
              },
            ]}
            pointerEvents="none">
            <Text
              style={[styles.successText, { color: successTypeColor }]}>
              // TRANSMITTED
            </Text>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  moodTint: {
    ...StyleSheet.absoluteFill,
    opacity: 0.03,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.accent,
    letterSpacing: 2,
  },
  typeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  typeCard: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardDefault: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 3,
    marginTop: 6,
  },
  typeLabelDefault: {
    color: colors.textMeta,
  },
  inputArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  titleInput: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: 0,
  },
  titleBorder: {
    height: 1,
    opacity: 0.6,
    marginBottom: 4,
  },
  titleCount: {
    alignSelf: 'flex-end',
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMeta,
    marginBottom: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  bodyContainer: {
    flex: 1,
  },
  bodyInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  bodyCount: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMeta,
  },
  broadcastZone: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  broadcastButton: {
    height: 52,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastButtonInactive: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  broadcastLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 4,
  },
  broadcastLabelInactive: {
    color: colors.textMeta,
  },
  successOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontFamily: fonts.bold,
    fontSize: 20,
    letterSpacing: 3,
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
