import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Actions récentes dans la file d'attente:");
  const actions = await prisma.botActionQueue.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, actionType: true, status: true, payload: true, createdAt: true, errorMessage: true }
  });
  console.dir(actions, { depth: null });
  
  await prisma.$disconnect();
  await pool.end();
}

run().catch(console.error);
