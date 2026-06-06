const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.vintedItemMetrics.findMany({
    where: { title: { contains: 'oranje', mode: 'insensitive' } },
    select: { id: true, title: true, status: true, updatedAt: true, viewCount: true }
  });
  console.log("Orange dress DB state:");
  console.log(items);
}

main().catch(console.error).finally(() => prisma.$disconnect());
