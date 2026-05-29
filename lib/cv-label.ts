import { format } from 'date-fns'
import { it } from 'date-fns/locale'

// Returns the display label for the Nth CV version (1-based).
// e.g. cvVersionLabel(1) → "Versione 1", cvVersionLabel(3) → "Versione 3"
// Version numbers are assigned at render time by sorting all CVs for the
// profile by uploaded_at ascending — oldest = 1. They are never stored in
// the DB or read from the `version` column (which is a technical counter).
export function cvVersionLabel(versionNumber: number): string {
  return `Versione ${versionNumber}`
}

// Returns the formatted upload-date metadata line shown below the version label.
// e.g. "Caricato il 25 maggio 2026 · 12:20"
export function cvUploadedLabel(uploadedAtIso: string): string {
  const d = new Date(uploadedAtIso)
  return `Caricato il ${format(d, 'd MMMM yyyy', { locale: it })} · ${format(d, 'HH:mm', { locale: it })}`
}
