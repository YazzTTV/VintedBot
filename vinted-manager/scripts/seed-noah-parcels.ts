/**
 * Seed des 9 colis du tracker autonome dans la DB Supabase.
 *
 * Usage : npx tsx scripts/seed-noah-parcels.ts
 *
 * Source : /Users/noah/Documents/Claude_Cowork/02 Projects/Tracker Colis Dropshipping/backend/data/parcels.json
 *
 * Note : ces colis sont des colis RECUS (Shein/Temu -> Noah), pas des ventes Vinted.
 * Ils sont seedes sans commandeId ni venteIds : Noah pourra les lier ensuite manuellement.
 */

import 'dotenv/config'
import prisma from '../src/lib/prisma'
import { trackingService, mapStatusToEnum } from '../src/lib/tracking/tracking-service'
import { ParcelStatus } from '@prisma/client'

const NOAH_PARCELS = [
  { trackingNumber: '6A06223867888', carrier: 'Colissimo' },
  { trackingNumber: '6A06223477490', carrier: 'Colissimo' },
  { trackingNumber: 'GFFR26133053055614', carrier: 'GOFO France' },
  { trackingNumber: 'GFFR26132044721477', carrier: 'GOFO France' },
  { trackingNumber: '6M22400454030', carrier: 'Colissimo' },
  { trackingNumber: '6M22400451909', carrier: 'Colissimo' },
  { trackingNumber: 'GFFR26131012654127', carrier: 'GOFO France' },
  { trackingNumber: 'S5780294399934880', carrier: 'Cainiao' },
  { trackingNumber: '6A06195779479', carrier: 'Colissimo' },
]

async function main() {
  console.log(`\nSeed ${NOAH_PARCELS.length} colis...\n`)

  let created = 0
  let skipped = 0
  let synced = 0

  for (const p of NOAH_PARCELS) {
    // Skip si existe deja
    const existing = await prisma.parcelTracking.findFirst({
      where: { trackingNumber: p.trackingNumber },
    })
    if (existing) {
      console.log(`SKIP  ${p.trackingNumber.padEnd(22)} (existe deja)`)
      skipped++
      continue
    }

    // Cree le parcel
    const parcel = await prisma.parcelTracking.create({
      data: { trackingNumber: p.trackingNumber, carrier: p.carrier },
    })
    console.log(`OK    ${p.trackingNumber.padEnd(22)} cree`)
    created++

    // Sync immediat depuis 17TRACK
    try {
      const result = await trackingService.track(p.trackingNumber, p.carrier.toLowerCase())
      if (result.success) {
        const statusEnum: ParcelStatus = result.statusEnum ?? ParcelStatus.INCONNU
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
          if (eventsData.length > 0) await tx.parcelEvent.createMany({ data: eventsData })
          await tx.parcelTracking.update({
            where: { id: parcel.id },
            data: {
              status: statusEnum,
              statusRaw: result.statusCode ?? null,
              carrier: p.carrier,
              carrierCode: result.carrier ?? null,
              lastUpdate: result.lastUpdate ? new Date(result.lastUpdate) : null,
              estimatedDelivery: result.estimatedDelivery ? new Date(result.estimatedDelivery) : null,
              lastEventDescription: result.lastEventDescription ?? null,
              daysSinceOrder: result.daysSinceOrder ?? null,
              daysInTransit: result.daysInTransit ?? null,
            },
          })
        })
        console.log(`      -> sync OK : ${statusEnum}`)
        synced++
      } else {
        console.log(`      -> sync KO : ${String(result.error).slice(0, 80)}`)
      }
    } catch (e) {
      console.log(`      -> sync erreur : ${(e as Error).message}`)
    }
  }

  console.log(`\nResultat : ${created} crees, ${skipped} skipped, ${synced} sync OK`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
