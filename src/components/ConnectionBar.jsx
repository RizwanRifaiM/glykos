import { Trans, useLingui } from '@lingui/react/macro'
import { IconWifi, IconWifiOff } from './icons'
import { formatLastUpdate } from '../utils/formatTime'

export default function ConnectionBar({ connection }) {
  // useLingui() dipakai untuk `t` pada atribut title — sekaligus membuat
  // komponen ini berlangganan perubahan bahasa, yang juga dibutuhkan oleh
  // formatLastUpdate() di bawah (formatnya ikut locale, lihat utils/locale.js).
  const { t } = useLingui()
  const { wifi = false, lastUpdate } = connection || {}

  return (
    <div
      className={`connection-pill ${wifi ? 'connection-pill--online' : 'connection-pill--offline'}`}
      title={wifi ? t`Terhubung ke perangkat` : t`Perangkat belum terhubung`}
    >
      {wifi ? <IconWifi size={16} /> : <IconWifiOff size={16} />}
      <span className="connection-pill__label">
        {wifi ? <Trans>Live</Trans> : <Trans>Offline</Trans>}
      </span>
      <span className="connection-pill__time">{formatLastUpdate(lastUpdate)}</span>
    </div>
  )
}
