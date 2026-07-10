const bcrypt = require('bcryptjs');
const { getDbClient } = require('./_db');
const { creaSessione } = require('./_auth');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ errore: 'Metodo non consentito.' });
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
        return res.status(401).json({ errore: 'Credenziali non valide.' });
    }

    const token = await creaSessione(admin.id);

    res.status(200).json({ successo: true, token });
};
