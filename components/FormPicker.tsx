import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

type Option = {
  label: string;
  value: string;
};

type FormPickerProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

export function FormPicker({ label, value, options, onChange }: FormPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || options[0],
    [options, value],
  );

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((current) => !current)}
        style={styles.trigger}
      >
        <Text style={[styles.triggerText, !value && styles.placeholderText]} numberOfLines={1}>
          {selectedOption?.label || label}
        </Text>
        <Text style={styles.chevron}>v</Text>
      </Pressable>

      {open ? (
        <View style={styles.menu}>
          <ScrollView nestedScrollEnabled style={styles.menuScroll}>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <Pressable
                  key={`${option.value}-${option.label}`}
                  onPress={() => choose(option.value)}
                  style={selected ? styles.activeOption : styles.option}
                >
                  <Text style={selected ? styles.activeOptionText : styles.optionText}>{option.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexBasis: 220,
    flexGrow: 1,
    gap: spacing.xs,
  },
  label: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  trigger: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  triggerText: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  placeholderText: {
    color: colors.muted,
    fontWeight: '700',
  },
  chevron: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '900',
  },
  menu: {
    backgroundColor: colors.nightRaised,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuScroll: {
    maxHeight: 240,
  },
  option: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  activeOption: {
    backgroundColor: colors.gold,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  activeOptionText: {
    color: colors.night,
    fontSize: 15,
    fontWeight: '900',
  },
});
