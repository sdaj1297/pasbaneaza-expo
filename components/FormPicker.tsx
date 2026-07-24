import { Picker } from '@react-native-picker/picker';
import { StyleSheet, Text, View } from 'react-native';

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
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerFrame}>
        <Picker
          selectedValue={value}
          onValueChange={(nextValue) => onChange(String(nextValue))}
          style={styles.picker}
          dropdownIconColor={colors.gold}
        >
          {options.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={option.value} />
          ))}
        </Picker>
      </View>
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
  pickerFrame: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picker: {
    color: colors.ink,
    fontSize: 16,
    minHeight: 48,
  },
});
