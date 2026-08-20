import { useLingui } from '@lingui/react'
import { getPressureStatus, getTemperatureStatus } from '../constants/thresholds'
import { locationLabel } from '../utils/alertMessages'
import { formatDecimal } from '../utils/locale'
import { pressureDotRadius, pressurePulse } from '../utils/pressureScale'

// Titik peta sensor tekanan (di atas siluet kaki) & suhu (di sisi luar, dengan
// leader line ke area kaki terkait) — koordinat mengikuti viewBox 850x640 dari
// siluet kaki asli.
//
// PENTING — ilustrasi kaki ini digambar gaya outline/kontur BERONGGA (tiap
// jari = oval kosong di tengah, bukan blok solid), jadi marker harus jatuh di
// RONGGA/interior oval tersebut, bukan di garis batasnya. Sudah diverifikasi
// visual (render ke PNG & di-zoom) bahwa jari terbesar/terpanjang — hallux —
// ada di sisi KIRI ilustrasi (x kecil), bukan tengah.
//
// Acuan anatomis dipakai (persentase panjang kaki, diukur dari tumit ke ujung
// jari terpanjang; siluet: y=57 = ujung jari terpanjang, y=594 = dasar tumit,
// panjang=537):
//   - Hallux (ibu jari)   : 90% dari tumit -> y = 594 - 0.90*537 = 110.7
//                           x = pusat rongga oval jari terbesar (sisi medial) = 387
//   - Metatarsal 1        : 69% dari tumit -> y = 594 - 0.69*537 = 223.5
//                           x = sisi medial (segaris di bawah hallux) = 390
//   - Tumit                : 10% dari tumit -> y = 594 - 0.10*537 = 540.3
//                           x = tengah bantalan tumit = 467
//
// Orientasi: ilustrasi ini (hallux di sisi kiri gambar) berorientasi seperti
// kaki KANAN dilihat dari telapak — medial di kiri. Ini sekarang SUDAH COCOK
// dengan DEVICE_META.foot di useBleSensor.js yang berisi 'right'. (Sebelumnya
// kode menandainya 'left' sehingga tidak sinkron dengan gambarnya; sudah
// diperbaiki.) Kalau nanti perangkat kaki kiri ditambahkan, ilustrasi ini
// perlu varian yang dicerminkan secara horizontal, dan koordinat di bawah
// dipilih per kaki.
const PRESSURE_ANCHORS = {
  toe: { x: 387, y: 109 },
  metatarsal: { x: 390, y: 223 },
  heel: { x: 467, y: 540 },
}

// Tiga sensor NTC firmware (GPIO 35/32/33). `key` HARUS cocok dengan kunci di
// temperatureObj.points yang dibentuk useBleSensor/useSensorData — sebelumnya
// di sini dipakai 'Forefoot'/'Tumit'/'Lateral' berhuruf besar sementara data
// datang sebagai 'metatarsal'/'heel'/'lateral', sehingga TIDAK ADA satu pun
// marker suhu yang pernah ter-render.
//
// `anchor`     = posisi label di LUAR siluet (sisi kanan), diurutkan menurun
//                mengikuti anatomi: forefoot di atas, lateral di tengah,
//                tumit di bawah.
// `footAnchor` = pangkal leader line, di dalam siluet pada area terkait.
//                Lateral tidak punya sensor tekanan (tidak ada FSR di sisi
//                luar telapak), jadi titiknya ditetapkan sendiri di tepi luar
//                midfoot — siluet membentang x≈346-565 setelah translate,
//                jadi x=512 ada di paruh lateral, y=372 di pertengahan kaki.
const LATERAL_FOOT_ANCHOR = { x: 512, y: 372 }

const TEMP_MARKERS = [
  { key: 'metatarsal', anchor: { x: 630, y: 150 }, footAnchor: PRESSURE_ANCHORS.metatarsal },
  { key: 'lateral', anchor: { x: 706, y: 290 }, footAnchor: LATERAL_FOOT_ANCHOR },
  { key: 'heel', anchor: { x: 630, y: 480 }, footAnchor: PRESSURE_ANCHORS.heel },
]

