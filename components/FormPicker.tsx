import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';

type Option = {
  label: string;
  value: string;
};

type FormPickerProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  tone?: 'dark' | 'light';
};

export function FormPicker({ label, value, options, onChange, tone = 'dark' }: FormPickerProps) {
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
      <Text style={[styles.label, tone === 'light' && styles.lightLabel]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((current) => !current)}
        style={[styles.trigger, tone === 'light' && styles.lightTrigger]}
      >
        <Text
          style={[
            styles.triggerText,
            tone === 'light' && styles.lightTriggerText,
            !value && styles.placeholderText,
            !value && tone === 'light' && styles.lightPlaceholderText,
          ]}
          numberOfLines={1}
        >
          {selectedOption?.label || label}
        </Text>
        {open ? (
          <ChevronUp color={tone === 'light' ? colors.oxblood : colors.gold} size={18} strokeWidth={2} />
        ) : (
          <ChevronDown color={tone === 'light' ? colors.oxblood : colors.gold} size={18} strokeWidth={2} />
        )}
      </Pressable>

      {open ? (
        <View style={[styles.menu, tone === 'light' && styles.lightMenu]}>
          <ScrollView nestedScrollEnabled style={styles.menuScroll}>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <Pressable
                  key={`${option.value}-${option.label}`}
                  onPress={() => choose(option.value)}
                  style={[
                    selected ? styles.activeOption : styles.option,
                    !selected && tone === 'light' && styles.lightOption,
                  ]}
                >
                  <Text
                    style={[
                      selected ? styles.activeOptionText : styles.optionText,
                      !selected && tone === 'light' && styles.lightOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selected ? <Check color={colors.onIvory} size={17} strokeWidth={2.4} /> : null}
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
    fontFamily: fonts.bodyBold,
    fontSize: typography.label,
  },
  lightLabel: {
    color: colors.onIvoryMuted,
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
  lightTrigger: {
    backgroundColor: colors.ivoryRaised,
    borderColor: colors.onIvoryLine,
  },
  triggerText: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  lightTriggerText: {
    color: colors.onIvory,
  },
  placeholderText: {
    color: colors.muted,
  },
  lightPlaceholderText: {
    color: colors.onIvoryMuted,
  },
  menu: {
    ...shadows.medium,
    backgroundColor: colors.nightRaised,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  lightMenu: {
    backgroundColor: colors.ivoryRaised,
    borderColor: colors.onIvoryLine,
  },
  menuScroll: {
    maxHeight: 240,
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  lightOption: {
    borderBottomColor: colors.onIvoryLine,
    borderBottomWidth: 1,
  },
  activeOption: {
    alignItems: 'center',
    backgroundColor: colors.ivory,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionText: {
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  lightOptionText: {
    color: colors.onIvory,
  },
  activeOptionText: {
    color: colors.onIvory,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
});
