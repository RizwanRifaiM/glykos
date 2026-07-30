import { COLORS } from '../constants/theme'

function SignalBars({ strength }) {
  const level =
    strength >= -50 ? 4 : strength >= -60 ? 3 : strength >= -70 ? 2 : 1

  return (
    <div className="signal-bars" aria-label={`Sinyal WiFi ${strength} dBm`}>
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className="signal-bars__bar"
          style={{
            height: `${bar * 5 + 4}px`,
            background: bar <= level ? COLORS.lightBlue : `${COLORS.lightBlue}44`,
          }}
        />
      ))}
    </div>
  )
}

export default function ConnectionBar({ connection }) {
  const { 
    wifi = false, 
    signalStrength = -100, 
    lastUpdate 
  } = connection || {};

  // Helper function to safely format timestamp
  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return '--:--:--';
    
    try {
      let date;
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (typeof timestamp === 'number') {
        date = timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp);
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        return '--:--:--';
      }

      if (isNaN(date.getTime())) return '--:--:--';

      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      return '--:--:--';
    }
  };

  return (
    <div className={`connection-bar ${wifi ? 'connection-bar--online' : 'connection-bar--offline'}`}>
      <div className="connection-bar__status">
        <span className={`connection-bar__dot ${wifi ? 'online' : 'offline'}`} />
        <span>{wifi ? 'Terhubung ke ESP32' : 'Koneksi Terputus'}</span>
      </div>
      {wifi && (
        <div className="connection-bar__signal">
          <SignalBars strength={signalStrength} />
          <span>{signalStrength} dBm</span>
        </div>
      )}
      <time className="connection-bar__time">
        Update terakhir: {formatLastUpdate(lastUpdate)}
      </time>
    </div>
  )
}
