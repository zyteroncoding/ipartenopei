const bcrypt = require('bcryptjs');
const { getDbClient } = require('./_db');
const { richiedeAutenticazione } = require('./_auth');

// Requisiti minimi della nuova password: almeno 8 caratteri, almeno una
// lettera e almeno un numero. Non è una regola fortissima, ma alza
// concretamente l'asticella rispetto a password banali tipo "123456".
function passwordAbbastanzaRobusta(password) {
    if (typeof password !== 'string' || password.length < 8) return false;
    const haLettera = /[a-zA-Z]/.test(password);
    const haNumero = /[0-9]/.test(password);
    return haLettera && haNumero;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ errore: 'Metodo non consentito.' });
    }

    const adminId = await richiedeAutenticazione(req, res);
    if (!adminId) return; // risposta 401 già inviata

    const { passwordAttuale, passwordNuova } = req.body || {};

    if (!passwordAttuale || !passwordNuova) {
        return res.status(400).json({ errore: 'Password attuale e nuova password sono obbligatorie.' });
    }

    if (!passwordAbbastanzaRobusta(passwordNuova)) {
        return res.status(400).json({
            errore: 'La nuova password deve avere almeno 8 caratteri, con almeno una lettera e un numero.',
        });
    }

    const db = getDbClient();

    const risultato = await db.execute({
        sql: 'SELECT password_hash FROM admin WHERE id = ?',
        args: [adminId],
    });

    const admin = risultato.rows[0];

    if (!admin || !bcrypt.compareSync(passwordAttuale, admin.password_hash)) {
        return res.status(401).json({ errore: 'La password attuale non è corretta.' });
    }

    const nuovoHash = bcrypt.hashSync(passwordNuova, 10);

    await db.execute({
        sql: 'UPDATE admin SET password_hash = ? WHERE id = ?',
        args: [nuovoHash, adminId],
    });

    res.status(200).json({ successo: true, messaggio: 'Password aggiornata con successo.' });
};
