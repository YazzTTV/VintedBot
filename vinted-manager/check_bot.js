const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.atyvzcnajjnechlecccq:GaetNoah!VintedManager@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    
    const bot = await client.query(`
        SELECT * FROM "BotAccount" WHERE id = '90f19cc6-d2cc-46b8-b465-fd9d5c81f74f';
    `);
    
    console.log("BotAccount:", bot.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
