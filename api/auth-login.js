const bcrypt = require('bcryptjs');
const { getDbClient } = require('./_db');
const { creaSessione } = require('./_auth');
const { getIndirizzoIp, verificaLimite, registraTentativo, azzeraLimite } = require('./_rate_limit');

const MAX_TENTATIVI = 5;
const FINESTRA_SECONDI = 15 * 60; // 15 minuti
const BLOCCO_SECONDI = 15 * 60;   // 15 minuti di blocco dopo troppi tentativi

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ errore: 'Metodo non consentito.' });
    }

    const ip = getIndirizzoIp(req);
    const chiaveLimite = `login:${ip}`;

    const limite = await verificaLimite(chiaveLimite);
    if (!limite.consentito) {
        const minutiRestanti = Math.ceil(limite.secondiRestanti / 60);
        return res.status(429).json({
            errore: `Troppi tentativi di accesso. Riprova tra ${minutiRestanti} minuti.`,
        });
    }

    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ errore: 'Username e password sono obbligatori.' });
    }

    const db = getDbClient();

    // Prepared statement (parametri con ?): protegge da SQL injection
    const risultato = await db.execute({
        sql: 'SELECT id, password_hash FROM admin WHERE username = ?',
        args: [username],
    });

    const admin = risultato.rows[0];

    // Messaggio generico: non riveliamo se è sbagliato lo username o la password
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
        await registraTentativo(chiaveLimite, MAX_TENTATIVI, FINESTRA_SECONDI, BLOCCO_SECONDI);
        return res.status(401).json({ errore: 'Credenziali non valide.' });
    }

    // Login riuscito: azzera il contatore dei tentativi falliti
    await azzeraLimite(chiaveLimite);

    const token = await creaSessione(admin.id);

    res.status(200).json({ successo: true, token });
};
