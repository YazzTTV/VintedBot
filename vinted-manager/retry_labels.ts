import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Remise en PENDING de CHECK_EXTENSION_STATUS en échec...");
  const actions = await prisma.botActionQueue.updateMany({
      where: {
          actionType: 'CHECK_EXTENSION_STATUS',
          status: 'FAILED'
      },
      data: {
          status: 'PENDING'
      }
  });
  console.log(`Succès : ${actions.count} actions CHECK_EXTENSION_STATUS ont été remises en PENDING.`);
  
  await prisma.$disconnect();
  await pool.end();
}

run().catch(console.error);
