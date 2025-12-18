export const CREDITS_UPDATED_EVENT = 'thinksoft:credits-updated'

export function emitCreditsUpdated(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(CREDITS_UPDATED_EVENT))
}
