import { Tabs } from 'expo-router';
import { ColorValue, Text } from 'react-native';

import { colors } from '@/constants/theme';

const tabIcon = (label: string) =>
  function Icon({ color }: { color: ColorValue }) {
    return <TextIcon color={color} label={label} />;
  };

function TextIcon({ color, label }: { color: ColorValue; label: string }) {
  return (
    <Text style={{ color, fontSize: 16, fontWeight: '900', lineHeight: 18 }}>
      {label}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('H') }} />
      <Tabs.Screen name="events" options={{ title: 'Events', tabBarIcon: tabIcon('E') }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: tabIcon('C') }} />
      <Tabs.Screen name="prayer" options={{ title: 'Prayer', tabBarIcon: tabIcon('P') }} />
      <Tabs.Screen name="status" options={{ title: 'Status', tabBarIcon: tabIcon('S') }} />
      <Tabs.Screen name="connect" options={{ title: 'Connect', tabBarIcon: tabIcon('N') }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
}
