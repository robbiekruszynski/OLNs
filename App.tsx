import {
  IBMPlexMono_400Regular,
  IBMPlexMono_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-mono';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

import { RootNavigator } from './src/navigation/AppNavigator';
import { MeshProvider } from './src/mesh/MeshContext';
import { colors } from './src/theme/colors';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    IBMPlexMono_400Regular,
    IBMPlexMono_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <MeshProvider>
        <RootNavigator />
      </MeshProvider>
    </NavigationContainer>
  );
}
