// scripts/fill-catalog.mjs
// Mengisi msgstr pada src/locales/en/messages.po dari kamus terjemahan.
//
// KENAPA LEWAT SKRIP, BUKAN MENGETIK LANGSUNG DI .po
// `lingui extract` menulis ulang berkas .po setiap kali ada pesan baru. Kalau
// terjemahan hanya ada di dalam berkas itu, satu kali ekstraksi yang salah
// jalan sudah cukup untuk menghapus pekerjaan berjam-jam tanpa jejak. Kamus
// di scripts/translations.en.mjs bertahan di luar siklus itu, jadi katalog
// selalu bisa dibangun ulang: `npm run i18n:extract && npm run i18n:fill`.
//
// Skrip ini TIDAK menerjemahkan apa pun secara otomatis. Ia hanya memindahkan
// terjemahan yang sudah ditulis manusia ke tempat yang dibaca Lingui. Untuk
// istilah klinis (pre-ulkus, metatarsal, selisih suhu antar area) terjemahan
// mesin bukan pilihan di aplikasi pemantauan medis.
//
// Pesan yang belum ada di kamus dibiarkan KOSONG, bukan diisi teks Indonesia.
// Membiarkannya kosong membuat `vite build` gagal (failOnMissing di
// vite.config.js) — itu justru yang diinginkan: pesan yang belum diterjemahkan
// harus menghentikan rilis, bukan lolos diam-diam ke antarmuka Inggris.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import dict from './translations.en.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = join(root, 'src/locales/en/messages.po')

const source = readFileSync(catalogPath, 'utf8')

// Escape sesuai aturan string .po: backslash dan kutip ganda saja. Newline
// dalam terjemahan ditulis sebagai \n literal.
function poEscape(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

// .po memecah string panjang jadi beberapa baris berkutip. Menggabungkannya
// kembali diperlukan supaya msgid bisa dicocokkan dengan kunci kamus.
function joinPoString(lines) {
  return lines
    .map((line) => line.trim().replace(/^(msgid|msgstr)?\s*"/, '').replace(/"$/, ''))
    .join('')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

const lines = source.split(/\r?\n/)
const out = []
let i = 0
let filled = 0
let missing = []
let unknownKeys = new Set(Object.keys(dict))

while (i < lines.length) {
  const line = lines[i]

  if (!line.startsWith('msgid ')) {
    out.push(line)
    i += 1
    continue
  }

  // Kumpulkan msgid (bisa multi-baris).
  const msgidLines = [line]
  i += 1
  while (i < lines.length && lines[i].startsWith('"')) {
    msgidLines.push(lines[i])
    i += 1
  }
  const msgid = joinPoString(msgidLines)
  out.push(...msgidLines)

  // Lewati msgstr lama (juga bisa multi-baris).
  const hadMsgstr = i < lines.length && lines[i].startsWith('msgstr ')
  const oldMsgstrLines = []
  if (hadMsgstr) {
    oldMsgstrLines.push(lines[i])
    i += 1
    while (i < lines.length && lines[i].startsWith('"')) {
      oldMsgstrLines.push(lines[i])
      i += 1
    }
  }

  // Header .po punya msgid kosong — jangan disentuh.
  if (msgid === '') {
    out.push(...oldMsgstrLines)
    continue
  }

  unknownKeys.delete(msgid)
  const translation = dict[msgid]

  if (typeof translation === 'string' && translation.length > 0) {
    out.push(`msgstr "${poEscape(translation)}"`)
    filled += 1
  } else {
    const existing = oldMsgstrLines.length ? joinPoString(oldMsgstrLines) : ''
    if (existing) {
      // Sudah diterjemahkan langsung di .po — jangan dihapus.
      out.push(...oldMsgstrLines)
      filled += 1
    } else {
      out.push('msgstr ""')
      missing.push(msgid)
    }
  }
}

writeFileSync(catalogPath, out.join('\n'), 'utf8')

console.log(`Terisi : ${filled}`)
console.log(`Kosong : ${missing.length}`)
if (unknownKeys.size > 0) {
  // Kunci kamus yang tidak cocok dengan pesan mana pun. Hampir selalu berarti
  // teks aslinya diubah di kode tapi kamusnya belum ikut — dilaporkan supaya
  // tidak menumpuk jadi terjemahan mati yang menyesatkan.
  console.log(`\nKunci kamus tanpa pesan yang cocok (${unknownKeys.size}):`)
  for (const key of unknownKeys) console.log(`  - ${key}`)
}
if (missing.length > 0) {
  console.log(`\nBelum diterjemahkan (${missing.length}):`)
  for (const key of missing) console.log(`  - ${key}`)
}
