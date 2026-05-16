import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixData() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    // 1. Find all commands that are NOT RECUE
    const pendingCmds = await prisma.commandeFournisseur.findMany({
      where: { statut: { not: 'RECUE' } },
      select: { id: true }
    });
    
    const ids = pendingCmds.map(c => c.id);
    
    if (ids.length > 0) {
      // 2. Set all their child articles status back to EN_TRANSIT (if they aren't sold)
      const res = await prisma.article.updateMany({
        where: { 
          commandeId: { in: ids },
          statut: { not: 'VENDU' } // Don't break historical sales
        },
        data: { statut: 'EN_TRANSIT' }
      });
      console.log(`Mise à jour réussie : ${res.count} articles réinitialisés en transit.`);
    } else {
      console.log("Aucune commande en attente détectée.");
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

fixData();
