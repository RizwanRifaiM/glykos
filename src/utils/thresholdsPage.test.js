// Penjaga public/ambang-batas.html.
//
// Halaman itu HTML statis — tidak bisa mengimpor konstanta. Tanpa penjaga ini
// ia pasti tertinggal diam-diam begitu satu ambang diubah di kode, dan
// halaman referensi yang menyebut angka yang salah lebih berbahaya daripada
// tidak ada halaman sama sekali.
//
// Setiap angka di halaman ditandai data-const + data-value; di sini keduanya
// dicocokkan dengan konstanta yang benar-benar dipakai program.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as thresholds from '../constants/thresholds'
import * as fatigue from '../constants/fatigue'
import * as timing from '../constants/timing'
import * as riskProfile from './riskProfile'
import * as temperatureRise from './temperatureRise'
import * as temperatureTrend from './temperatureTrend'
import * as alertRules from './alertRules'
import { BASELINE_SAMPLES } from '../hooks/useTemperatureRise'

const html = readFileSync(new URL('../../public/ambang-batas.html', import.meta.url), 'utf8')

const SOURCES = {
  ...thresholds,
  ...fatigue,
  ...timing,
  ...riskProfile,
  ...temperatureRise,
  ...temperatureTrend,
  ...alertRules,
  BASELINE_SAMPLES,
}

// 'PRESSURE_THRESHOLDS.safe' → SOURCES.PRESSURE_THRESHOLDS.safe
function resolve(path) {
  return path.split('.').reduce((value, key) => value?.[key], SOURCES)
}

function attr(tag, name) {
  return new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1]
}

const tagged = [...html.matchAll(/<[^>]*\bdata-const="[^"]*"[^>]*>/g)].map(([tag]) => ({
  tag,
  name: attr(tag, 'data-const'),
  value: Number(attr(tag, 'data-value')),
}))

// Konstanta yang WAJIB muncul. Menambah ambang baru ke program berarti
// menambahkannya di sini — dan di halaman.
const REQUIRED = [
  'PRESSURE_THRESHOLDS.safe',
  'PRESSURE_THRESHOLDS.warning',
  'TEMP_RANGE.min',
  'TEMP_RANGE.max',
  'TEMP_DELTA_WARNING',
  'HUMIDITY_RANGE.min',
  'HUMIDITY_RANGE.max',
  'HUMIDITY_RISK',
  'RISE_ATTENTION',
  'RISE_ALERT',
  'BASELINE_SAMPLES',
  'SUSTAINED_DAYS',
  'SUSTAINED_WARNING_MIN',
  'SUSTAINED_DANGER_MIN',
  'SUSTAINED_GAP_GRACE_SEC',
  'REDISTRIBUTION_WARNING_PP',
  'REDISTRIBUTION_DANGER_PP',
  'TEMP_RISE_SECONDARY_C',
  'STEPS_WARNING',
  'STEPS_DANGER',
  'FATIGUE_WARNING_POINTS',
  'FATIGUE_DANGER_POINTS',
  'HBA1C_ELEVATED',
  'HBA1C_HIGH',
  'LDL_ELEVATED',
  'HBA1C_RANGE.min',
  'HBA1C_RANGE.max',
  'LDL_RANGE.min',
  'LDL_RANGE.max',
  'HBA1C_VALID_DAYS',
  'LDL_VALID_DAYS',
  'ALERT_COOLDOWN_MS',
  'HIGH_RISK_COOLDOWN_MS',
  'SYNC_INTERVAL_MS',
  'STALE_AFTER_MS',
]

describe('public/ambang-batas.html', () => {
  it('setiap angka bertanda sama dengan konstanta di kode', () => {
    expect(tagged.length).toBeGreaterThan(0)
    const mismatches = tagged
      .filter(({ name, value }) => resolve(name) !== value)
      .map(({ name, value }) => `${name}: halaman ${value}, kode ${resolve(name)}`)
    expect(mismatches).toEqual([])
  })

  it('memuat setiap ambang yang dipakai program', () => {
    const present = new Set(tagged.map(({ name }) => name))
    expect(REQUIRED.filter((name) => !present.has(name))).toEqual([])
  })

  it('angka cadangan tanpa JavaScript sama dengan nilainya (gaya Indonesia)', () => {
    const wrong = [...html.matchAll(/<b class="v"[^>]*>([^<]*)<\/b>/g)]
      .map(([tag, text]) => {
        const scale = Number(attr(tag, 'data-scale') ?? 1)
        const digits = Number(attr(tag, 'data-digits') ?? 0)
        const expected = new Intl.NumberFormat('id-ID', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }).format(Number(attr(tag, 'data-value')) / scale)
        return text === expected ? null : `${attr(tag, 'data-const')}: "${text}" ≠ "${expected}"`
      })
      .filter(Boolean)
    expect(wrong).toEqual([])
  })

  it('garis penanda di skala berada di posisi yang sesuai nilainya', () => {
    const wrong = tagged
      .filter(({ tag }) => tag.includes('class="tick"'))
      .map(({ tag, name, value }) => {
        const min = Number(attr(tag, 'data-min'))
        const max = Number(attr(tag, 'data-max'))
        const left = Number(/left:\s*([\d.]+)%/.exec(tag)?.[1])
        const expected = ((value - min) / (max - min)) * 100
        return Math.abs(left - expected) < 0.01 ? null : `${name}: ${left}% ≠ ${expected.toFixed(3)}%`
      })
      .filter(Boolean)
    expect(wrong).toEqual([])
  })
})
