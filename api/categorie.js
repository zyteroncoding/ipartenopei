const { getDbClient } = require('./_db');
const { richiedeAutenticazione } = require('./_auth');

module.exports = async (req, res) => {
    const db = getDbClient();

    switch (req.method) {

        // GET: pubblico, lista tutte le categorie
        case 'GET': {
            const risultato = await db.execute('SELECT id, nome, ordine FROM categorie ORDER BY ordine ASC');
            return res.status(200).json({ categorie: risultato.rows });
        }

        // POST: crea una nuova categoria (richiede login admin)
        case 'POST': {
            const adminId = await richiedeAutenticazione(req, res);
            if (!adminId) return;

            const { nome, ordine } = req.body || {};

            if (!nome) {
                return res.status(400).json({ errore: 'Il nome della categoria è obbligatorio.' });
            }

            const risultato = await db.execute({
                sql: 'INSERT INTO categorie (nome, ordine) VALUES (?, ?)',
                args: [nome, ordine || 0],
            });

            return res.status(201).json({ successo: true, id: Number(risultato.lastInsertRowid) });
        }

        // DELETE: elimina una categoria (e i piatti collegati)
        case 'DELETE': {
            const adminId = await richiedeAutenticazione(req, res);
            if (!adminId) return;

            const { id } = req.body || {};

            if (!id) {
                return res.status(400).json({ errore: 'ID categoria mancante.' });
            }

            // Elimina prima i piatti collegati (Turso non applica sempre
            // le foreign key ON DELETE CASCADE come SQLite nativo)
            await db.execute({ sql: 'DELETE FROM piatti WHERE categoria_id = ?', args: [id] });
            await db.execute({ sql: 'DELETE FROM categorie WHERE id = ?', args: [id] });

            return res.status(200).json({ successo: true });
        }

        default:
            return res.status(405).json({ errore: 'Metodo non consentito.' });
    }
};
