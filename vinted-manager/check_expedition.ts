import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const ventes = await prisma.vente.findMany({
      where: { article: { nom: { contains: 'Gele gestreepte zomerjurk' } } },
      include: { expedition: true }
  });
  
  console.dir(ventes, { depth: null });

  await prisma.$disconnect();
  await pool.end();
}

run().catch(console.error);