const PULSE_CLASS = ['hero-pulse', 'hero-pulse hero-pulse--delay1', 'hero-pulse hero-pulse--delay2']
// Warna diambil dari custom property, bukan dari konstanta JS di
// constants/theme.js. Custom property valid sebagai nilai atribut
// presentasi SVG, jadi peta ini ikut satu sumber warna dengan sisa
// dashboard alih-alih menyimpan salinan hex-nya sendiri yang harus
// diingat untuk diperbarui terpisah.
//
// `safe` sekaligus naik dari --blue (#81a283, 2,4:1) ke --ds-safe.
const STATUS_COLOR = {
  safe: 'var(--ds-safe)',
  warning: 'var(--ds-warn)',
  danger: 'var(--ds-danger)',
}

// Number.isFinite, bukan `typeof value !== 'number'`: NaN lolos dari cek typeof
// dan berujung pada fill="rgb(NaN,...)" / teks "NaN kPa" di SVG.
// `label` diterima SUDAH BERUPA TEKS, bukan diturunkan di sini dari
// LOCATION_LABELS.
//
// Peta itu sekarang berisi DESKRIPTOR pesan ({id, message}), bukan string —
// dan merendernya langsung menghasilkan React error #31 ("Objects are not
// valid as a React child"). Yang membuatnya lolos: `lingui/no-unlocalized-
// strings` hanya menandai teks LITERAL yang belum dibungkus, bukan deskriptor
// yang dirender mentah — jadi berkas ini lulus lint sambil tetap rusak.
// Menerima teks jadi lewat prop membuat kesalahan yang sama tidak bisa
// terulang di sini tanpa terlihat.
function PressureMarker({ label, anchor, value, pulseClass, index }) {
  if (!Number.isFinite(value)) return null
  const color = STATUS_COLOR[getPressureStatus(value)]
  const radius = pressureDotRadius(value)
  const { scale, durationSec } = pressurePulse(value)

  // Label digeser mengikuti jari-jari, bukan offset tetap — dengan titik yang
  // bisa tiga kali lebih besar, offset tetap membuat angkanya tertimpa titik.
  const valueY = anchor.y - radius - 9
  const labelY = anchor.y + radius + 15

  return (
    <g>
      <circle
        className="sensor-dot"
        cx={anchor.x}
        cy={anchor.y}
        r={radius}
        fill={color}
        style={{
          '--dot-scale': scale,
          '--dot-duration': `${durationSec}s`,
          // Jeda berbeda per titik supaya ketiganya tidak berdenyut serempak
          // seperti lampu sein.
          '--dot-delay': `${index * 0.35}s`,
        }}
      />
      <circle
        className={pulseClass}
        cx={anchor.x}
        cy={anchor.y}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      <text x={anchor.x} y={valueY} fontSize="12" fontWeight="800" fill="var(--ds-ink)" textAnchor="middle">
        {formatDecimal(value)} kPa
      </text>
      <text x={anchor.x} y={labelY} fontSize="10" fill="var(--ds-ink-3)" textAnchor="middle">
        {label}
      </text>
    </g>
  )
}

