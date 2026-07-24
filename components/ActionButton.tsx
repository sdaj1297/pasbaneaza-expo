import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type ActionButtonProps = PropsWithChildren<{
  onPress?: () => void;
  variant?: 'primary' | 'dark' | 'outline' | 'lightOutline';
}>;

export function ActionButton({ children, onPress, variant = 'primary' }: ActionButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.button, styles[variant]]}>
      <Text style={[styles.text, variant === 'outline' && styles.outlineText, variant === 'dark' && styles.darkText, variant === 'lightOutline' && styles.lightOutlineText]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primary: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  dark: {
    backgroundColor: colors.night,
    borderColor: colors.night,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  lightOutline: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 250, 240, .45)',
  },
  text: {
    color: colors.night,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  outlineText: {
    color: colors.ink,
  },
  darkText: {
    color: colors.ivory,
  },
  lightOutlineText: {
    color: colors.ivory,
  },
});
