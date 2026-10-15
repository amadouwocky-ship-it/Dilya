/** ASCII slug for URLs. Accents (é, è…) become letters, not empty segments. */
export function slugify(input: string): string {
  const slug = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return slug || 'produit'
}

export function isDuplicateSlugError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string; meta?: { target?: unknown } }
  if (e.code === 'P2002') {
    const target = e.meta?.target
    const targetText = Array.isArray(target) ? target.join(' ') : String(target ?? '')
    if (/slug/i.test(targetText)) return true
  }
  const message = e.message ?? ''
  return /duplicate entry/i.test(message) && /slug/i.test(message)
}
