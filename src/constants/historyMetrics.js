import { COLORS } from './theme'

export const HISTORY_METRICS_CONFIG = {
  pressure: { label: 'Tekanan (kPa)', color: COLORS.red, max: 300 },
  temperature: { label: 'Suhu (°C)', color: COLORS.blue, max: 38 },
  humidity: { label: 'Kelembapan (%)', color: COLORS.pink, max: 100 },
}
