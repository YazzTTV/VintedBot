/**
 * Mapping carrier ID 17TRACK -> nom lisible
 * Source: 17TRACK API (https://api.17track.net/en/doc?version=v2.2&anchor=carriers)
 *
 * Seuls les carriers principaux utiles au flow Shein/Temu -> France sont listes.
 * Pour les inconnus, on retourne `Carrier ${id}`.
 */

const CARRIER_MAP: Record<string, string> = {
  '100001': 'La Poste',
  '100002': 'Colissimo',
  '100003': 'Chronopost',
  '100004': 'Mondial Relay',
  '100006': 'DPD France',
  '100007': 'UPS',
  '100118': 'China Post',
  '100221': 'Yun Express',
  '100222': 'Yanwen',
  '100229': '4PX',
  '190094': 'Cainiao',
  '190271': 'GOFO France',
  '191150': 'GOFO France',
}

/**
 * Convertit un ID carrier 17TRACK en nom lisible.
 * Si l'ID est inconnu, retourne `Carrier ${id}`.
 * Si l'input ressemble deja a un nom (lettres), le retourne tel quel.
 */
export function carrierIdToName(id: string | number | null | undefined): string | null {
  if (id == null) return null
  const idStr = String(id)
  if (CARRIER_MAP[idStr]) return CARRIER_MAP[idStr]
  // Si l'input est deja une chaine alpha (ex: "colissimo" saisi par user), le garder
  if (/^[a-z][a-z\s-]+$/i.test(idStr)) return idStr
  return `Carrier ${idStr}`
}

/**
 * Detecte le carrier par prefixe du numero de suivi.
 * Utile quand 17TRACK retourne juste un ID numerique.
 */
export function detectCarrierFromTrackingNumber(tn: string): string | null {
  if (!tn) return null
  const t = tn.toUpperCase()

  // Colissimo France
  if (/^6[AM]/.test(t)) return 'Colissimo'

  // GOFO France
  if (t.startsWith('GFFR')) return 'GOFO France'

  // Cainiao
  if (/^S[A-Z0-9]{15,18}$/.test(t)) return 'Cainiao'

  // China Post / EMS
  if (/^[A-Z]{2}\d{9}CN$/.test(t)) return 'China Post'

  // 4PX
  if (t.startsWith('4PX') || t.startsWith('4PXTH')) return '4PX'

  // Yanwen
  if (t.startsWith('YW')) return 'Yanwen'

  // Yun Express
  if (t.startsWith('YE')) return 'Yun Express'

  return null
}
