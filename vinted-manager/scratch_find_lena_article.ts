import prisma from './src/lib/prisma';

async function findSheinArticle() {
    try {
        const vente = await prisma.vente.findFirst({
            where: {
                botAccount: {
                    name: { contains: 'lena', mode: 'insensitive' }
                },
                article: {
                    lienProduit: { contains: 'shein.com' }
                }
            },
            include: {
                article: true,
                botAccount: true
            }
        });

        if (vente) {
            console.log("Found Vente:");
            console.log(vente.article.lienProduit);
            console.log("Taille: " + vente.article.taille);
        } else {
            console.log("No vente found for lena with shein URL.");
            const anyArticle = await prisma.article.findFirst({
                where: { lienProduit: { contains: 'shein.com' } }
            });
            console.log("Any article:", anyArticle?.lienProduit);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

findSheinArticle();
