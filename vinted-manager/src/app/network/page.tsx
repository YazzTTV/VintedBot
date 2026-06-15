import dynamic from 'next/dynamic';
import prisma from '@/lib/prisma';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Network Graph | Vinted Manager',
  description: 'Visualisation en réseau de Vinted Manager',
};

import NetworkGraphDynamic from '@/components/network/NetworkGraphDynamic';
import GlobalDashboard from '@/components/network/GlobalDashboard';

export default async function NetworkPage() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const dbBots = await prisma.botAccount.findMany({
    select: {
      id: true,
      name: true,
      vintedUsername: true,
      balanceAvailable: true,
      balancePending: true,
      lastSync: true,
      metrics: {
        select: {
          id: true,
          title: true,
        }
      },
      conversations: {
        select: {
          id: true,
          buyerUsername: true,
          hasOffer: true,
          itemId: true,
          title: true,
        }
      },
      orders: {
        where: {
          createdAtVinted: {
            gte: startOfDay,
          }
        },
        select: {
          id: true,
          price: true,
          buyerLogin: true,
        }
      }
    },
  });

  const bots = await Promise.all(
    dbBots.map(async (bot) => {
      const logs = await prisma.extensionLog.findMany({
        where: { botName: bot.name },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      const caDuJour = bot.orders.reduce((sum, order) => sum + Number(order.price), 0);

      const articlesMap = new Map();
      bot.metrics.forEach(m => {
        articlesMap.set(m.id, { id: m.id, title: m.title });
      });
      
      const conversationsMap = new Map();
      bot.conversations.forEach(conv => {
        let articleId = conv.itemId || `unknown-article-${bot.id}`;

        if (!conversationsMap.has(conv.id)) {
          conversationsMap.set(conv.id, {
            id: `conv-${bot.id}-${conv.id}`,
            username: conv.buyerUsername,
            hasOffer: conv.hasOffer,
            itemId: articleId,
            hasBought: bot.orders.some(o => o.buyerLogin === conv.buyerUsername),
            conversation: conv // Store the conversation data for the SidePanel
          });
        }

        // If the article isn't tracked in metrics, create a fallback node for it
        if (!articlesMap.has(articleId)) {
          articlesMap.set(articleId, { 
            id: articleId, 
            title: articleId.startsWith('unknown-article') ? "Article inconnu / Autre" : `Article supprimé/vendu` 
          });
        }
      });

      const articles = Array.from(articlesMap.values());
      const conversationsList = Array.from(conversationsMap.values());

      return { 
        id: bot.id,
        name: bot.name,
        vintedUsername: bot.vintedUsername,
        balanceAvailable: bot.balanceAvailable ? Number(bot.balanceAvailable) : undefined,
        balancePending: bot.balancePending ? Number(bot.balancePending) : undefined,
        lastSync: bot.lastSync ? bot.lastSync.toISOString() : null,
        caDuJour,
        articles,
        conversations: conversationsList,
        logs: logs.map(l => ({
          id: l.id,
          level: l.type || 'INFO',
          message: l.message,
          createdAt: l.createdAt.toISOString()
        }))
      };
    })
  );

  return (
    <div className="flex h-screen w-full flex-col bg-[#09090b] overflow-hidden relative">
      <div className="absolute top-0 left-0 z-10 p-6 pointer-events-none">
        <h1 className="text-2xl font-semibold text-gray-200 tracking-tight">Network</h1>
        <p className="text-gray-500 text-sm mt-1">Bot Infrastructure Map</p>
      </div>
      
      <GlobalDashboard bots={bots} />
      
      <div className="flex-1 w-full relative">
        <NetworkGraphDynamic bots={bots} />
      </div>
    </div>
  );
}
