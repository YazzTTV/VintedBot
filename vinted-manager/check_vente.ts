import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Recherche des ventes récentes...");
  const ventes = await prisma.vente.findMany({
      orderBy: { dateVente: 'desc' },
      take: 5,
      include: {
          article: true,
          expedition: true
      }
  });
  console.dir(ventes, { depth: null });
  
  await prisma.$disconnect();
  await pool.end();
}

run().catch(console.error);
