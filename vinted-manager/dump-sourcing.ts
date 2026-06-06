import prisma from './src/lib/prisma'

async function main() {
    const sourcings = await prisma.sourcingProduct.findMany({
        select: { title: true, url: true }
    });
    console.log(JSON.stringify(sourcings, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
