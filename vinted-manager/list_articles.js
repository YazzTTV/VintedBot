const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const articles = await prisma.article.findMany({ take: 5, include: { commande: true } });
  console.log(JSON.stringify(articles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
