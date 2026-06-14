const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ventes = await prisma.vente.findMany({
    where: { pseudoAcheteur: { in: ['Acheteur Inconnu', 'Inconnu'] } }
  });

  let count = 0;
  for (const vente of ventes) {
    if (!vente.articleId) continue;
    
    const syncedOrders = await prisma.vintedOrderSynced.findMany({
      where: { articleId: vente.articleId }
    });
    
    if (syncedOrders.length === 0) continue;
    const syncedOrder = syncedOrders[0];

    if (syncedOrder && syncedOrder.buyerLogin && syncedOrder.buyerLogin !== 'Acheteur Inconnu' && syncedOrder.buyerLogin !== 'Inconnu') {
      await prisma.vente.update({
        where: { id: vente.id },
        data: { pseudoAcheteur: syncedOrder.buyerLogin }
      });
      console.log('Updated Vente ' + vente.id + ' with ' + syncedOrder.buyerLogin + ' via syncedOrder direct');
      count++;
      continue;
    }

    if (syncedOrder && syncedOrder.title) {
        let baseTitle = syncedOrder.title.trim();
        if (baseTitle.endsWith('...')) baseTitle = baseTitle.slice(0, -3).trim();
        const baseTitleLower = baseTitle.toLowerCase();
        
        const convs = await prisma.vintedConversation.findMany({
            where: { botAccountId: vente.botAccountId }
        });

        const matched = convs.find(c => {
            if (!c.title) return false;
            const cTitleLower = c.title.toLowerCase();
            return cTitleLower.includes(baseTitleLower) || baseTitleLower.includes(cTitleLower);
        });

        if (matched && matched.buyerUsername) {
            await prisma.vintedOrderSynced.update({
                where: { id: syncedOrder.id },
                data: { buyerLogin: matched.buyerUsername }
            });
            await prisma.vente.update({
                where: { id: vente.id },
                data: { pseudoAcheteur: matched.buyerUsername }
            });
            console.log('Updated Vente ' + vente.id + ' with ' + matched.buyerUsername + ' via Heuristic');
            count++;
        }
    }
  }
  console.log('Fixed ' + count + ' Ventes.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
