import { createStackNavigator } from '@react-navigation/stack';

import ComposeScreen from '../screens/ComposeScreen';
import FeedScreen from '../screens/FeedScreen';
import { colors } from '../theme/colors';

export type RootStackParamList = {
  Feed: undefined;
  Compose: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Feed"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="Feed" component={FeedScreen} />
      <Stack.Screen name="Compose" component={ComposeScreen} />
    </Stack.Navigator>
  );
}
