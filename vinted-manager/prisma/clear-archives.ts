import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 Starting database cleanup...");
  
  try {
    // Delete transactions in reverse dependency order
    console.log("Deleting Expeditions...");
    const deletedExpeditions = await prisma.expedition.deleteMany({});
    console.log(`✅ Deleted ${deletedExpeditions.count} expeditions.`);

    console.log("Deleting Ventes...");
    const deletedVentes = await prisma.vente.deleteMany({});
    console.log(`✅ Deleted ${deletedVentes.count} ventes.`);

    console.log("Deleting Articles...");
    const deletedArticles = await prisma.article.deleteMany({});
    console.log(`✅ Deleted ${deletedArticles.count} articles.`);

    console.log("Deleting CommandesFournisseur...");
    const deletedCommandes = await prisma.commandeFournisseur.deleteMany({});
    console.log(`✅ Deleted ${deletedCommandes.count} commandes.`);

    console.log("Deleting SourcingProducts...");
    const deletedSourcing = await prisma.sourcingProduct.deleteMany({});
    console.log(`✅ Deleted ${deletedSourcing.count} sourcing products.`);

    console.log("\n🎉 Database transactional data has been fully cleared. (Users were kept intact)");
  } catch (error) {
    console.error("❌ Error cleaning database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
