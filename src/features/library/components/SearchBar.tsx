import { useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { tokens } from '@res/tokens';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SearchBar = ({ value, onChangeText, placeholder = 'Search games…' }: SearchBarProps) => {
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">🔍</Text>
      <TextInput
        ref={inputRef}
        testID="search-bar-input"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.text300}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={styles.input}
      />
      {value.length > 0 && (
        <TouchableOpacity
          testID="search-bar-clear"
          onPress={() => {
            onChangeText('');
            inputRef.current?.focus();
          }}
          style={styles.clearButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.clearText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface800,
    borderRadius: tokens.borderRadius.lg,
    marginHorizontal: tokens.spacing.md,
    marginVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm2,
    paddingVertical: tokens.spacing.sm,
    minHeight: 44,
  },
  icon: {
    fontSize: 16,
    marginRight: tokens.spacing.xs,
  },
  input: {
    flex: 1,
    color: tokens.colors.text100,
    fontSize: tokens.fontSize.body,
    fontFamily: tokens.fontFamily.regular,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: tokens.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    color: tokens.colors.text300,
    fontSize: 20,
    lineHeight: 22,
  },
});
