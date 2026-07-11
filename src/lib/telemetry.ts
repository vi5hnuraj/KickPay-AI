export interface TelemetryPayload {
  action?: string;
  category?: string;
  success?: boolean;
  [key: string]: unknown;
}

export function trackEvent() {
  // Telemetry disabled by user request
  return;
}

export function setTelemetryOptIn() {
  if (typeof window === 'undefined') return;
  localStorage.setItem('kickpay_telemetry_optin', 'false');
}

export function isTelemetryOptedIn(): boolean {
  return false;
}
