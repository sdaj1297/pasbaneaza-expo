import { Stack, Tabs } from 'expo-router';
import { ColorValue, Platform, Text } from 'react-native';

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
  if (Platform.OS === 'web') {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="events" options={{ title: 'Events' }} />
        <Stack.Screen name="calendar" options={{ title: 'Calendar' }} />
        <Stack.Screen name="prayer" options={{ title: 'Prayer' }} />
        <Stack.Screen name="status" options={{ title: 'Status' }} />
        <Stack.Screen name="connect" options={{ title: 'Connect' }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="admin" options={{ title: 'Admin' }} />
      </Stack>
    );
  }

  const tabBarStyle =
    {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      height: 76,
      minHeight: 76,
      paddingBottom: 12,
      paddingTop: 8,
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '900',
          lineHeight: 14,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home', tabBarIcon: tabIcon('H') }} />
      <Tabs.Screen name="events" options={{ title: 'Events', tabBarLabel: 'Events', tabBarIcon: tabIcon('E') }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarLabel: 'Calendar', tabBarIcon: tabIcon('C') }} />
      <Tabs.Screen name="prayer" options={{ title: 'Prayer', tabBarLabel: 'Prayer', tabBarIcon: tabIcon('P') }} />
      <Tabs.Screen name="status" options={{ title: 'Status', tabBarLabel: 'Status', tabBarIcon: tabIcon('S') }} />
      <Tabs.Screen name="connect" options={{ title: 'Connect', tabBarLabel: 'Connect', tabBarIcon: tabIcon('N') }} />
      <Tabs.Screen name="login" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
}
