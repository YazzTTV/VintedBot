import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    const count = await prisma.commandeFournisseur.count();
    const all = await prisma.commandeFournisseur.findMany({
      orderBy: { createdAt: 'desc' }
    });
    console.log('TOTAL COMMANDES COUNT:', count);
    console.log('LATEST COMMANDS:', JSON.stringify(all, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
