const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderId = '20333423580';
  const order = await prisma.vintedOrderSynced.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  // 1. Create CommandeFournisseur
  let panier = await prisma.commandeFournisseur.findFirst({
    where: { numero: 'URGENCE_INCONNU_DROPSHIPPING' }
  });
  if (!panier) {
    panier = await prisma.commandeFournisseur.create({
      data: {
        userId: '4700b998-a7e6-4c52-ac08-0e9893dba2ef',
        numero: 'URGENCE_INCONNU_DROPSHIPPING',
        fournisseur: 'SHEIN',
        dateCommande: new Date(),
        prixTotal: 0,
        fraisPort: 0,
        nbArticles: 1,
        statut: 'PANIER',
        notes: 'Généré pour dropshipping sans lien'
      }
    });
  }

  // 2. Create Article
  const article = await prisma.article.create({
    data: {
      commandeId: panier.id,
      nom: order.title,
      lienProduit: '',
      prixAchatUnitaire: 0,
      fraisPortUnitaires: 0,
      statut: 'VENDU',
      notes: Article dropshippé d'urgence pour @
    }
  });

  // 3. Create Vente
  const vente = await prisma.vente.create({
    data: {
      articleId: article.id,
      pseudoAcheteur: order.buyerLogin,
      prixVente: order.price,
      fraisVinted: 0.70,
      beneficeNet: Number(order.price) - 0.70,
      margePct: 100, // 100% since cost is 0 for now
      dateVente: order.createdAtVinted,
      statut: 'A_EXPEDIER',
      botAccountId: order.botAccountId,
      purchasePriceSnapshot: 0
    }
  });

  console.log("Created Vente: " + vente.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
