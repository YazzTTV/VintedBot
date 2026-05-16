/**
 * Tracking Service - Suivi Colis Chine -> France
 * Support : La Poste (Colissimo), China Post, 4PX, Yanwen, Cainiao, Yun Express
 *
 * Strategie : La Poste API officielle + 17TRACK pour tous les autres carriers
 *
 * Env vars required:
 *   LAPOSTE_API_KEY=your_x_okapi_key
 *   TRACK17_API_KEY=your_17track_secret_key
 */

import { ParcelStatus } from '@prisma/client'
import { carrierIdToName, detectCarrierFromTrackingNumber } from './carrier-map'

// ── Types exportes ──────────────────────────────────────────────────────────

export interface TrackingEvent {
  date: string | null
  location: string | null
  description: string
  status: ParcelStatus
  stage: string | null
}

export interface TrackingResult {
  success: boolean
  provider: 'laposte' | 'track17'
  trackingNumber: string
  carrier?: string | null
  carrierCode?: string | null
  status?: string | null
  statusCode?: string | null
  statusEnum?: ParcelStatus
  lastUpdate?: string | null
  lastEventDescription?: string | null
  location?: string | null
  estimatedDelivery?: string | null
  daysInTransit?: number | null
  daysSinceOrder?: number | null
  events?: TrackingEvent[]
  error?: unknown
  rejected?: string
}

// ── Mapping statuts 17TRACK -> enum Prisma ──────────────────────────────────

export function mapStatusToEnum(rawStatus: string): ParcelStatus {
  if (!rawStatus) return ParcelStatus.INCONNU

  const s = rawStatus.toLowerCase()

  // Delivered
  if (s === 'delivered') return ParcelStatus.LIVRE

  // In transit variants
  if (
    s.startsWith('intransit') ||
    s === 'in_transit' ||
    s === 'transit' ||
    s.includes('transit')
  )
    return ParcelStatus.EN_TRANSIT

  // Info received / pre-shipment
  if (s.startsWith('inforeceived') || s.startsWith('info_received') || s === 'pending')
    return ParcelStatus.EN_ATTENTE

  // Picked up / taken in charge
  if (
    s.startsWith('pickup') ||
    s.startsWith('pickedup') ||
    s.startsWith('picked_up') ||
    s === 'accepted'
  )
    return ParcelStatus.PRIS_EN_CHARGE

  // Out for delivery / available for pickup
  if (
    s.startsWith('availableforpickup') ||
    s.startsWith('available_for_pickup') ||
    s.startsWith('outfordelivery') ||
    s.startsWith('out_for_delivery')
  )
    return ParcelStatus.EN_LIVRAISON

  // Exception / incident variants
  if (
    s.startsWith('exception') ||
    s === 'failed' ||
    s === 'failedattempt' ||
    s === 'failed_attempt' ||
    s === 'undeliverable'
  )
    return ParcelStatus.INCIDENT

  // Return
  if (
    s === 'returned' ||
    s === 'return' ||
    s === 'returning' ||
    s === 'returnedtosender'
  )
    return ParcelStatus.RETOUR

  return ParcelStatus.INCONNU
}

// ── Carrier -> Provider mapping ─────────────────────────────────────────────

type Provider = 'laposte' | 'track17'

const PROVIDER_MAP: Record<string, Provider> = {
  colissimo: 'laposte',
  laposte: 'laposte',
  chinapost: 'track17',
  ems: 'track17',
  'china-ems': 'track17',
  '4px': 'track17',
  yanwen: 'track17',
  cainiao: 'track17',
  'cainiao-global': 'track17',
  yunexpress: 'track17',
  'yun-express': 'track17',
}

// ── Service ─────────────────────────────────────────────────────────────────

class TrackingService {
  private laPosteKey: string | undefined
  private track17Key: string | undefined

  constructor() {
    this.laPosteKey = process.env.LAPOSTE_API_KEY
    this.track17Key = process.env.TRACK17_API_KEY
  }

  /**
   * Main entry point - auto-detect carrier if not provided
   */
  async track(
    trackingNumber: string,
    carrierHint: string | null = null
  ): Promise<TrackingResult> {
    if (!trackingNumber) throw new Error('Tracking number required')

    if (carrierHint && PROVIDER_MAP[carrierHint.toLowerCase()]) {
      return this._trackByCarrier(trackingNumber, carrierHint.toLowerCase())
    }

    return this.track17(trackingNumber)
  }

  private async _trackByCarrier(
    trackingNumber: string,
    carrier: string
  ): Promise<TrackingResult> {
    const provider = PROVIDER_MAP[carrier]

    if (provider === 'laposte') {
      if (
        !this.laPosteKey ||
        /pending|placeholder|your_/i.test(this.laPosteKey)
      ) {
        if (this.track17Key) return this.track17(trackingNumber)
        throw new Error('Ni LAPOSTE_API_KEY ni TRACK17_API_KEY configurees')
      }
      const result = await this.trackColissimo(trackingNumber)
      if (!result.success && this.track17Key) {
        return this.track17(trackingNumber)
      }
      return result
    } else if (provider === 'track17') {
      return this.track17(trackingNumber)
    } else {
      throw new Error(`Unknown carrier: ${carrier}`)
    }
  }

