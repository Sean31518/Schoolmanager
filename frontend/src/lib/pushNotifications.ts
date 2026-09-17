import { apiFetch } from './apiClient'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function getPushStatus() {
  return apiFetch<{ active: boolean; configured: boolean }>('/push/status')
}

export async function enablePushNotifications(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Push wird von diesem Browser nicht unterstützt')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Berechtigung wurde nicht erteilt')
  }

  const { publicKey, configured } = await apiFetch<{ publicKey: string | null; configured: boolean }>(
    '/push/vapid-public-key',
  )
  if (!configured || !publicKey) {
    throw new Error('Push ist serverseitig nicht konfiguriert')
  }

  const registration = await navigator.serviceWorker.ready
  let subscription: PushSubscription
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  } catch {
    // Browser-thrown DOMExceptions here (e.g. AbortError) are in English
    // and not meaningful to a user - never surface them verbatim.
    throw new Error(
      'Der Browser konnte die Push-Registrierung nicht abschließen. Versuch es später erneut.',
    )
  }

  const json = subscription.toJSON()
  await apiFetch('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  })
}

export async function disablePushNotifications(): Promise<void> {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await apiFetch('/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
  await subscription.unsubscribe()
}
