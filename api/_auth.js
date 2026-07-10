// Funzioni condivise di autenticazione, usate dalle funzioni API protette.
// I file che iniziano con "_" non diventano endpoint pubblici su Vercel:
// sono solo moduli di supporto importati dalle altre funzioni.

const crypto = require('crypto');
const { getDbClient } = require('./_db');

// Crea la tabella sessioni se non esiste ancora
async function ensureSessionsTable() {
    const db = getDbClient();
    await db.execute(`
        CREATE TABLE IF NOT EXISTS sessioni (
            token TEXT PRIMARY KEY,
            admin_id INTEGER NOT NULL,
            scadenza INTEGER NOT NULL
        )
    `);
}

// Genera un nuovo token dopo un login riuscito (valido 2 ore)
async function creaSessione(adminId) {
    await ensureSessionsTable();
    const db = getDbClient();

    const token = crypto.randomBytes(32).toString('hex');
    const scadenza = Math.floor(Date.now() / 1000) + (2 * 60 * 60);

    await db.execute({
        sql: 'INSERT INTO sessioni (token, admin_id, scadenza) VALUES (?, ?, ?)',
        args: [token, adminId, scadenza],
    });

    return token;
}

// Estrae il token dall'header Authorization: Bearer <token>
function getTokenFromRequest(req) {
    const header = req.headers['authorization'] || '';
    const match = header.match(/Bearer\s+(.+)/);
    return match ? match[1] : null;
}

// Controlla che la richiesta abbia un token valido e non scaduto.
// Se non valido, scrive direttamente la risposta 401 e ritorna null;
// il chiamante deve controllare il valore di ritorno e interrompersi.
async function richiedeAutenticazione(req, res) {
    await ensureSessionsTable();
    const db = getDbClient();

    const token = getTokenFromRequest(req);

    if (!token) {
        res.status(401).json({ errore: 'Token mancante, effettua il login.' });
        return null;
    }

    const risultato = await db.execute({
        sql: 'SELECT admin_id, scadenza FROM sessioni WHERE token = ?',
        args: [token],
    });

    const sessione = risultato.rows[0];

    if (!sessione) {
        res.status(401).json({ errore: 'Token non valido, effettua di nuovo il login.' });
        return null;
    }

    const ora = Math.floor(Date.now() / 1000);
    if (sessione.scadenza < ora) {
        await db.execute({ sql: 'DELETE FROM sessioni WHERE token = ?', args: [token] });
        res.status(401).json({ errore: 'Sessione scaduta, effettua di nuovo il login.' });
        return null;
    }

    return sessione.admin_id;
}

module.exports = { creaSessione, richiedeAutenticazione };
