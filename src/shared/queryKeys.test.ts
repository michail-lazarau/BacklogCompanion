import { queryKeys } from './queryKeys';

describe('queryKeys', () => {
  describe('games', () => {
    it('games.all returns expected key array', () => {
      expect(queryKeys.games.all('12345')).toEqual(['games', '12345']);
    });

    it('games.detail returns expected key array', () => {
      expect(queryKeys.games.detail(730)).toEqual(['games', 'detail', 730]);
    });

    it('games.hltb returns expected key array', () => {
      expect(queryKeys.games.hltb(730)).toEqual(['games', 'detail', 730, 'hltb']);
    });
  });

  describe('recommendations', () => {
    it('recommendations.all returns expected key array', () => {
      expect(queryKeys.recommendations.all('12345')).toEqual(['recommendations', '12345']);
    });
  });

  describe('profile', () => {
    it('profile.summary returns expected key array', () => {
      expect(queryKeys.profile.summary('76561198002516729')).toEqual([
        'profile',
        '76561198002516729',
        'summary',
      ]);
    });

    it('profile.summary with different steamId returns different key', () => {
      const key1 = queryKeys.profile.summary('111');
      const key2 = queryKeys.profile.summary('222');
      expect(key1).not.toEqual(key2);
    });
  });
});
