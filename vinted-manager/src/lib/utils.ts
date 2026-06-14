import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function addWorkingDays(startDate: Date, days: number): Date {
  const result = new Date(startDate)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++
    }
  }
  return result
}

export function getWorkingDaysDifference(startDate: Date, endDate: Date): number {
  // Reset time to compare full days accurately
  const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  
  const isPast = s > e
  const start = isPast ? e : s
  const end = isPast ? s : e
  
  let count = 0
  const cur = new Date(start)
  
  while (cur < end) {
    cur.setDate(cur.getDate() + 1)
    const dayOfWeek = cur.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
  }
  
  return isPast ? -count : count
}

/**
 * Nettoie une URL Shein/Temu pour ne garder que l'essentiel (domaine + path)
 * Enlève les paramètres de tracking (?mallCode, ?utm, etc.)
 */
export function normalizeUrl(url: string): string {
  if (!url) return ""
  try {
    const u = new URL(url)
    return u.origin + u.pathname
  } catch (e) {
    return url.split('?')[0]
  }
}

/**
 * Aide à la réconciliation par titre si l'URL échoue
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Compare deux titres et retourne vrai s'ils partagent suffisamment de mots clés
 */
export function fuzzyMatch(title1: string, title2: string): boolean {
  const words1 = slugify(title1).split('-').filter(w => w.length > 3)
  const words2 = slugify(title2).split('-').filter(w => w.length > 3)
  
  if (words1.length === 0 || words2.length === 0) return false
  
  const common = words1.filter(w => words2.includes(w))
  
  if (words1.length <= 2) return common.length === words1.length;
  
  const threshold = Math.ceil(words1.length * 0.75);
  return common.length >= threshold;
}

/**
 * Extrait l'ID produit d'une URL Shein ou Temu
 */
export function extractProductId(url: string): string | null {
  if (!url) return null
  // Shein: ...-p-12345.html
  const sheinMatch = url.match(/-p-(\d+)\.html/)
  if (sheinMatch) return sheinMatch[1]
  
  // Temu: ...goods_id=12345
  const temuMatch = url.match(/goods_id=(\d+)/)
  if (temuMatch) return temuMatch[1]
  
  return null
}
