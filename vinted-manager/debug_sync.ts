import prisma from './src/lib/prisma'

async function check() {
    const ventes = await prisma.vente.findMany({
        where: {
            statut: { in: ['COMMANDE_A_FAIRE', 'EN_ATTENTE', 'A_EXPEDIER'] }
        },
        select: { id: true, statut: true, spvState: true, article: { select: { nom: true, lienProduit: true } }, pseudoAcheteur: true }
    })
    console.log("Ventes en attente ou A_EXPEDIER:")
    for (const v of ventes) {
        console.log(`ID: ${v.id} | Acheteur: ${v.pseudoAcheteur} | Statut: ${v.statut} | SPV: ${v.spvState} | Nom: ${v.article?.nom} | Lien: ${v.article?.lienProduit}`)
    }

    const sourcingProducts = await prisma.sourcingProduct.findMany({
        select: { title: true, url: true }
    })
    console.log("\nSourcing in DB:")
    for (const s of sourcingProducts) {
        console.log(`Title: ${s.title} | URL: ${s.url}`)
    }
}

check().catch(console.error).finally(() => prisma.$disconnect())
