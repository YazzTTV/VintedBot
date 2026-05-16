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
    await prisma.article.deleteMany({ where: { commande: { numero: 'AUTO_TEST_1' } } });
    await prisma.commandeFournisseur.deleteMany({ where: { numero: 'AUTO_TEST_1' } });
    console.log('CLEANUP DONE: DELETED TEST ORDER');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
