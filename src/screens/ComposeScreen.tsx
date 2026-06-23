import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

export default function ComposeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>COMPOSE</Text>
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
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.regular,
    letterSpacing: 4,
  },
});
