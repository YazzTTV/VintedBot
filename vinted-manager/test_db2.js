const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.vintedItemMetrics.findMany({
    where: { botAccount: { name: { contains: 'lena', mode: 'insensitive' } } },
    select: { title: true, status: true, id: true, updatedAt: true }
  });
  console.log("Found items:", items.length);
  items.forEach(i => console.log(`[${i.id}] ${i.title} - Status: ${i.status} - UpdatedAt: ${i.updatedAt}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
