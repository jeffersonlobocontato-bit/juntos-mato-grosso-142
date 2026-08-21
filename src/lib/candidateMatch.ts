// Portado da plataforma Politiza IA (politiza.ia.br)
/** Normalize candidate name: remove accents, parenthesized party suffix, lowercase, collapse spaces. */
export function normalizeName(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
