export const PRESSURE_THRESHOLDS = {
  safe: 200,
  warning: 250,
}

export const TEMP_RANGE = { min: 28, max: 33 }
export const TEMP_DELTA_WARNING = 2.2

export const HUMIDITY_RANGE = { min: 40, max: 60 }
export const HUMIDITY_RISK = 70

export function getPressureStatus(kpa) {
  if (kpa < PRESSURE_THRESHOLDS.safe) return 'safe'
  if (kpa <= PRESSURE_THRESHOLDS.warning) return 'warning'
  return 'danger'
}

export function getPressureLabel(status) {
  const labels = {
    safe: 'Aman',
    warning: 'Perlu Perhatian',
    danger: 'Risiko Ulkus',
  }
  return labels[status]
}

export function getTemperatureStatus(celsius) {
  if (celsius >= TEMP_RANGE.min && celsius <= TEMP_RANGE.max) return 'safe'
  if (celsius > TEMP_RANGE.max) return 'warning'
  return 'safe'
}

export function getHumidityStatus(rh) {
  if (rh >= HUMIDITY_RANGE.min && rh <= HUMIDITY_RANGE.max) return 'safe'
  if (rh > HUMIDITY_RISK) return 'danger'
  if (rh > HUMIDITY_RANGE.max) return 'warning'
  return 'warning'
}

export const LOCATION_LABELS = {
  heel: 'Tumit',
  metatarsal: 'Metatarsal',
  toe: 'Jari Kaki',
}

