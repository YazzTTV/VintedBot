const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const account = await prisma.botAccount.findUnique({
    where: { name: 'lenabalvade' },
    include: { _count: { select: { metrics: true } } }
  });

  console.log('Account found:', account?.name, 'Metrics count in DB:', account?._count?.metrics);

  if (account) {
    const metrics = await prisma.vintedItemMetrics.findMany({
      where: { botAccountId: account.id },
      orderBy: { uploadedAtVinted: 'desc' },
      select: {
        id: true,
        title: true,
        price: true,
        photoUrl: true,
        viewCount: true,
        favouriteCount: true,
        status: true,
        url: true,
        uploadedAtVinted: true
      }
    });

    console.log('Metrics retrieved by findMany:', metrics.length);
    if (metrics.length > 0) {
      const data = metrics.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price ? Number(item.price) : null,
        photoUrl: item.photoUrl,
        viewCount: item.viewCount,
        favouriteCount: item.favouriteCount,
        status: item.status,
        url: item.url,
        uploadedAtVinted: item.uploadedAtVinted
      }));
      console.log('First mapped item:', data[0]);
    }
  }
}

main()
  .catch(e => {
    console.error('ERROR OCCURRED:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
