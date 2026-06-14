import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Re-queuing CHECK_EXTENSION_STATUS for DEMANDEE sales...");
  const ventes = await prisma.vente.findMany({
      where: { 
          extensionStatut: 'DEMANDEE',
          botAccountId: { not: null }
      }
  });
  
  for (const v of ventes) {
      if(!v.botAccountId) continue;
      
      const exists = await prisma.botActionQueue.findFirst({
        where: {
          botAccountId: v.botAccountId,
          actionType: 'CHECK_EXTENSION_STATUS',
          status: 'PENDING'
        }
      });
      
      if (!exists) {
        await prisma.botActionQueue.create({
            data: {
                botAccountId: v.botAccountId,
                actionType: 'CHECK_EXTENSION_STATUS',
                status: 'PENDING',
                payload: { venteId: v.id }
            }
        });
        console.log("Requeued action for sale", v.id);
      }
  }

  await prisma.$disconnect();
  await pool.end();
}

run().catch(console.error);
