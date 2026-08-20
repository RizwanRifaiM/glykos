import { msg, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import {
  getPressureLabelMsg,
  getPressureStatus,
  getHumidityStatus,
  getTemperatureStatus,
  HUMIDITY_RANGE,
  PRESSURE_THRESHOLDS,
  TEMP_DELTA_WARNING,
} from '../constants/thresholds'
import { HISTORY_METRICS_CONFIG } from '../constants/historyMetrics'
import { locationLabel } from '../utils/alertMessages'
import { analyseHumidity, coolestSkinTemp } from '../utils/humidity'
import { formatDecimal, formatNumber } from '../utils/locale'
import { IconGauge, IconThermometer, IconDroplet } from './icons'
import Sparkline from './Sparkline'

const STATUS_LABELS = {
  safe: msg`Aman`,
  warning: msg`Perhatian`,
  danger: msg`Risiko`,
}

function trendValues(history, key) {
  if (!Array.isArray(history)) return []
  return history.map((row) => Number(row[key])).filter((v) => !isNaN(v))
}

function StatusPill({ status }) {
  const { i18n } = useLingui()
  return (
    <span className={`status-pill status-pill--${status}`}>
      {i18n._(STATUS_LABELS[status] ?? STATUS_LABELS.safe)}
    </span>
  )
}

// Daftar nilai per area. Diangkat jadi komponen sendiri karena dipakai kartu
// Tekanan dan Suhu dengan satuan berbeda — dan karena nama areanya perlu
// diterjemahkan lewat i18n._(), yang menuntut hook.
function PointGrid({ points, unit }) {
  const { i18n } = useLingui()

  return (
    <div className="point-grid">
      {Object.entries(points).map(([key, val]) => (
        <div key={key} className="point-grid__item">
          <span>{locationLabel(i18n, key)}</span>
          <strong>
            {formatDecimal(val)} {unit}
          </strong>
        </div>
      ))}
    </div>
  )
}

// `empty` = belum ada pembacaan sensor sama sekali. Tanpa ini, nilai 0 masuk ke
// getXStatus() dan kartunya memvonis status untuk sesuatu yang tidak pernah
// diukur — kartu Suhu menampilkan "Aman" dan kartu Kelembapan "Perhatian"
// padahal perangkat belum pernah tersambung. Polanya mengikuti
// HistorySummaryCards.jsx yang sudah memakai .metric-card--empty.
//
// `lead` = kartu ini memegang metrik terpenting di halaman dan mendapat
// bobot visual lebih besar (kolom lebih lebar, angka lebih besar). Yang
// memutuskan kartu mana adalah halamannya, bukan kartunya sendiri —
// prioritas itu milik konteks halaman, bukan milik satu metrik.
function MetricCard({
  icon,
  title,
  value,
  unit,
  status,
  detail,
  trend,
  empty = false,
  lead = false,
  children,
}) {
  const classes = [
    'metric-card',
    empty ? 'metric-card--empty' : `metric-card--${status}`,
    lead ? 'metric-card--lead' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={classes}>
      <div className="metric-card__header">
        <span className="metric-card__icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h3 className="metric-card__title">{title}</h3>
          {empty ? (
            <span className="metric-card__detail">
              <Trans>Belum ada data</Trans>
            </span>
          ) : (
            <StatusPill status={status} />
          )}
        </div>
        {trend && <div className="metric-card__trend">{trend}</div>}
      </div>
      <div className="metric-card__value">
        <strong>{empty ? '—' : value}</strong>
        <span>{unit}</span>
      </div>
      {detail && <p className="metric-card__detail">{detail}</p>}
      {children}
    </article>
  )
}

// `hasReading` = ada pembacaan untuk HARI INI (lihat utils/dailyReading.js).
//
// Dioper dari halaman, bukan disimpulkan dari "nilainya 0", karena keduanya
// berbeda: tekanan 0 kPa adalah pembacaan yang sah — kaki yang sedang terangkat
// memang tidak menekan apa pun. Yang tidak sah adalah menampilkan angka nol itu
// saat memang belum ada yang diukur sama sekali.
export function PressureCard({ pressure, history, hasReading = true }) {
  const { i18n } = useLingui()

  const pObj =
    typeof pressure === 'object' && pressure !== null
      ? pressure
      : {
          peak: Number(pressure || 0),
          location: 'metatarsal',
          points: { metatarsal: Number(pressure || 0) },
        }

  const peak = pObj.peak ?? 0
  const status = getPressureStatus(peak)
  const location = locationLabel(i18n, pObj.location) ?? locationLabel(i18n, 'metatarsal')
  const points = pObj.points || {}
  const trendValuesArr = trendValues(history, 'pressure')

  const statusText = i18n._(getPressureLabelMsg(status))
  // Angka ambang diambil dari konstantanya, bukan ditulis ulang di dalam
  // kalimat. Sebelumnya "&lt;200 kPa aman · 200–250 perhatian · &gt;250" ditulis
  // tangan — tiga angka yang bisa menyimpang dari PRESSURE_THRESHOLDS tanpa ada
  // yang menyadarinya, dan kini harus ikut tersalin benar ke bahasa kedua juga.
  const safeText = formatNumber(PRESSURE_THRESHOLDS.safe)
  const warnText = formatNumber(PRESSURE_THRESHOLDS.warning)

  return (
    <MetricCard
      icon={<IconGauge size={20} />}
      title={t(i18n)`Tekanan Puncak`}
      value={formatDecimal(peak)}
      unit="kPa"
      status={status}
      empty={!hasReading}
      detail={hasReading ? t(i18n)`Titik tertinggi: ${location} · ${statusText}` : undefined}
      trend={
        <Sparkline
          values={trendValuesArr}
          max={HISTORY_METRICS_CONFIG.pressure.max}
          color={HISTORY_METRICS_CONFIG.pressure.color}
        />
      }
    >
      {hasReading && <PointGrid points={points} unit="kPa" />}
      <p className="metric-card__note">
        <Trans>
          Ambang: &lt;{safeText} kPa aman · {safeText}–{warnText} perhatian · &gt;{warnText} risiko
          ulkus
        </Trans>
      </p>
    </MetricCard>
  )
}

export function TemperatureCard({
  temperature,
  history,
  lead = false,
  hasReading = true,
  temperatureRise = null,
}) {
  const { i18n } = useLingui()

  const tObj =
    typeof temperature === 'object' && temperature !== null
      ? temperature
      : {
          highest: Number(temperature || 0),
          location: 'metatarsal',
          points: { metatarsal: Number(temperature || 0) },
          delta: 0,
        }

  const highest = tObj.highest ?? 0
  const delta = tObj.delta ?? 0

  // Kenaikan dari awal sesi lebih tajam daripada suhu mutlak maupun selisih
  // antar area, jadi dipakai lebih dulu bila tersedia — aturan yang sama persis
  // dengan yang menentukan peringatan (utils/alertRules.js), supaya kartu dan
  // catatan tidak pernah menyebut status yang berbeda untuk kondisi yang sama.
  const rise = temperatureRise?.hasBaseline ? temperatureRise : null
  const status = rise
    ? rise.level
    : delta >= TEMP_DELTA_WARNING
      ? 'warning'
      : getTemperatureStatus(highest)
  const location = locationLabel(i18n, tObj.location) ?? locationLabel(i18n, 'metatarsal')
  const points = tObj.points || {}
  const trendValuesArr = trendValues(history, 'temperature')
  // Tidak ada satu pun NTC yang mengirim. Suhu kulit 0 °C mustahil pada kaki
  // hidup, jadi diperlakukan sebagai "belum ada data", bukan pembacaan.
  const isEmpty = !hasReading || Object.keys(points).length === 0 || highest <= 0

  const deltaText = formatDecimal(delta)
  const thresholdText = formatDecimal(TEMP_DELTA_WARNING)
  const riseText = formatDecimal(rise?.maxRise ?? 0)
  const risenText = formatNumber(rise?.risenCount ?? 0)
  const areaText = formatNumber(rise?.areaCount ?? 0)
  // Nama tiga area disebut di dalam kalimat petunjuk, jadi harus memakai label
  // yang sama dengan point-grid — bukan ditulis ulang sebagai teks bebas.
  const areaList = [
    locationLabel(i18n, 'metatarsal'),
    locationLabel(i18n, 'heel'),
    locationLabel(i18n, 'lateral'),
  ].join(', ')

  return (
    <MetricCard
      icon={<IconThermometer size={20} />}
      title={t(i18n)`Suhu Kulit`}
      value={formatDecimal(highest)}
      unit="°C"
      status={status}
      empty={isEmpty}
      lead={lead}
      detail={isEmpty ? undefined : t(i18n)`Area terpanas: ${location}`}
      trend={
        <Sparkline
          values={trendValuesArr}
          max={HISTORY_METRICS_CONFIG.temperature.max}
          color={HISTORY_METRICS_CONFIG.temperature.color}
        />
      }
    >
      {isEmpty ? (
        <p className="metric-card__note">
          <Trans>
            Belum ada pembacaan dari sensor NTC. Sambungkan perangkat lewat Bluetooth untuk melihat
            suhu per area ({areaList}).
          </Trans>
        </p>
      ) : (
        <>
          <PointGrid points={points} unit="°C" />
          {/* Suhu per area sudah tampil di point-grid di atas. Blok ini hanya
              untuk nilai turunannya — selisih terpanas vs terdingin antar area
              pada kaki yang sama, yang jadi prediktor pre-ulkus. Butuh minimal
              DUA area; dengan satu titik saja selisihnya tidak punya arti. */}
          {Object.keys(points).length >= 2 && (
            <div className="temp-compare">
              <div className={delta >= TEMP_DELTA_WARNING ? 'highlight' : ''}>
                <span>
                  <Trans>Selisih suhu antar area</Trans>
                </span>
                <strong>{deltaText}°C</strong>
              </div>
            </div>
          )}
        </>
      )}
      {/* Penjelasan POLA-nya, bukan hanya angkanya.
          "Naik 2,4 °C" tidak memberi tahu apa pun yang bisa ditindaklanjuti;
          "naik 2,4 °C hanya di 1 dari 3 titik" adalah tanda peradangan setempat,
          sementara "naik merata di semua titik" justru menenangkan. */}
      {!isEmpty && rise && rise.risenCount > 0 && (
        <p className={rise.systemic ? 'metric-card__note' : 'metric-card__alert'}>
          {rise.systemic ? (
            <Trans>
              Naik {riseText}°C merata di semua titik — pola menyeluruh, bukan peradangan setempat
            </Trans>
          ) : (
            <Trans>
              Naik {riseText}°C hanya di {risenText} dari {areaText} titik — pola peradangan
              setempat
            </Trans>
          )}
        </p>
      )}

      {!isEmpty && !rise && delta >= TEMP_DELTA_WARNING && (
        <p className="metric-card__alert">
          <Trans>Selisih suhu &gt;{thresholdText}°C — prediktor kuat pre-ulkus</Trans>
        </p>
      )}
    </MetricCard>
  )
}

export function HumidityCard({
  humidity,
  history,
  airTemperature,
  temperaturePoints = null,
  hasReading = true,
}) {
  const { i18n } = useLingui()

  const rh = Number(humidity || 0)
  const status = getHumidityStatus(rh)
  const trendValuesArr = trendValues(history, 'humidity')
  // getHumidityStatus(0) jatuh ke cabang terakhir dan mengembalikan 'warning',
  // sehingga kartu ini memvonis "Perhatian" untuk sensor yang belum pernah
  // mengirim apa pun. 0% RH mustahil di dalam sepatu — perlakukan sebagai
  // belum ada data. (RH memang key opsional: firmware tidak mengirimnya kalau
  // sensor kelembapan tidak terdeteksi.)
  const isEmpty = !hasReading || !(rh > 0)

  const idealMin = formatNumber(HUMIDITY_RANGE.min)
  const idealMax = formatNumber(HUMIDITY_RANGE.max)
  const airText = typeof airTemperature === 'number' ? formatDecimal(airTemperature) : null

  // Angka yang DITAMPILKAN besar tetap pembacaan mentah sensor — itu yang
  // benar-benar terukur, dan menggantinya diam-diam dengan angka turunan akan
  // membuat kartu ini tidak cocok dengan apa pun yang keluar dari perangkat.
  //
  // Yang ditambahkan adalah penjelasan artinya: RH 70 % di udara 24 °C setara
  // 41,5 % di kulit, sementara RH 70 % di udara 32 °C setara 66,2 %. Tanpa
  // baris ini, angka yang sama di layar berarti dua kondisi yang jauh berbeda
  // tanpa ada yang memberi tahu. Perhitungannya di utils/humidity.js.
  const analysis = analyseHumidity({
    rh,
    airTemp: airTemperature,
    skinTemp: coolestSkinTemp(temperaturePoints),
  })
  const skinRhText = Number.isFinite(analysis.rhAtSkin)
    ? formatDecimal(analysis.rhAtSkin)
    : null
  const dewText = Number.isFinite(analysis.dewPoint) ? formatDecimal(analysis.dewPoint) : null
  const marginText = Number.isFinite(analysis.dewPointMargin)
    ? formatDecimal(analysis.dewPointMargin)
    : null
  // Jarak titik embun yang menipis berarti kulit hampir tidak bisa lagi
  // melepas keringat — mekanisme maserasi yang sebenarnya, dan ukuran yang
  // TIDAK bergantung suhu sehingga bisa dibandingkan antar hari.
  const dewPointTight = Number.isFinite(analysis.dewPointMargin) && analysis.dewPointMargin < 3

  return (
    <MetricCard
      icon={<IconDroplet size={20} />}
      title={t(i18n)`Kelembapan Sepatu`}
      value={formatDecimal(rh)}
      unit="% RH"
      status={status}
      empty={isEmpty}
      detail={isEmpty ? undefined : t(i18n)`Kelembapan udara di dalam sepatu`}
      trend={
        <Sparkline
          values={trendValuesArr}
          max={HISTORY_METRICS_CONFIG.humidity.max}
          color={HISTORY_METRICS_CONFIG.humidity.color}
        />
      }
    >
      {isEmpty ? (
        <p className="metric-card__note">
          <Trans>
            Sensor kelembapan belum mengirim data. Sambungkan perangkat lewat Bluetooth.
          </Trans>
        </p>
      ) : (
        <>
          <div className="humidity-bar">
            <div className="humidity-bar__track">
              <div className="humidity-bar__fill" style={{ width: `${Math.min(rh, 100)}%` }} />
              <div className="humidity-bar__ideal" />
            </div>
            <div className="humidity-bar__labels">
              <span>0%</span>
              <span className="ideal">
                <Trans>
                  Ideal {idealMin}–{idealMax}%
                </Trans>
              </span>
              <span>100%</span>
            </div>
          </div>
          <p className="metric-card__note">
            <Trans>&gt;70% RH meningkatkan risiko maserasi, jamur &amp; infeksi</Trans>
          </p>

          {skinRhText && (
            <p className="metric-card__note">
              <Trans>Setara {skinRhText}% di permukaan kulit — itulah yang dinilai statusnya</Trans>
            </p>
          )}

          {marginText && (
            <p className={dewPointTight ? 'metric-card__alert' : 'metric-card__note'}>
              {dewPointTight ? (
                <Trans>
                  Titik embun {dewText}°C — kulit hanya {marginText}°C di atasnya, keringat nyaris
                  tidak bisa menguap
                </Trans>
              ) : (
                <Trans>
                  Titik embun {dewText}°C — kulit masih {marginText}°C di atasnya
                </Trans>
              )}
            </p>
          )}
        </>
      )}
      {airText !== null && (
        <p className="metric-card__note metric-card__note--secondary">
          <Trans>Suhu udara sekitar: {airText}°C</Trans>
        </p>
      )}
    </MetricCard>
  )
}
