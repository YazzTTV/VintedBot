import prisma from './src/lib/prisma'

async function main() {
    console.log("Recherche des commandes urgentes avec potentiellement un mauvais lien (4 et 5 juin)...")
    
    // Commandes générées automatiquement
    const urgences = await prisma.commandeFournisseur.findMany({
        where: {
            numero: { startsWith: 'URGENCE_' },
            dateCommande: { gte: new Date('2026-06-03') } // On prend un peu de marge
        },
        include: { articles: true }
    });
    
    console.log(`Trouvé ${urgences.length} commandes d'urgence récentes.`);

    let fixedCount = 0;

    for (const cmd of urgences) {
        if (cmd.articles.length > 0) {
            const article = cmd.articles[0];
            const vente = await prisma.vente.findUnique({
                where: { articleId: article.id }
            });
            
            console.log(`- Cmd ${cmd.numero}: Article ${article.nom} (Vente: ${!!vente})`);
            
            if (vente) {
                const syncedOrder = await prisma.vintedOrderSynced.findFirst({
                    where: { articleId: article.id }
                });

                console.log(`  SyncedOrder: ${!!syncedOrder}, itemId: ${syncedOrder?.itemId}`);

                if (syncedOrder && syncedOrder.itemId) {
                    const metrics = await prisma.vintedItemMetrics.findUnique({
                        where: { id: syncedOrder.itemId }
                    });
                    
                    console.log(`  Metrics: ${!!metrics}, SourcingUrl: ${metrics?.sourcingUrl}`);
                    
                    if (metrics && metrics.sourcingUrl && metrics.sourcingUrl !== cmd.lienProduit) {
                        console.log(`  >> Correction requise !`);
                        await prisma.commandeFournisseur.update({
                            where: { id: cmd.id },
                            data: { lienProduit: metrics.sourcingUrl }
                        });
                        await prisma.article.update({
                            where: { id: article.id },
                            data: { nom: metrics.title || syncedOrder.title }
                        });
                        fixedCount++;
                    }
                }
            }
        }
    }
    
    console.log(`Terminé ! ${fixedCount} commandes corrigées.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
