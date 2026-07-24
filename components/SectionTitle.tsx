import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/constants/theme';

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? <Text style={styles.action}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 28,
    lineHeight: 32,
  },
  action: {
    color: colors.gold,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
});
