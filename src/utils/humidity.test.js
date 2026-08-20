import { describe, expect, it } from 'vitest'
import {
  absoluteHumidity,
  analyseHumidity,
  coolestSkinTemp,
  dewPoint,
  isValidHumidity,
  relativeHumidityAt,
  saturationVapourPressure,
  vapourPressure,
} from './humidity'

describe('saturationVapourPressure', () => {
  // Nilai acuan dari tabel psikrometrik baku. Toleransi 0,5 % sesuai akurasi
  // yang dinyatakan koefisien Alduchov-Eskridge (~0,4 %).
  it('cocok dengan nilai acuan pada suhu yang lazim di dalam sepatu', () => {
    expect(saturationVapourPressure(0)).toBeCloseTo(611, 0)
    expect(saturationVapourPressure(20) / 2339).toBeCloseTo(1, 2)
    expect(saturationVapourPressure(30) / 4246).toBeCloseTo(1, 2)
    expect(saturationVapourPressure(37) / 6275).toBeCloseTo(1, 2)
  })

  it('menolak masukan yang bukan angka', () => {
    expect(saturationVapourPressure(NaN)).toBeNull()
    expect(saturationVapourPressure(undefined)).toBeNull()
  })
})

describe('dewPoint', () => {
  it('sama dengan suhu udara saat jenuh', () => {
    expect(dewPoint(100, 28)).toBeCloseTo(28, 1)
  })

  // Sifat inilah yang membuatnya layak ditren antar hari: dua pembacaan dengan
  // titik embun sama membawa jumlah air yang sama, meski RH-nya berbeda jauh.
  it('tidak bergantung suhu pengukuran', () => {
    const td = dewPoint(70, 28)
    // Udara yang sama dibaca pada suhu berbeda: RH berubah, titik embun tidak.
    const rhAt33 = relativeHumidityAt(70, 28, 33)
    expect(dewPoint(rhAt33, 33)).toBeCloseTo(td, 1)
  })

  it('membalik rumus majunya dengan konstanta yang sama', () => {
    // Titik embun adalah suhu saat es(Td) = e. Kalau inversinya benar, keduanya
    // harus bertemu.
    const e = vapourPressure(65, 30)
    expect(saturationVapourPressure(dewPoint(65, 30))).toBeCloseTo(e, 0)
  })

  it('kosong untuk RH yang tidak sah', () => {
    expect(dewPoint(0, 28)).toBeNull()
    expect(dewPoint(-5, 28)).toBeNull()
  })
})

describe('relativeHumidityAt', () => {
  // ANGKA YANG JADI ALASAN SELURUH MODUL INI ADA.
  //
  // Ambang 70 % pada pembacaan mentah menandai kondisi yang berbeda-beda
  // tergantung suhu udara — rentangnya 25 poin di kulit.
  it('menunjukkan bahwa 70% sensor berarti hal berbeda pada suhu berbeda', () => {
    expect(relativeHumidityAt(70, 24, 33)).toBeCloseTo(41.5, 0)
    expect(relativeHumidityAt(70, 28, 33)).toBeCloseTo(52.6, 0)
    expect(relativeHumidityAt(70, 32, 33)).toBeCloseTo(66.2, 0)
  })

  it('tidak mengubah apa pun saat suhunya sama', () => {
    expect(relativeHumidityAt(65, 30, 30)).toBeCloseTo(65, 5)
  })

  // Di atas 100 % bukan keadaan yang bisa diukur — yang terjadi air berubah
  // jadi titik-titik embun.
  it('menjepit di 100% alih-alih melaporkan angka mustahil', () => {
    expect(relativeHumidityAt(90, 32, 24)).toBe(100)
  })

  it('permukaan yang lebih dingin selalu lebih lembap', () => {
    expect(relativeHumidityAt(60, 30, 28)).toBeGreaterThan(60)
    expect(relativeHumidityAt(60, 30, 34)).toBeLessThan(60)
  })
})

describe('absoluteHumidity', () => {
  it('cocok dengan nilai acuan', () => {
    // 20 °C, 50 % RH ≈ 8,7 g/m³ pada tabel baku.
    expect(absoluteHumidity(50, 20)).toBeCloseTo(8.7, 0)
  })

  it('naik bersama suhu pada RH yang sama', () => {
    expect(absoluteHumidity(70, 32)).toBeGreaterThan(absoluteHumidity(70, 24))
  })
})

