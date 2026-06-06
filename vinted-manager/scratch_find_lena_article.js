const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findSheinArticle() {
    try {
        const vente = await prisma.vente.findFirst({
            where: {
                article: {
                    botAccount: {
                        name: { contains: 'lena', mode: 'insensitive' }
                    },
                    fournisseurUrl: { contains: 'shein.com' }
                }
            },
            include: {
                article: true
            },
            orderBy: {
                dateVente: 'desc'
            }
        });

        if (vente) {
            console.log("Found Vente:");
            console.log(JSON.stringify(vente, null, 2));
        } else {
            console.log("No vente found. Let's try finding just an article.");
            const article = await prisma.article.findFirst({
                where: {
                    botAccount: {
                        name: { contains: 'lena', mode: 'insensitive' }
                    },
                    fournisseurUrl: { contains: 'shein.com' }
                }
            });
            console.log(JSON.stringify(article, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

findSheinArticle();
