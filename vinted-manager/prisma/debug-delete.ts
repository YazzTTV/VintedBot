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
  console.log("🔍 Lancement du diagnostic de suppression...");
  
  try {
    // 1. Récupérer la dernière vente créée pour servir de cobaye (ou n'importe laquelle)
    const lastVente = await prisma.vente.findFirst({
      orderBy: { dateVente: 'desc' },
      include: { article: true }
    });

    if (!lastVente) {
      console.log("⚠️ Aucune vente trouvée dans la base de données pour le diagnostic.");
      return;
    }

    console.log(`📋 Vente cible identifiée : ID = ${lastVente.id}`);
    console.log(`   Acheteur : ${lastVente.pseudoAcheteur}`);
    console.log(`   Article ID : ${lastVente.articleId}`);

    console.log("\n🚀 Tentative d'exécution de la transaction de suppression...");
    
    await prisma.$transaction(async (tx) => {
      // Étape 0 : Expédition
      console.log("   -> Étape 0 : Tentative deleteMany Expedition...");
      const delExp = await tx.expedition.deleteMany({
        where: { venteId: lastVente.id }
      });
      console.log(`      ✅ Succès. ${delExp.count} expéditions nettoyées.`);

      // Étape 1 : Restauration article
      console.log("   -> Étape 1 : Tentative mise à jour Article en STOCK...");
      const upArt = await tx.article.update({
        where: { id: lastVente.articleId },
        data: { statut: 'STOCK' }
      });
      console.log(`      ✅ Succès. Statut article mis à jour.`);

      // Étape 2 : Suppression Vente
      console.log("   -> Étape 2 : Tentative suppression Vente...");
      const delVente = await tx.vente.delete({
        where: { id: lastVente.id }
      });
      console.log(`      ✅ Succès. Vente supprimée.`);
    });

    console.log("\n🎉 TEST RÉUSSI : La transaction s'est exécutée sans AUCUNE erreur Prisma/SQL !");

  } catch (error: any) {
    console.error("\n❌ ERREUR CRITIQUE DÉTECTÉE DURANT LA TRANSACTION :");
    console.error("Message d'erreur :", error.message);
    console.error("Code :", error.code);
  } finally {
    await prisma.$disconnect();
  }
}

main();
