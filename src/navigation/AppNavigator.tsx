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

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 20,
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
          height: 56,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMeta,
      }}>
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon glyph="▣" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Compose"
        component={ComposeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon glyph="⊕" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
