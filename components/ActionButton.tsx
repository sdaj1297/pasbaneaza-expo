import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radii, shadows, spacing } from '@/constants/theme';

type ActionButtonProps = PropsWithChildren<{
  onPress?: () => void;
  variant?: 'primary' | 'dark' | 'outline' | 'lightOutline' | 'quiet';
  disabled?: boolean;
}>;

export function ActionButton({ children, onPress, variant = 'primary', disabled = false }: ActionButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'outline' && styles.outlineText,
          variant === 'dark' && styles.darkText,
          variant === 'lightOutline' && styles.lightOutlineText,
          variant === 'quiet' && styles.quietText,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  primary: {
    ...shadows.small,
    backgroundColor: colors.ivory,
    borderColor: colors.ivory,
  },
  dark: {
    backgroundColor: colors.oxblood,
    borderColor: colors.oxblood,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  lightOutline: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(247, 241, 231, .34)',
  },
  quiet: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.surfaceAlt,
  },
  text: {
    color: colors.onIvory,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
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
  quietText: {
    color: colors.ink,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ translateY: 1 }],
  },
  disabled: {
    opacity: 0.46,
  },
});
