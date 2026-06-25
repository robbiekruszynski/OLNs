import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import ComposeScreen from '../screens/ComposeScreen';
import FeedScreen from '../screens/FeedScreen';
import { colors } from '../theme/colors';

export type RootTabParamList = {
  Feed: undefined;
  Compose: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabIcon({
  glyph,
  focused,
  fontSize,
}: {
  glyph: string;
  focused: boolean;
  fontSize: number;
}) {
  return (
    <Text
      style={{
        fontSize,
        color: focused ? colors.accent : colors.textMeta,
      }}>
      {glyph}
    </Text>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Feed"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMeta,
      }}>
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon glyph="▣" focused={focused} fontSize={18} />
          ),
        }}
      />
      <Tab.Screen
        name="Compose"
        component={ComposeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon glyph="⊕" focused={focused} fontSize={22} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
