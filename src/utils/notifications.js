export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission() {
  return isNotificationSupported() ? Notification.permission : 'unsupported'
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export function notify(title, body) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/vite.svg' })
  } catch {
    // Some browsers (mostly mobile) require a service worker for the Notification
    // constructor and throw instead — safe to ignore, it's a best-effort nudge.
  }
}
