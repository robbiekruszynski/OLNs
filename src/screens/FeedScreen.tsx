import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

export default function FeedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>// OLNs</Text>
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
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.regular,
    letterSpacing: 4,
    marginTop: 8,
  },
});
