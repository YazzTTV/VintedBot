const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({
  connectionString: 'postgresql://postgres.atyvzcnajjnechlecccq:GaetNoah!VintedManager@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    
    // Create an ADD_TO_CART_SHEIN action for the bot to pick up
    // using the Shein search URL which redirects automatically
    const actionQuery = `
      INSERT INTO "BotActionQueue" ("id", "botAccountId", "actionType", "status", "payload")
      VALUES (
        $1,
        (SELECT id FROM "BotAccount" LIMIT 1), 
        'ADD_TO_CART_SHEIN', 
        'PENDING', 
        '{"url": "https://fr.shein.com/pdsearch/sz2305296151462952/", "taille": "S", "venteId": "test_jennylena38"}'
      )
      RETURNING id;
    `;
    
    const res = await client.query(actionQuery, [crypto.randomUUID()]);
    console.log("Action ADD_TO_CART_SHEIN injectée dans la DB avec l'ID:", res.rows[0].id);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
