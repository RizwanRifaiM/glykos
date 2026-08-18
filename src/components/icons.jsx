function Icon({ size = 20, strokeWidth = 1.8, className = '', children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`.trim()}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconGauge(props) {
  return (
    <Icon {...props}>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <line x1="12" y1="18" x2="15.5" y2="12.5" />
      <circle cx="12" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function IconThermometer(props) {
  return (
    <Icon {...props}>
      <path d="M14 4.5a2 2 0 1 0-4 0v10a4 4 0 1 0 4 0Z" />
    </Icon>
  )
}

export function IconDroplet(props) {
  return (
    <Icon {...props}>
      <path d="M12 2.7 17.4 9a7.5 7.5 0 1 1-10.8 0Z" />
    </Icon>
  )
}

export function IconActivity(props) {
  return (
    <Icon {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Icon>
  )
}

export function IconClock(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14.5" />
    </Icon>
  )
}

export function IconDownload(props) {
  return (
    <Icon {...props}>
      <path d="M12 3v12" />
      <polyline points="7 10 12 15 17 10" />
      <path d="M4 21h16" />
    </Icon>
  )
}

export function IconFileText(props) {
  return (
    <Icon {...props}>
      <path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z" />
      <polyline points="14 2.5 14 8 19.5 8" />
      <line x1="8.5" y1="13" x2="15.5" y2="13" />
      <line x1="8.5" y1="17" x2="15.5" y2="17" />
    </Icon>
  )
}

export function IconRefreshCw(props) {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </Icon>
  )
}

export function IconBell(props) {
  return (
    <Icon {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Icon>
  )
}

export function IconAlertTriangle(props) {
  return (
    <Icon {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Icon>
  )
}

export function IconUser(props) {
  return (
    <Icon {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  )
}

export function IconIdCard(props) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <circle cx="8.5" cy="10.5" r="2" />
      <path d="M4.8 16.5c0-1.66 1.65-3 3.7-3s3.7 1.34 3.7 3" />
      <line x1="14.5" y1="8.5" x2="18.5" y2="8.5" />
      <line x1="14.5" y1="12" x2="18.5" y2="12" />
    </Icon>
  )
}

export function IconLogOut(props) {
  return (
    <Icon {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </Icon>
  )
}

export function IconWifi(props) {
  return (
    <Icon {...props}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </Icon>
  )
}

export function IconWifiOff(props) {
  return (
    <Icon {...props}>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </Icon>
  )
}

export function IconBluetooth(props) {
  return (
    <Icon {...props}>
      <path d="m7 7 10 10-5 5V2l5 5L7 17" />
    </Icon>
  )
}

export function IconLayoutDashboard(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.2" />
      <rect x="14" y="3" width="7" height="5" rx="1.2" />
      <rect x="14" y="12" width="7" height="9" rx="1.2" />
      <rect x="3" y="16" width="7" height="5" rx="1.2" />
    </Icon>
  )
}

export function IconHistory(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.32" />
      <polyline points="3.3 4 3.5 8.2 7.7 8" />
      <polyline points="12 8 12 12.5 15.5 14.5" />
    </Icon>
  )
}

export function IconShieldAlert(props) {
  return (
    <Icon {...props}>
      <path d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 10 4.6-1.1 8-4.9 8-10V6Z" />
      <line x1="12" y1="8.5" x2="12" y2="13" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </Icon>
  )
}

export function IconChevronDown(props) {
  return (
    <Icon {...props}>
      <polyline points="6 9 12 15 18 9" />
    </Icon>
  )
}

export function IconCheck(props) {
  return (
    <Icon {...props}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  )
}

export function IconMenu(props) {
  return (
    <Icon {...props}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </Icon>
  )
}

export function IconX(props) {
  return (
    <Icon {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Icon>
  )
}

export function IconMessageCircle(props) {
  return (
    <Icon {...props}>
      <path d="M7.9 20.9 3 22l1.1-4.9A9 9 0 1 1 7.9 20.9Z" />
    </Icon>
  )
}

export function IconSend(props) {
  return (
    <Icon {...props}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </Icon>
  )
}

export function IconSparkles(props) {
  return (
    <Icon {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5 13.4 11 16 12l-2.6 1L12 15.5 10.6 13 8 12l2.6-1Z" />
    </Icon>
  )
}

// Layar yang ditahan tetap menyala — dipakai penanda wake lock (useWakeLock.js).
export function IconSunDot(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  )
}