describe('isValidHumidity', () => {
  it('memperlakukan nol sebagai belum ada pembacaan', () => {
    // 0 % RH di dalam sepatu yang dipakai kaki hidup tidak mungkin terjadi.
    expect(isValidHumidity(0)).toBe(false)
  })

  it('menolak pembacaan di luar rentang fisik', () => {
    expect(isValidHumidity(-3)).toBe(false)
    expect(isValidHumidity(103)).toBe(false)
    expect(isValidHumidity(NaN)).toBe(false)
  })

  it('menerima rentang yang sah', () => {
    expect(isValidHumidity(0.1)).toBe(true)
    expect(isValidHumidity(100)).toBe(true)
  })
})

describe('coolestSkinTemp', () => {
  // Titik TERDINGIN, bukan terpanas: RH di suatu permukaan = e/es(T), jadi
  // permukaan yang lebih dingin punya RH lebih tinggi. Di situlah kulit paling
  // sulit melepas keringat, dan di situlah maserasi bermula.
  it('mengambil titik terdingin, bukan terpanas', () => {
    expect(coolestSkinTemp({ metatarsal: 33.2, heel: 30.8, lateral: 31.5 })).toBe(30.8)
  })

  it('mengabaikan area yang sensornya tidak mengirim', () => {
    expect(coolestSkinTemp({ metatarsal: 32.0, heel: 0, lateral: NaN })).toBe(32.0)
    expect(coolestSkinTemp({})).toBeNull()
    expect(coolestSkinTemp(null)).toBeNull()
  })
})

describe('analyseHumidity', () => {
  it('mengembalikan RH apa adanya tanpa suhu udara', () => {
    // Tanpa TA tidak ada angka turunan yang bisa dihitung — dan menebak suhunya
    // akan menghasilkan angka yang terlihat teliti tapi karangan.
    const result = analyseHumidity({ rh: 68 })
    expect(result.valid).toBe(true)
    expect(result.rh).toBe(68)
    expect(result.dewPoint).toBeNull()
    expect(result.rhAtSkin).toBeNull()
  })

  it('menghitung seluruh turunannya saat suhu udara & kulit tersedia', () => {
    const result = analyseHumidity({ rh: 70, airTemp: 28, skinTemp: 33 })
    expect(result.dewPoint).toBeCloseTo(22.0, 0)
    expect(result.absoluteHumidity).toBeCloseTo(19.0, 0)
    expect(result.rhAtSkin).toBeCloseTo(52.6, 0)
    expect(result.dewPointMargin).toBeCloseTo(11.0, 0)
  })

  // Jarak titik embun nol berarti uap mengembun di permukaan kulit: kulit tidak
  // punya jalan lagi melepas keringat. Itulah mekanisme maserasi yang
  // sebenarnya, dan ukurannya tidak bergantung suhu.
  it('jarak titik embun menyempit saat udara mendekati jenuh', () => {
    const kering = analyseHumidity({ rh: 45, airTemp: 30, skinTemp: 32 })
    const basah = analyseHumidity({ rh: 92, airTemp: 30, skinTemp: 32 })
    expect(kering.dewPointMargin).toBeGreaterThan(13)
    expect(basah.dewPointMargin).toBeLessThan(4)
  })

  // Jarak NEGATIF berarti titik embun sudah melewati suhu kulit: uap mengembun
  // di permukaan kulit, dan tidak ada lagi jalan bagi keringat untuk menguap.
  // Inilah keadaan yang benar-benar mendahului maserasi — dan RH mentah tidak
  // pernah bisa menyatakannya, karena 92 % di udara hangat jauh lebih berbahaya
  // daripada 92 % di udara sejuk.
  it('menjadi negatif saat uap mengembun di kulit', () => {
    const mengembun = analyseHumidity({ rh: 98, airTemp: 33, skinTemp: 31 })
    expect(mengembun.dewPointMargin).toBeLessThan(0)
  })

  it('menandai pembacaan tidak sah sebagai tidak valid', () => {
    expect(analyseHumidity({ rh: 0, airTemp: 28 }).valid).toBe(false)
    expect(analyseHumidity({ rh: 140, airTemp: 28 }).valid).toBe(false)
    expect(analyseHumidity({}).valid).toBe(false)
  })
})
