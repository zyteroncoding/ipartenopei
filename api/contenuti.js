const { getDbClient } = require('./_db');
const { richiedeAutenticazione } = require('./_auth');

module.exports = async (req, res) => {
    const db = getDbClient();

    switch (req.method) {

        // GET: pubblico, restituisce tutti i testi come oggetto chiave -> valore
        case 'GET': {
            const risultato = await db.execute('SELECT chiave, valore FROM contenuti_sito');

            const testi = {};
            for (const riga of risultato.rows) {
                testi[riga.chiave] = riga.valore;
            }

            return res.status(200).json({ contenuti: testi });
        }

        // PUT: aggiorna un testo (richiede login admin)
        // Body atteso: { "chiave": "storia_testo", "valore": "Nuovo testo qui" }
        case 'PUT': {
            const adminId = await richiedeAutenticazione(req, res);
            if (!adminId) return;

            const { chiave, valore } = req.body || {};

            if (!chiave) {
                return res.status(400).json({ errore: 'La chiave del contenuto è obbligatoria.' });
            }

            const risultato = await db.execute({
                sql: 'UPDATE contenuti_sito SET valore = ? WHERE chiave = ?',
                args: [valore || '', chiave],
            });

            if (risultato.rowsAffected === 0) {
                return res.status(404).json({ errore: 'Chiave non trovata.' });
            }

            return res.status(200).json({ successo: true });
        }

        default:
            return res.status(405).json({ errore: 'Metodo non consentito.' });
    }
};
