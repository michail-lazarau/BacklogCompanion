import { TouchableOpacity, View, Text } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import type { SteamGame } from '@db/schema';
import { formatPlaytime } from '@shared/utils/formatPlaytime';
import { tokens } from '@res/tokens';

interface GameCardProps {
  game: SteamGame;
  onPress: () => void;
}

// Steam header image is 460×215 (~2.15:1). Card thumbnail mirrors that ratio.
const THUMBNAIL = { width: 108, height: 50 };

export const GameCard = ({ game, onPress }: GameCardProps) => (
  <TouchableOpacity testID="game-card" onPress={onPress}>
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm2,
        borderBottomWidth: 1,
        borderBottomColor: tokens.colors.surface800,
      }}
    >
      <FastImage
        source={{ uri: game.headerImage ?? undefined, priority: FastImage.priority.normal }}
        style={{ ...THUMBNAIL, borderRadius: tokens.borderRadius.xs }}
        resizeMode={FastImage.resizeMode.cover}
      />
      <View style={{ flex: 1, marginLeft: tokens.spacing.sm2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            className="text-text-100 font-rubik"
            style={{ flex: 1, marginRight: tokens.spacing.sm, fontSize: tokens.fontSize.body }}
          >
            {game.name}
          </Text>
          {game.playtimeForever === 0 && (
            <View
              style={{
                backgroundColor: tokens.colors.surface800,
                borderRadius: tokens.borderRadius.xs,
                paddingHorizontal: tokens.spacing.sm,
                paddingVertical: tokens.spacing.xxs,
              }}
            >
              <Text
                className="text-primary font-rubik uppercase"
                style={{ fontSize: tokens.fontSize.caption }}
              >
                Unplayed
              </Text>
            </View>
          )}
        </View>
        <Text
          className="text-text-300 font-rubik"
          style={{ fontSize: tokens.fontSize.caption, marginTop: tokens.spacing.xxs }}
        >
          {formatPlaytime(game.playtimeForever)}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);
