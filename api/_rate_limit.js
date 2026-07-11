// Rate limiting condiviso, salvato su Turso (non in memoria) perché le
// funzioni serverless non condividono memoria in modo affidabile tra una
// richiesta e l'altra: ogni "istanza" potrebbe essere nuova.
//
// Il file inizia con "_" quindi non diventa un endpoint pubblico.

const { getDbClient } = require('./_db');

async function ensureRateLimitTable() {
    const db = getDbClient();
    await db.execute(`
        CREATE TABLE IF NOT EXISTS limite_richieste (
            chiave TEXT PRIMARY KEY,
            tentativi INTEGER NOT NULL DEFAULT 0,
            primo_tentativo INTEGER NOT NULL,
            bloccato_fino INTEGER
        )
    `);
}

// Estrae l'indirizzo IP del chiamante (Vercel lo passa in questo header)
function getIndirizzoIp(req) {
    const forwardedFor = req.headers['x-forwarded-for'] || '';
    return forwardedFor.split(',')[0].trim() || 'sconosciuto';
}

// Controlla se una determinata "chiave" (es. "login:1.2.3.4") ha superato
// il limite di tentativi consentiti. NON incrementa il contatore da sola:
// va chiamata prima di elaborare la richiesta.
//
// Ritorna { consentito: true } oppure { consentito: false, secondiRestanti }
async function verificaLimite(chiave) {
    await ensureRateLimitTable();
    const db = getDbClient();

    const risultato = await db.execute({
        sql: 'SELECT tentativi, primo_tentativo, bloccato_fino FROM limite_richieste WHERE chiave = ?',
        args: [chiave],
    });

    const record = risultato.rows[0];
    const ora = Math.floor(Date.now() / 1000);

    if (record && record.bloccato_fino && record.bloccato_fino > ora) {
        return { consentito: false, secondiRestanti: record.bloccato_fino - ora };
    }

    return { consentito: true };
}

// Registra un tentativo (fallito o comunque da conteggiare) per la chiave
// indicata. Se supera maxTentativi entro finestraSecondi, blocca per
// bloccoSecondi.
async function registraTentativo(chiave, maxTentativi, finestraSecondi, bloccoSecondi) {
    await ensureRateLimitTable();
    const db = getDbClient();

    const ora = Math.floor(Date.now() / 1000);

    const risultato = await db.execute({
        sql: 'SELECT tentativi, primo_tentativo FROM limite_richieste WHERE chiave = ?',
        args: [chiave],
    });

    const record = risultato.rows[0];

    // Nessun record precedente, o la finestra di tempo è scaduta: si riparte da 1
    if (!record || (ora - record.primo_tentativo) > finestraSecondi) {
        await db.execute({
            sql: `INSERT INTO limite_richieste (chiave, tentativi, primo_tentativo, bloccato_fino)
                  VALUES (?, 1, ?, NULL)
                  ON CONFLICT(chiave) DO UPDATE SET tentativi = 1, primo_tentativo = ?, bloccato_fino = NULL`,
            args: [chiave, ora, ora],
        });
        return;
    }

    const nuoviTentativi = record.tentativi + 1;
    const bloccatoFino = nuoviTentativi > maxTentativi ? ora + bloccoSecondi : null;

    await db.execute({
        sql: 'UPDATE limite_richieste SET tentativi = ?, bloccato_fino = ? WHERE chiave = ?',
        args: [nuoviTentativi, bloccatoFino, chiave],
    });
}

// Azzera il contatore per una chiave (es. dopo un login riuscito)
async function azzeraLimite(chiave) {
    await ensureRateLimitTable();
    const db = getDbClient();
    await db.execute({ sql: 'DELETE FROM limite_richieste WHERE chiave = ?', args: [chiave] });
}

module.exports = { getIndirizzoIp, verificaLimite, registraTentativo, azzeraLimite };
