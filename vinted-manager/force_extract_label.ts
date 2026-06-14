import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Recherche des ventes sans bordereau...");
  const ventes = await prisma.vente.findMany({
      where: { 
          statut: { in: ['EN_ATTENTE', 'A_EXPEDIER'] },
          expedition: {
              is: null // Soit il n'y a pas d'expédition du tout
          }
      },
      orderBy: { dateVente: 'desc' }
  });
  
  // Aussi, chercher celles où il y a une expédition mais pas de bordereauUrl
  const ventesExped = await prisma.vente.findMany({
      where: { 
          statut: { in: ['EN_ATTENTE', 'A_EXPEDIER'] },
          expedition: {
              bordereauUrl: null
          }
      },
      orderBy: { dateVente: 'desc' }
  });

  // Fusion des deux listes
  const allVentesToProcess = [...ventes, ...ventesExped].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  
  console.log(`${allVentesToProcess.length} ventes trouvées à extraire.`);

  for (const vente of allVentesToProcess) {
      if (!vente.botAccountId) {
          console.log(`Vente ${vente.id} n'a pas de botAccountId. Ignorée.`);
          continue;
      }
      
      const acheteur = vente.pseudoAcheteur;
      console.log(`Traitement Acheteur: ${acheteur} (Vente: ${vente.id})`);
      
      const convs = await prisma.vintedConversation.findMany({
          where: { buyerUsername: acheteur },
          orderBy: { lastMessageTime: 'desc' }
      });
      
      if (convs.length > 0) {
          const conversationId = convs[0].id; // id de la conversation
          console.log(` -> On utilise le conversationId: ${conversationId}`);
          
          await prisma.botActionQueue.create({
              data: {
                  botAccountId: vente.botAccountId,
                  actionType: 'GENERATE_LABEL',
                  status: 'PENDING',
                  payload: {
                      venteId: vente.id,
                      vintedTransactionId: conversationId 
                  }
              }
          });
          console.log(" -> Action GENERATE_LABEL mise en attente !");
      } else {
          console.log(` -> Aucune conversation trouvée pour ${acheteur}. Impossible d'extraire.`);
      }
  }

  await prisma.$disconnect();
  await pool.end();
}

run().catch(console.error);