  /**
   * La Poste Colissimo - Official API (France only)
   */
  async trackColissimo(trackingNumber: string): Promise<TrackingResult> {
    if (!this.laPosteKey) {
      throw new Error(
        'LAPOSTE_API_KEY not configured. Register at https://developer.laposte.fr'
      )
    }

    try {
      const response = await fetch(
        `https://api.laposte.fr/ssu/v1/suivi-unifie/idship/${trackingNumber}`,
        {
          headers: {
            'X-Okapi-Key': this.laPosteKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        }
      )

      if (!response.ok) {
        return {
          success: false,
          provider: 'laposte',
          trackingNumber,
          error: `HTTP ${response.status}`,
        }
      }

      const data = await response.json()
      const latestEvent = data.timeline?.[0] || {}

      const statusEnum = mapStatusToEnum(latestEvent.status || '')

      return {
        success: true,
        provider: 'laposte',
        trackingNumber,
        status: latestEvent.label || 'Unknown',
        statusCode: latestEvent.status || 'unknown',
        statusEnum,
        lastUpdate: latestEvent.date ?? null,
        estimatedDelivery: data.deliveryDate ?? null,
        events: (data.timeline || []).map(
          (e: { date: string; status: string; label: string }) => ({
            date: e.date,
            location: null,
            description: e.label,
            status: mapStatusToEnum(e.status || ''),
            stage: e.status ?? null,
          })
        ),
      }
    } catch (error) {
      return {
        success: false,
        provider: 'laposte',
        trackingNumber,
        error,
      }
    }
  }

  /**
   * 17TRACK v2.2 - Universal Tracker
   */
  async track17(trackingNumber: string): Promise<TrackingResult> {
    if (!this.track17Key) {
      throw new Error(
        'TRACK17_API_KEY not configured. Register at https://www.17track.net/en/api'
      )
    }

    try {
      // Step 1: Register (idempotent)
      await this._track17Register(trackingNumber)

      // Step 2: Query tracking info
      const response = await fetch(
        'https://api.17track.net/track/v2.2/gettrackinfo',
        {
          method: 'POST',
          headers: {
            '17token': this.track17Key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{ number: trackingNumber }]),
          signal: AbortSignal.timeout(10000),
        }
      )

      const responseData = await response.json()

      if (responseData.code !== 0) {
        throw new Error(
          `17TRACK error: ${responseData.data?.errors?.[0]?.message || 'Unknown error'}`
        )
      }

      const shipment = responseData.data?.accepted?.[0]

      if (!shipment) {
        return {
          success: false,
          provider: 'track17',
          trackingNumber,
          error: 'Tracking number not found',
          rejected: responseData.data?.rejected?.[0]?.error?.message,
        }
      }

      const info = shipment.track_info || {}
      const latestStatus = info.latest_status || {}
      const latestEvent = info.latest_event || {}
      const providers: Array<{ events?: Array<{
        time_iso: string
        location: string
        description: string
        stage: string
      }> }> = info.tracking?.providers || []
      const rawEvents = providers.flatMap((p) => p.events || [])

      const statusRaw: string =
        latestStatus.sub_status || latestStatus.status || ''
      const statusEnum = mapStatusToEnum(statusRaw)

      // estimated_delivery_date est un objet {source, from, to} en v2.2
      const edd = info.time_metrics?.estimated_delivery_date
      const estimatedDeliveryStr: string | null =
        (edd && typeof edd === 'object' ? (edd.to || edd.from || null) : edd) ?? null

      // Carrier name lisible : priorite a la detection par numero, puis lookup par ID 17TRACK
      const carrierFromTn = detectCarrierFromTrackingNumber(trackingNumber)
      const carrierFromId = shipment.carrier != null ? carrierIdToName(shipment.carrier) : null
      const carrierName = carrierFromTn || carrierFromId || null

      return {
        success: true,
        provider: 'track17',
        trackingNumber,
        carrier: carrierName,
        carrierCode: shipment.carrier != null ? String(shipment.carrier) : (shipment.carrier_code != null ? String(shipment.carrier_code) : null),
        status:
          latestStatus.sub_status_descr ||
          latestStatus.sub_status ||
          latestStatus.status ||
          null,
        statusCode: statusRaw || null,
        statusEnum,
        lastUpdate: latestEvent.time_iso ?? null,
        lastEventDescription: latestEvent.description ?? null,
        location: latestEvent.location ?? null,
        estimatedDelivery: estimatedDeliveryStr,
        daysInTransit: info.time_metrics?.days_of_transit ?? null,
        daysSinceOrder: info.time_metrics?.days_after_order ?? null,
        events: rawEvents.map((e) => ({
          date: e.time_iso ?? null,
          location: e.location ?? null,
          description: e.description ?? '',
          status: mapStatusToEnum(e.stage || ''),
          stage: e.stage ?? null,
        })),
      }
    } catch (error) {
      return {
        success: false,
        provider: 'track17',
        trackingNumber,
        error,
      }
    }
  }

  private async _track17Register(trackingNumber: string): Promise<void> {
    if (!this.track17Key) return

    try {
      const response = await fetch(
        'https://api.17track.net/track/v2.2/register',
        {
          method: 'POST',
          headers: {
            '17token': this.track17Key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{ number: trackingNumber }]),
          signal: AbortSignal.timeout(10000),
        }
      )
      const data = await response.json()
      // Ignore "already registered" error (code 10002 dans rejected)
      if (
        data.code !== 0 &&
        data.data?.rejected?.[0]?.error?.code !== 10002
      ) {
        // Non-blocking : on continue quand meme
        console.warn('17TRACK register warning:', data)
      }
    } catch {
      // Non-bloquant
    }
  }
}

export const trackingService = new TrackingService()
export default trackingService