// Prop-nya bernama `label`, bukan `id` seperti sebelumnya. Nama lama itu yang
// membuat bug di atas mudah terlewat: yang dioper memang label tampilan, tapi
// namanya menyiratkan identitas — jadi tidak ada yang curiga saat isinya
// berubah jadi objek deskriptor.
function TemperatureMarker({ label, anchor, value, footAnchor, pulseClass }) {
  if (!Number.isFinite(value)) return null
  const color = STATUS_COLOR[getTemperatureStatus(value)]

  return (
    <g>
      <path
        d={`M${footAnchor.x},${footAnchor.y} L${anchor.x - 20},${anchor.y}`}
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="4 5"
        opacity="0.5"
      />
      <circle cx={anchor.x} cy={anchor.y} r="6" fill={color} />
      <circle
        className={pulseClass}
        cx={anchor.x}
        cy={anchor.y}
        r="6"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
      <rect x={anchor.x + 12} y={anchor.y - 17} width="112" height="34" rx="10" fill="var(--ds-surface)" stroke={color} strokeWidth="1.5" />
      <text x={anchor.x + 24} y={anchor.y - 3} fontSize="12" fontWeight="800" fill="var(--ds-ink)">
        {formatDecimal(value)}°C
      </text>
      <text x={anchor.x + 24} y={anchor.y + 11} fontSize="9.5" fill="var(--ds-ink-3)">
        {label}
      </text>
    </g>
  )
}

