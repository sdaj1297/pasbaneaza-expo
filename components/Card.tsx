import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
});
