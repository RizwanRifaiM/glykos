// scripts/check-catalog.mjs
// Memeriksa kecocokan PLACEHOLDER antara pesan asli dan terjemahannya.
//
// KENAPA INI PERLU ADA, PADAHAL SUDAH ADA DUA PENJAGA LAIN
// Penjaga yang sudah ada menutup dua cara teks bisa gagal:
//   - eslint `no-unlocalized-strings`  -> teks tidak pernah dibungkus
//   - vite `failOnMissing`             -> pesan terekstrak tapi belum diisi
//
// Ada cara KETIGA yang lolos keduanya: terjemahan yang sudah terisi tapi
// placeholder-nya salah tulis. `{peakText}` yang diterjemahkan jadi `{peak}`
// tetap dianggap terisi, tetap lolos kompilasi, dan baru terlihat saat
// dijalankan — sebagai angka yang HILANG dari kalimat. Di aplikasi pemantauan,
// "Peak pressure kPa" tanpa angkanya lebih buruk daripada kalimat yang tidak
// diterjemahkan sama sekali: yang pertama terbaca seperti pembacaan kosong.
//
// Struktur plural ICU juga diperiksa: terjemahan yang kehilangan cabang
// `one`/`other` akan gagal pada bahasa yang membedakannya.
//
// Dijalankan lewat `npm run i18n:check`, dan otomatis oleh `npm run i18n:fill`.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = join(root, 'src/locales/en/messages.po')

function joinPoString(lines) {
  return lines
    .map((line) => line.trim().replace(/^(msgid|msgstr)?\s*"/, '').replace(/"$/, ''))
    .join('')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

// Placeholder sederhana `{nama}` dan `{0}`, plus kepala blok ICU
// `{nama, plural, …}`.
//
// Nama HARUS diikuti `}` atau `,` — syarat itu yang membedakannya dari ISI
// cabang plural. Tanpa syarat itu, `{Last # Day}` terbaca sebagai placeholder
// bernama "Last" dan pemeriksaan ini melaporkan masalah pada terjemahan yang
// justru benar. (Ketahuan pada pemakaian pertama; dibiarkan sebagai catatan
// karena pola yang sama mudah terulang kalau regexnya disunting lagi.)
function placeholders(text) {
  const found = new Set()
  const re = /\{\s*([A-Za-z0-9_]+)\s*(?=[},])/g
  let match
  while ((match = re.exec(text)) !== null) found.add(match[1])
  return found
}

function pluralBranches(text) {
  const found = new Set()
  const re = /\b(zero|one|two|few|many|other)\s*\{/g
  let match
  while ((match = re.exec(text)) !== null) found.add(match[1])
  return found
}

// Tag komponen `<0>…</0>` yang disisipkan <Trans>. Hilang satu saja berarti
// bagian kalimat kehilangan penekanan atau tautannya.
function tags(text) {
  const found = new Set()
  const re = /<(\/?)(\d+)>/g
  let match
  while ((match = re.exec(text)) !== null) found.add(match[2])
  return found
}

const lines = readFileSync(catalogPath, 'utf8').split(/\r?\n/)
const problems = []
let checked = 0
let i = 0

while (i < lines.length) {
  if (!lines[i].startsWith('msgid ')) {
    i += 1
    continue
  }

  const msgidLines = [lines[i]]
  i += 1
  while (i < lines.length && lines[i].startsWith('"')) {
    msgidLines.push(lines[i])
    i += 1
  }

  const msgstrLines = []
  if (i < lines.length && lines[i].startsWith('msgstr ')) {
    msgstrLines.push(lines[i])
    i += 1
    while (i < lines.length && lines[i].startsWith('"')) {
      msgstrLines.push(lines[i])
      i += 1
    }
  }

  const msgid = joinPoString(msgidLines)
  const msgstr = msgstrLines.length ? joinPoString(msgstrLines) : ''
  if (!msgid || !msgstr) continue

  checked += 1

  const report = (what, expected, actual) => {
    problems.push(
      `${what}\n  pesan      : ${msgid}\n  terjemahan : ${msgstr}\n  diharapkan : ${[...expected].join(', ') || '(tidak ada)'}\n  ditemukan  : ${[...actual].join(', ') || '(tidak ada)'}`,
    )
  }

  const idPlaceholders = placeholders(msgid)
  const enPlaceholders = placeholders(msgstr)
  const sameSet = (a, b) => a.size === b.size && [...a].every((v) => b.has(v))

  if (!sameSet(idPlaceholders, enPlaceholders)) {
    report('PLACEHOLDER TIDAK COCOK', idPlaceholders, enPlaceholders)
  }

  const idBranches = pluralBranches(msgid)
  const enBranches = pluralBranches(msgstr)
  // Sisi Inggris boleh punya cabang LEBIH banyak (bahasa Indonesia tidak
  // membedakan bentuk plural, jadi wajar bila hanya `other`), tapi tidak boleh
  // KURANG dari yang ada di pesan aslinya.
  const missingBranches = [...idBranches].filter((branch) => !enBranches.has(branch))
  if (missingBranches.length > 0) {
    report('CABANG PLURAL HILANG', idBranches, enBranches)
  }

  const idTags = tags(msgid)
  const enTags = tags(msgstr)
  if (!sameSet(idTags, enTags)) {
    report('TAG KOMPONEN TIDAK COCOK', idTags, enTags)
  }
}

console.log(`Diperiksa : ${checked} pesan`)

if (problems.length > 0) {
  console.error(`\n${problems.length} masalah ditemukan:\n`)
  for (const problem of problems) console.error(problem + '\n')
  process.exit(1)
}

console.log('Semua placeholder, cabang plural, dan tag komponen cocok.')
