import { Text, View } from 'react-native';
import type { BaseToastProps } from 'react-native-toast-message';
import { tokens } from '@res/tokens';

export const toastConfig = {
  error: ({ text1, text2 }: BaseToastProps) => (
    <View
      style={{
        marginHorizontal: tokens.spacing.md,
        backgroundColor: tokens.colors.surface800,
        borderRadius: tokens.borderRadius.md,
        borderLeftWidth: 4,
        borderLeftColor: tokens.colors.destructive,
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 6,
      }}
    >
      <Text
        style={{
          color: tokens.colors.text100,
          fontFamily: tokens.fontFamily.medium,
          fontSize: tokens.fontSize.body,
        }}
      >
        {text1}
      </Text>
      {!!text2 && (
        <Text
          style={{
            color: tokens.colors.text300,
            fontFamily: tokens.fontFamily.regular,
            fontSize: tokens.fontSize.caption,
            marginTop: tokens.spacing.xxs,
          }}
        >
          {text2}
        </Text>
      )}
    </View>
  ),
};
