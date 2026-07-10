const { getDbClient } = require('./_db');
const { richiedeAutenticazione } = require('./_auth');

module.exports = async (req, res) => {
    const db = getDbClient();

    switch (req.method) {

        // GET: chiunque può leggere il menù, nessuna autenticazione richiesta
        case 'GET': {
            const risultato = await db.execute(`
                SELECT c.id AS categoria_id, c.nome AS categoria_nome, c.ordine AS categoria_ordine,
                       p.id AS piatto_id, p.nome AS piatto_nome, p.descrizione, p.prezzo,
                       p.disponibile, p.ordine AS piatto_ordine
                FROM categorie c
                LEFT JOIN piatti p ON p.categoria_id = c.id
                ORDER BY c.ordine ASC, p.ordine ASC
            `);

            // Raggruppiamo i piatti per categoria, così il frontend riceve
            // già una struttura pronta da mostrare
            const menuPerId = {};

            for (const riga of risultato.rows) {
                const catId = riga.categoria_id;

                if (!menuPerId[catId]) {
                    menuPerId[catId] = {
                        id: catId,
                        nome: riga.categoria_nome,
                        piatti: [],
                    };
                }

                if (riga.piatto_id !== null) {
                    menuPerId[catId].piatti.push({
                        id: riga.piatto_id,
                        nome: riga.piatto_nome,
                        descrizione: riga.descrizione,
                        prezzo: Number(riga.prezzo),
                        disponibile: !!riga.disponibile,
                    });
                }
            }

            return res.status(200).json({ menu: Object.values(menuPerId) });
        }

        // POST: crea un nuovo piatto (richiede login admin)
        case 'POST': {
            const adminId = await richiedeAutenticazione(req, res);
            if (!adminId) return; // la risposta 401 è già stata inviata

            const { categoria_id, nome, descrizione, prezzo } = req.body || {};

            if (!categoria_id || !nome || prezzo === undefined || prezzo === null) {
                return res.status(400).json({ errore: 'Categoria, nome e prezzo sono obbligatori.' });
            }

            const risultato = await db.execute({
                sql: 'INSERT INTO piatti (categoria_id, nome, descrizione, prezzo) VALUES (?, ?, ?, ?)',
                args: [categoria_id, nome, descrizione || '', prezzo],
            });

            return res.status(201).json({ successo: true, id: Number(risultato.lastInsertRowid) });
        }

        // PUT: modifica un piatto esistente (richiede login admin)
        case 'PUT': {
            const adminId = await richiedeAutenticazione(req, res);
            if (!adminId) return;

            const { id, nome, descrizione, prezzo, categoria_id, disponibile } = req.body || {};

            if (!id) {
                return res.status(400).json({ errore: 'ID piatto mancante.' });
            }

            const campi = [];
            const valori = [];

            if (nome !== undefined) { campi.push('nome = ?'); valori.push(nome); }
            if (descrizione !== undefined) { campi.push('descrizione = ?'); valori.push(descrizione); }
            if (prezzo !== undefined) { campi.push('prezzo = ?'); valori.push(prezzo); }
            if (categoria_id !== undefined) { campi.push('categoria_id = ?'); valori.push(categoria_id); }
            if (disponibile !== undefined) { campi.push('disponibile = ?'); valori.push(disponibile ? 1 : 0); }

            if (campi.length === 0) {
                return res.status(400).json({ errore: 'Nessun campo da aggiornare.' });
            }

            valori.push(id);

            await db.execute({
                sql: `UPDATE piatti SET ${campi.join(', ')} WHERE id = ?`,
                args: valori,
            });

            return res.status(200).json({ successo: true });
        }

        // DELETE: elimina un piatto (richiede login admin)
        case 'DELETE': {
            const adminId = await richiedeAutenticazione(req, res);
            if (!adminId) return;

            const { id } = req.body || {};

            if (!id) {
                return res.status(400).json({ errore: 'ID piatto mancante.' });
            }

            await db.execute({ sql: 'DELETE FROM piatti WHERE id = ?', args: [id] });

            return res.status(200).json({ successo: true });
        }

        default:
            return res.status(405).json({ errore: 'Metodo non consentito.' });
    }
};
