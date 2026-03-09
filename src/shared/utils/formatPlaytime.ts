export const formatPlaytime = (minutes: number): string => {
  if (minutes <= 0) return '0 min';
  if (minutes < 60) return '< 1 hr';
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? '1 hr' : `${hours} hrs`;
};
