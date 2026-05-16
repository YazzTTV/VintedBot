const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const accounts = await prisma.botAccount.findMany({
      orderBy: { lastSync: 'desc' }
    });
    const conversations = await prisma.vintedConversation.findMany();
    const items = await prisma.vintedItem.findMany();
    
    console.log('\n--- DB AUDIT ---');
    console.log(`Accounts total: ${accounts.length}`);
    accounts.forEach(a => {
      console.log(` - ${a.name} (vintedID: ${a.vintedAccountId}, lastSync: ${a.lastSync})`);
    });
    console.log(`Conversations total: ${conversations.length}`);
    console.log(`Items (metrics) total: ${items.length}`);
    console.log('--- END AUDIT ---\n');
  } catch (e) {
    console.error("Prisma query error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
