import { useMemo } from 'react'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { LinkButton } from './Button'
import { SkeletonTableRows } from './Skeleton'
import { summariseLabHistory } from '../utils/labResults'
import { parseLabDate, HBA1C_ELEVATED, LDL_ELEVATED } from '../utils/riskProfile'
import { formatDate, formatNumber } from '../utils/locale'

// Nama pemeriksaan tidak diterjemahkan — HbA1c dan LDL sama di kedua bahasa.
// Digit: HbA1c dilaporkan lab dengan satu desimal, LDL bilangan bulat.
const COLUMNS = [
  { type: 'hba1c', name: 'HbA1c', digits: 1, flagFrom: HBA1C_ELEVATED },
  { type: 'ldl', name: 'LDL', digits: 0, flagFrom: LDL_ELEVATED },
]

function formatValue(value, digits, locale) {
  return formatNumber(value, {
    locale,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

// Perubahan selalu bertanda (+0,4 / −0,7): tanpa tanda, "0,7" tidak
// mengatakan apakah kondisinya membaik atau memburuk.
function formatChange(change, digits, locale) {
  if (change === null || change === undefined) return '—'
  return formatNumber(change, {
    locale,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: 'exceptZero',
  })
}

function LabColumn({ column, rows, isLoading }) {
  const { i18n } = useLingui()
  const latest = rows[0]
  const labName = column.name

  return (
    <div className="lab-history__column">
      <h3 className="lab-history__title">
        {labName} <span>({latest?.unit ?? (column.type === 'ldl' ? 'mg/dL' : '%')})</span>
      </h3>

      {isLoading ? (
        <table className="data-table">
          <tbody>
            <SkeletonTableRows rows={3} columns={3} />
          </tbody>
        </table>
      ) : rows.length === 0 ? (
        <p className="lab-history__empty">
          <Trans>Belum ada hasil {labName} tercatat.</Trans>
        </p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <Trans>Tanggal Pemeriksaan</Trans>
                </th>
                <th className="data-table__num">
                  <Trans>Nilai</Trans>
                </th>
                <th className="data-table__num">
                  <Trans>Perubahan</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id ?? row.testedAt}>
                  <td>
                    {formatDate(parseLabDate(row.testedAt), i18n.locale)}
                    {row.corrected && (
                      <span
                        className="lab-history__corrected"
                        title={t(i18n)`Nilai untuk tanggal ini pernah dikoreksi. Catatan sebelumnya tetap tersimpan.`}
                      >
                        <Trans>dikoreksi</Trans>
                      </span>
                    )}
                  </td>
                  <td className="data-table__num">
                    {/* Penanda yang sama dengan kolom Selisih di tabel sensor:
                        nilai yang memperketat pemantauan (utils/riskProfile.js),
                        bukan vonis atas hasil lab itu sendiri. */}
                    <span className={row.value >= column.flagFrom ? 'data-table__flag' : undefined}>
                      {formatValue(row.value, column.digits, i18n.locale)}
                    </span>
                  </td>
                  <td className="data-table__num">
                    {formatChange(row.change, column.digits, i18n.locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Riwayat hasil lab di halaman Riwayat.
//
// Sengaja TIDAK dimasukkan ke grafik/tabel harian di atasnya: hasil lab
// datang tiap 3–12 bulan, jadi pada rentang 7 atau 30 hari hampir selalu
// kosong. Panel ini menampilkan seluruh riwayatnya, tidak dibatasi rentang.
export default function LabHistoryPanel({ labs, isLoading }) {
  const summary = useMemo(() => summariseLabHistory(labs), [labs])
  const hasAny = summary.hba1c.length > 0 || summary.ldl.length > 0

  return (
    <section className="panel lab-history">
      <div className="history-panel__header">
        <div>
          <h2 className="panel__title">
            <Trans>Riwayat Hasil Lab</Trans>
          </h2>
          <p className="panel__subtitle">
            <Trans>
              Setiap hasil HbA1c dan LDL yang disimpan di Profil, dari yang terbaru. Tidak dibatasi
              rentang 7/30 hari.
            </Trans>
          </p>
        </div>
        <LinkButton to="/dashboard/profile" variant="outline">
          {hasAny ? <Trans>Tambah Hasil Baru</Trans> : <Trans>Isi di Profil</Trans>}
        </LinkButton>
      </div>

      <div className="lab-history__grid">
        {COLUMNS.map((column) => (
          <LabColumn
            key={column.type}
            column={column}
            rows={summary[column.type]}
            isLoading={isLoading}
          />
        ))}
      </div>

      <p className="lab-history__note">
        <Trans>
          Angka bertanda adalah nilai yang memperketat pemantauan (HbA1c ≥ 8 %, LDL ≥ 100 mg/dL).
          Riwayat ini tidak bisa diubah atau dihapus — koreksi tersimpan sebagai catatan baru.
        </Trans>
      </p>
    </section>
  )
}
