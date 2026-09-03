import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { theme } from '../../src/theme';

function TabIcon(props: { name: ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={20} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.dim,
        tabBarStyle: {
          backgroundColor: theme.tab,
          borderTopColor: theme.border,
          height: 68,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          paddingBottom: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Load',
          tabBarIcon: ({ color }) => <TabIcon name="plus-square" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reverse"
        options={{
          title: 'Reverse',
          tabBarIcon: ({ color }) => <TabIcon name="exchange" color={color} />,
        }}
      />
      <Tabs.Screen
        name="warmup"
        options={{
          title: 'Warm-Up',
          tabBarIcon: ({ color }) => <TabIcon name="fire" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color }) => <TabIcon name="calculator" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
