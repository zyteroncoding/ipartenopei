// Connessione condivisa al database Turso (libSQL), usata da tutte le
// funzioni serverless in /api. Le credenziali arrivano dalle variabili
// d'ambiente configurate su Vercel (Settings → Environment Variables).

const { createClient } = require('@libsql/client');

let client;

// Riutilizza la stessa connessione tra le chiamate quando possibile
// (le funzioni serverless a volte restano "calde" tra una richiesta e l'altra)
function getDbClient() {
    if (!client) {
        client = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
    }
    return client;
}

module.exports = { getDbClient };
