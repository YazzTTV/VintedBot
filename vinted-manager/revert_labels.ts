import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Suppression des actions GENERATE_LABEL en attente...");
  const result = await prisma.botActionQueue.deleteMany({
      where: { 
          actionType: 'GENERATE_LABEL',
          status: 'PENDING'
      }
  });
  
  console.log(`${result.count} actions supprimées.`);

  await prisma.$disconnect();
  await pool.end();
}

run().catch(console.error);
