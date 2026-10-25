export type TimeOfDay = 'sunrise' | 'morning' | 'noon' | 'goldenHour' | 'sunset' | 'night';
export type Weather = 'clear' | 'cloudy' | 'misty' | 'windy';
export type WorldId =
  | 'mountain-valley'
  | 'green-countryside'
  | 'desert-adventure'
  | 'lake-paradise'
  | 'sunset-horizon'
  | 'night-sky';

export const TIMES_OF_DAY: { id: TimeOfDay; label: string }[] = [
  { id: 'sunrise', label: 'Sunrise' },
  { id: 'morning', label: 'Morning' },
  { id: 'noon', label: 'Noon' },
  { id: 'goldenHour', label: 'Golden hour' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'night', label: 'Night' },
];

export const WEATHERS: { id: Weather; label: string }[] = [
  { id: 'clear', label: 'Clear' },
  { id: 'cloudy', label: 'Cloudy' },
  { id: 'misty', label: 'Misty' },
  { id: 'windy', label: 'Windy' },
];
