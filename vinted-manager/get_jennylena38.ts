process.env.DATABASE_URL = "postgresql://postgres.atyvzcnajjnechlecccq:GaetNoah!VintedManager@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";
import prisma from './src/lib/prisma'

async function main() {
    console.log("Searching for jennylena38...");
    const ventes = await prisma.vente.findMany({
        where: {
            pseudoAcheteur: { contains: "jennylena", mode: "insensitive" }
        },
        include: {
            article: true
        }
    });
    console.log("Found Ventes:", ventes.length);
    for (const v of ventes) {
        console.log("Vente:", v.pseudoAcheteur, "Article ID:", v.articleId, "Lien Produit:", v.article?.lienProduit);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
