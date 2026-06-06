import prisma from './src/lib/prisma'

async function main() {
  try {
    const name = 'lenabalvade'
    const account = await prisma.botAccount.findUnique({
      where: { name }
    })
    
    if (!account) {
      console.log('ACCOUNT NOT FOUND')
      return
    }
    
    console.log('Account:', account.name, account.id)

    const metrics = await prisma.vintedItemMetrics.findMany({
      where: { botAccountId: account.id },
      orderBy: { uploadedAtVinted: 'desc' }
    })
    
    console.log('Metrics length:', metrics.length)
    
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
      }))
      console.log('Mapped length:', data.length)
      console.log('First mapped:', JSON.stringify(data[0], null, 2))
    }
  } catch (err) {
    console.error('ERROR:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
