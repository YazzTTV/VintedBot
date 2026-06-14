import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { trackingService, mapStatusToEnum } from '@/lib/tracking/tracking-service'
import { ParcelStatus } from '@prisma/client'

// POST /api/parcels/sync-all — sync tous les parcels non livres
export async function POST() {
  try {
    // Recuperer tous les parcels qui ne sont pas encore livres
    const parcels = await prisma.parcelTracking.findMany({
      where: {
        status: {
          notIn: [ParcelStatus.LIVRE, ParcelStatus.RETOUR],
        },
      },
    })

    if (parcels.length === 0) {
      return NextResponse.json({
        success: true,
        data: { total: 0, synced: 0, failed: 0, results: [] },
      })
    }

    const results = await Promise.allSettled(
      parcels.map(async (parcel) => {
        const result = await trackingService.track(
          parcel.trackingNumber,
          parcel.carrier ?? null
        )

        if (!result.success) {
          return { id: parcel.id, success: false, error: String(result.error) }
        }

        const statusEnum: ParcelStatus =
          result.statusEnum ?? ParcelStatus.INCONNU

        await prisma.$transaction(async (tx) => {
          await tx.parcelEvent.deleteMany({ where: { parcelId: parcel.id } })

          const eventsData = (result.events || []).map((e) => ({
            parcelId: parcel.id,
            date: e.date ? new Date(e.date) : new Date(),
            location: e.location ?? null,
            description: e.description || '',
            status: e.status ?? mapStatusToEnum(e.stage || ''),
            stage: e.stage ?? null,
          }))

          if (eventsData.length > 0) {
            await tx.parcelEvent.createMany({ data: eventsData })
          }

          await tx.parcelTracking.update({
            where: { id: parcel.id },
            data: {
              status: statusEnum,
              statusRaw: result.statusCode ?? null,
              carrier: parcel.carrier ?? result.carrier ?? null,
              carrierCode: result.carrier ?? result.carrierCode ?? parcel.carrierCode ?? null,
              lastUpdate: result.lastUpdate ? new Date(result.lastUpdate) : null,
              estimatedDelivery: result.estimatedDelivery
                ? new Date(result.estimatedDelivery)
                : null,
              lastEventDescription: result.lastEventDescription ?? null,
              daysSinceOrder: result.daysSinceOrder ?? null,
              daysInTransit: result.daysInTransit ?? null,
            },
          })

          if (statusEnum === ParcelStatus.LIVRE) {
            await tx.vente.updateMany({
              where: { parcelId: parcel.id },
              data: {
                statut: 'A_EXPEDIER',
                spvState: 'ARRIVE_LOGISTICIEN'
              }
            })
          } else if (statusEnum === ParcelStatus.RETOUR) {
            await tx.vente.updateMany({
              where: { parcelId: parcel.id },
              data: {
                spvState: 'RETOUR'
              }
            })
          } else if (statusEnum === ParcelStatus.INCIDENT) {
            await tx.vente.updateMany({
              where: { parcelId: parcel.id },
              data: {
                spvState: 'INCIDENT'
              }
            })
          }
        })

        return { id: parcel.id, success: true }
      })
    )

    const synced = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length
    const failed = results.length - synced

    const details = results.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : { success: false, error: r.reason?.message ?? 'Unknown error' }
    )

    return NextResponse.json({
      success: true,
      data: {
        total: parcels.length,
        synced,
        failed,
        results: details,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
