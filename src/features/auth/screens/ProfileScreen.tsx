import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FastImage from '@d11/react-native-fast-image';
import { tokens } from '@res/tokens';
import { useProfileSummary } from '@features/auth/hooks/useProfileSummary';
import { ProfileSkeleton } from '@features/auth/components/ProfileSkeleton';
import { useLogout } from '@features/auth/hooks/useLogout';

const AVATAR_SIZE = 80;

export const ProfileScreen = () => {
  const { data, isLoading, isError, refetch } = useProfileSummary();
  const { initiateLogout } = useLogout();

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (isError && !data) {
    return (
      <SafeAreaView className="flex-1 bg-surface-900 justify-center items-center">
        <Text className="text-base font-rubik text-text-300 mb-4">
          {"Couldn't load profile."}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="bg-surface-800 px-6 py-3 rounded-lg"
          accessibilityRole="button"
          accessibilityLabel="Retry loading profile"
        >
          <Text className="text-base font-rubik text-primary">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {data ? (
          <View className="items-center pt-12">
            <FastImage
              testID="profile-avatar"
              source={{
                uri: data.avatarfull,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable,
              }}
              style={styles.avatar}
              resizeMode={FastImage.resizeMode.cover}
            />
            <Text
              className="text-2xl font-rubik text-text-100 mt-4"
              style={{ fontFamily: tokens.fontFamily.medium }}
            >
              {data.personaname}
            </Text>
            {isError && (
              <Text className="text-caption font-rubik text-text-300 mt-2">
                Showing cached data — offline
              </Text>
            )}
            <TouchableOpacity
              onPress={initiateLogout}
              className="mt-8 px-6 py-3 rounded-lg bg-surface-800"
              accessibilityRole="button"
              accessibilityLabel="Sign out of Steam account"
            >
              <Text className="text-base font-rubik text-destructive text-center">
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-1 justify-center items-center pt-12">
            <Text className="text-base font-rubik text-text-300 mb-4">
              Profile data unavailable.
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              className="bg-surface-800 px-6 py-3 rounded-lg"
              accessibilityRole="button"
              accessibilityLabel="Retry loading profile"
            >
              <Text className="text-base font-rubik text-primary">Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
});
