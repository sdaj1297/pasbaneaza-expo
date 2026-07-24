import { Stack, Tabs } from 'expo-router';
import { CalendarDays, Home, List, Menu, Radio } from 'lucide-react-native';
import { Platform } from 'react-native';

import { colors, fonts } from '@/constants/theme';

export default function TabLayout() {
  if (Platform.OS === 'web') {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="events" options={{ title: 'Schedule' }} />
        <Stack.Screen name="calendar" options={{ title: 'Calendar' }} />
        <Stack.Screen name="prayer" options={{ title: 'Prayer' }} />
        <Stack.Screen name="status" options={{ title: 'Status' }} />
        <Stack.Screen name="connect" options={{ title: 'Community' }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="admin" options={{ title: 'Admin' }} />
        <Stack.Screen name="event-editor" options={{ title: 'Edit Event' }} />
      </Stack>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 78,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodySemibold,
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Home color={color} size={22} /> }} />
      <Tabs.Screen name="events" options={{ title: 'Schedule', tabBarIcon: ({ color }) => <List color={color} size={22} /> }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: ({ color }) => <CalendarDays color={color} size={22} /> }} />
      <Tabs.Screen name="status" options={{ title: 'Status', tabBarIcon: ({ color }) => <Radio color={color} size={22} /> }} />
      <Tabs.Screen name="connect" options={{ title: 'More', tabBarIcon: ({ color }) => <Menu color={color} size={22} /> }} />
      <Tabs.Screen name="prayer" options={{ href: null }} />
      <Tabs.Screen name="login" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
      <Tabs.Screen name="event-editor" options={{ href: null }} />
    </Tabs>
  );
}
