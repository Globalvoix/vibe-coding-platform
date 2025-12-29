import type { DataPart } from '@/ai/messages/data-parts'

export function GetSandboxURL({
  message,
}: {
  message: DataPart['get-sandbox-url']
}) {
  // The sandbox preview URL is still captured in app state via `data-get-sandbox-url`.
  // We intentionally don't render any in-chat UI for it.
  void message
  return null
}