export default function SensorFootMap({ pressurePoints = {}, temperaturePoints = {} }) {
  // Nama area diselesaikan DI SINI, satu tempat, lalu dioper sebagai teks.
  // useLingui() sekaligus membuat peta ini digambar ulang saat bahasa berganti.
  const { i18n } = useLingui()
  const areaLabel = (key) => locationLabel(i18n, key)

  return (
    <svg
      viewBox="0 0 850 640"
      className="hero-illustration"
      role="img"
      aria-label="Peta sensor tekanan dan suhu pada insole"
    >
      {/* Siluet kaki (jari di atas, tumit di bawah) — sama seperti ilustrasi hero landing page */}
      <g transform="translate(150,20)">
        <path
          d="M 308,221 L 308,223 L 309,224 L 309,226 L 310,227 L 310,229 L 312,233 L 312,237 L 313,238 L 313,242 L 314,243 L 314,248 L 315,249 L 315,260 L 316,261 L 316,264 L 315,265 L 315,275 L 314,276 L 314,279 L 313,280 L 312,285 L 310,288 L 310,290 L 307,295 L 307,297 L 304,303 L 304,306 L 305,307 L 306,307 L 306,303 L 307,302 L 309,294 L 315,282 L 315,280 L 317,276 L 317,273 L 318,272 L 318,268 L 319,267 L 319,247 L 318,246 L 317,239 Z M 239,37 L 238,38 L 234,38 L 228,41 L 222,46 L 222,47 L 219,50 L 215,57 L 215,59 L 214,60 L 214,62 L 213,63 L 213,65 L 211,69 L 210,79 L 209,80 L 209,91 L 210,92 L 210,96 L 211,97 L 212,103 L 216,110 L 216,120 L 215,121 L 215,128 L 214,129 L 214,133 L 208,145 L 208,147 L 205,152 L 205,154 L 204,155 L 204,157 L 202,161 L 202,164 L 200,168 L 199,176 L 198,177 L 198,181 L 197,182 L 197,188 L 196,189 L 196,216 L 197,217 L 197,221 L 198,222 L 198,226 L 200,230 L 200,233 L 202,236 L 203,241 L 207,248 L 207,250 L 209,254 L 211,256 L 213,261 L 215,263 L 219,270 L 222,273 L 224,277 L 236,290 L 236,291 L 239,294 L 239,295 L 245,303 L 256,325 L 256,327 L 260,335 L 260,337 L 261,338 L 261,340 L 262,341 L 262,343 L 263,344 L 263,346 L 265,350 L 266,358 L 267,359 L 267,363 L 268,364 L 268,383 L 267,384 L 267,389 L 266,390 L 265,401 L 264,402 L 264,405 L 263,406 L 262,415 L 261,416 L 261,419 L 260,420 L 260,424 L 259,425 L 259,428 L 258,429 L 258,433 L 257,434 L 257,437 L 256,438 L 256,442 L 255,443 L 255,447 L 254,448 L 254,452 L 253,453 L 253,457 L 252,458 L 252,462 L 251,463 L 250,475 L 249,476 L 249,484 L 248,485 L 248,516 L 249,517 L 249,523 L 250,524 L 250,528 L 251,529 L 251,532 L 252,533 L 254,541 L 261,554 L 271,564 L 282,570 L 284,570 L 288,572 L 291,572 L 292,573 L 298,573 L 299,574 L 315,574 L 316,573 L 324,573 L 325,572 L 329,572 L 330,571 L 333,571 L 334,570 L 337,570 L 338,569 L 343,568 L 355,562 L 362,556 L 363,556 L 369,550 L 369,549 L 372,546 L 372,545 L 376,540 L 380,532 L 380,530 L 382,527 L 382,525 L 384,521 L 384,518 L 385,517 L 385,513 L 386,512 L 386,507 L 387,506 L 387,497 L 388,496 L 388,474 L 387,473 L 386,449 L 385,448 L 385,413 L 386,412 L 386,401 L 387,400 L 387,392 L 388,391 L 388,385 L 389,384 L 389,378 L 390,377 L 390,373 L 391,372 L 392,362 L 393,361 L 394,353 L 395,352 L 395,348 L 396,347 L 396,344 L 397,343 L 397,340 L 398,339 L 398,336 L 399,335 L 399,332 L 400,331 L 400,328 L 401,327 L 401,323 L 403,319 L 403,315 L 405,311 L 406,303 L 407,302 L 407,299 L 408,298 L 408,295 L 409,294 L 409,291 L 410,290 L 410,286 L 411,285 L 411,281 L 412,280 L 412,275 L 413,274 L 413,269 L 414,268 L 414,261 L 415,260 L 415,232 L 414,231 L 414,226 L 413,225 L 413,222 L 412,221 L 412,218 L 410,215 L 410,213 L 403,199 L 403,197 L 402,196 L 402,194 L 401,193 L 401,191 L 399,187 L 399,184 L 398,183 L 398,178 L 397,177 L 397,170 L 400,165 L 401,157 L 402,156 L 402,128 L 401,127 L 400,122 L 398,120 L 398,119 L 394,115 L 388,112 L 385,112 L 384,111 L 374,111 L 370,113 L 368,111 L 367,103 L 362,93 L 358,89 L 354,87 L 352,87 L 351,86 L 341,86 L 339,84 L 339,82 L 338,81 L 338,79 L 336,75 L 333,72 L 333,71 L 329,68 L 325,66 L 322,66 L 321,65 L 314,65 L 313,66 L 309,67 L 302,57 L 292,52 L 279,52 L 278,53 L 274,54 L 269,58 L 267,56 L 262,46 L 257,41 L 256,41 L 252,38 L 249,38 L 248,37 Z M 276,120 L 278,119 L 280,121 L 284,123 L 286,123 L 287,124 L 293,124 L 294,123 L 297,123 L 301,121 L 305,126 L 305,136 L 303,138 L 299,140 L 297,140 L 296,141 L 280,141 L 278,140 L 275,137 L 275,130 L 276,129 Z M 281,59 L 292,59 L 293,60 L 295,60 L 297,61 L 302,66 L 304,70 L 304,74 L 302,77 L 301,83 L 300,84 L 300,88 L 299,89 L 299,114 L 296,117 L 294,118 L 291,118 L 290,119 L 285,119 L 279,116 L 275,117 L 273,115 L 271,111 L 271,109 L 270,108 L 270,105 L 269,104 L 269,101 L 268,100 L 268,96 L 267,95 L 267,82 L 268,81 L 268,75 L 269,74 L 270,69 L 275,62 Z M 238,46 L 247,46 L 248,47 L 252,48 L 260,55 L 260,56 L 265,63 L 265,66 L 263,69 L 262,77 L 261,78 L 261,97 L 262,98 L 262,103 L 263,104 L 263,112 L 260,118 L 255,123 L 249,126 L 246,126 L 245,127 L 236,127 L 235,126 L 232,126 L 231,128 L 234,130 L 249,130 L 250,129 L 253,129 L 259,126 L 264,121 L 266,117 L 267,117 L 269,120 L 269,125 L 268,126 L 268,130 L 267,131 L 267,133 L 265,135 L 262,135 L 261,136 L 255,136 L 254,137 L 249,137 L 248,138 L 243,138 L 242,139 L 239,139 L 237,140 L 237,141 L 244,141 L 245,140 L 261,140 L 262,141 L 268,141 L 269,142 L 272,142 L 273,143 L 275,143 L 276,144 L 278,144 L 282,146 L 288,151 L 289,151 L 295,158 L 298,164 L 299,169 L 300,170 L 300,173 L 301,174 L 302,180 L 303,180 L 303,174 L 302,173 L 302,169 L 301,168 L 301,165 L 300,164 L 299,159 L 295,152 L 295,149 L 297,147 L 302,147 L 306,149 L 322,150 L 323,151 L 328,152 L 334,156 L 336,156 L 337,155 L 336,152 L 334,150 L 328,147 L 326,147 L 325,146 L 317,146 L 316,145 L 314,145 L 310,141 L 310,139 L 311,138 L 312,134 L 315,131 L 319,131 L 319,129 L 310,121 L 308,117 L 308,115 L 306,111 L 306,105 L 305,104 L 305,96 L 306,95 L 306,88 L 307,87 L 307,83 L 308,82 L 308,80 L 309,78 L 314,73 L 316,72 L 321,72 L 325,74 L 331,80 L 333,84 L 333,90 L 330,93 L 329,97 L 328,98 L 328,101 L 327,102 L 327,113 L 328,114 L 328,119 L 329,120 L 329,122 L 330,123 L 330,125 L 332,129 L 334,131 L 334,132 L 341,139 L 341,154 L 340,155 L 340,157 L 341,158 L 342,158 L 344,160 L 351,164 L 356,165 L 356,164 L 354,162 L 353,162 L 346,156 L 346,149 L 345,148 L 345,144 L 346,142 L 348,140 L 352,140 L 353,139 L 355,139 L 355,137 L 348,137 L 346,136 L 338,128 L 336,124 L 335,119 L 334,118 L 334,112 L 333,110 L 334,109 L 334,103 L 335,102 L 335,100 L 339,95 L 343,93 L 350,93 L 351,94 L 353,94 L 355,95 L 360,101 L 361,107 L 362,108 L 362,119 L 363,120 L 363,123 L 361,126 L 361,130 L 360,131 L 360,143 L 361,144 L 361,147 L 362,148 L 362,151 L 364,154 L 364,156 L 368,162 L 368,171 L 370,173 L 371,173 L 373,175 L 375,172 L 375,170 L 377,168 L 381,170 L 383,170 L 385,172 L 387,172 L 387,170 L 385,168 L 381,167 L 379,165 L 378,165 L 368,155 L 365,149 L 365,146 L 364,145 L 364,140 L 365,139 L 365,133 L 366,132 L 366,128 L 367,127 L 367,125 L 372,120 L 374,119 L 376,119 L 377,118 L 384,118 L 388,120 L 394,126 L 397,132 L 397,134 L 398,135 L 398,141 L 399,142 L 399,146 L 398,147 L 398,154 L 397,155 L 397,159 L 396,160 L 395,167 L 393,170 L 395,174 L 395,182 L 396,183 L 396,188 L 397,189 L 397,192 L 398,194 L 396,195 L 390,190 L 388,189 L 387,190 L 395,200 L 395,201 L 398,204 L 398,205 L 401,208 L 401,209 L 405,214 L 408,220 L 409,226 L 410,227 L 410,233 L 411,234 L 411,252 L 410,253 L 410,260 L 409,261 L 408,270 L 407,271 L 407,274 L 406,275 L 406,278 L 405,279 L 405,282 L 404,283 L 404,286 L 403,287 L 403,290 L 402,291 L 402,295 L 401,296 L 401,299 L 400,300 L 400,303 L 399,304 L 399,307 L 398,308 L 398,312 L 397,313 L 396,321 L 395,322 L 395,325 L 394,326 L 393,335 L 392,336 L 392,339 L 391,340 L 391,345 L 390,346 L 390,350 L 389,351 L 389,355 L 388,356 L 388,361 L 387,362 L 387,367 L 386,368 L 386,374 L 385,375 L 385,381 L 384,382 L 384,392 L 383,393 L 383,410 L 382,411 L 382,500 L 381,501 L 380,513 L 379,514 L 379,517 L 378,518 L 377,525 L 375,528 L 375,530 L 371,538 L 369,540 L 367,544 L 357,554 L 343,562 L 341,562 L 340,563 L 338,563 L 334,565 L 331,565 L 330,566 L 326,566 L 325,567 L 319,567 L 318,568 L 297,568 L 296,567 L 291,567 L 290,566 L 285,565 L 282,563 L 280,563 L 276,560 L 275,560 L 266,552 L 266,551 L 263,548 L 262,545 L 260,543 L 259,539 L 257,536 L 256,530 L 255,529 L 255,526 L 254,525 L 254,520 L 253,519 L 253,480 L 254,479 L 255,461 L 256,460 L 256,455 L 257,454 L 258,445 L 259,444 L 259,441 L 260,440 L 261,433 L 263,429 L 264,422 L 266,418 L 266,415 L 267,414 L 267,411 L 268,410 L 268,406 L 269,405 L 269,401 L 270,400 L 270,394 L 271,393 L 271,384 L 272,383 L 272,365 L 271,364 L 271,355 L 270,354 L 269,344 L 268,343 L 268,340 L 267,339 L 267,337 L 266,336 L 264,328 L 257,314 L 255,312 L 253,308 L 250,305 L 250,304 L 252,303 L 258,308 L 259,308 L 277,326 L 277,327 L 282,333 L 283,336 L 284,336 L 284,335 L 282,331 L 280,329 L 279,326 L 276,323 L 276,322 L 273,319 L 273,318 L 237,283 L 237,282 L 231,276 L 231,275 L 222,264 L 222,263 L 218,258 L 217,255 L 215,253 L 206,235 L 206,233 L 203,227 L 202,220 L 201,219 L 201,214 L 200,213 L 200,193 L 201,192 L 201,185 L 202,184 L 202,179 L 203,178 L 203,175 L 204,174 L 204,171 L 205,170 L 207,162 L 209,158 L 211,156 L 212,153 L 219,146 L 227,142 L 227,140 L 224,140 L 220,142 L 218,140 L 218,137 L 219,136 L 219,125 L 220,124 L 220,115 L 221,114 L 221,112 L 220,111 L 220,109 L 218,105 L 218,102 L 217,101 L 217,98 L 216,97 L 216,92 L 215,91 L 215,80 L 216,79 L 216,74 L 217,73 L 218,67 L 224,56 L 230,50 Z"
          fill="var(--ds-ink)"
          fillRule="evenodd"
        />
      </g>

      <PressureMarker
        label={areaLabel('toe')}
        anchor={PRESSURE_ANCHORS.toe}
        value={pressurePoints.toe}
        pulseClass={PULSE_CLASS[0]}
        index={0}
      />
      <PressureMarker
        label={areaLabel('metatarsal')}
        anchor={PRESSURE_ANCHORS.metatarsal}
        value={pressurePoints.metatarsal}
        pulseClass={PULSE_CLASS[1]}
        index={1}
      />
      <PressureMarker
        label={areaLabel('heel')}
        anchor={PRESSURE_ANCHORS.heel}
        value={pressurePoints.heel}
        pulseClass={PULSE_CLASS[2]}
        index={2}
      />

      {TEMP_MARKERS.map(({ key, anchor, footAnchor }, index) => (
        <TemperatureMarker
          key={key}
          label={areaLabel(key)}
          anchor={anchor}
          value={temperaturePoints[key]}
          footAnchor={footAnchor}
          pulseClass={PULSE_CLASS[index]}
        />
      ))}
    </svg>
  )
}
