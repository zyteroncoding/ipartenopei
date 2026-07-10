// Script da lanciare UNA VOLTA per creare le tabelle su Turso e l'admin di default.
//
// Uso (dalla cartella principale del progetto, con le variabili d'ambiente
// TURSO_DATABASE_URL e TURSO_AUTH_TOKEN impostate):
//
//   npm install
//   npm run init-db

require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

async function main() {
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
        console.error('Mancano TURSO_DATABASE_URL o TURSO_AUTH_TOKEN.');
        console.error('Crea un file .env nella cartella principale con questi due valori (vedi .env.example).');
        process.exit(1);
    }

    const db = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    console.log('Creazione tabelle...');

    await db.execute(`
        CREATE TABLE IF NOT EXISTS categorie (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            ordine INTEGER NOT NULL DEFAULT 0
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS piatti (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            descrizione TEXT,
            prezzo REAL NOT NULL,
            disponibile INTEGER NOT NULL DEFAULT 1,
            ordine INTEGER NOT NULL DEFAULT 0
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS contenuti_sito (
            chiave TEXT PRIMARY KEY,
            valore TEXT NOT NULL,
            descrizione TEXT
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS sessioni (
            token TEXT PRIMARY KEY,
            admin_id INTEGER NOT NULL,
            scadenza INTEGER NOT NULL
        )
    `);

    console.log('Tabelle create.');

    // Contenuti iniziali del mini-CMS (solo se non esistono già)
    const contenutiIniziali = [
        ['home_titolo', 'I Partenopei', 'Titolo principale in home page'],
        ['home_sottotitolo', 'Ristorante e Pizzeria', 'Sottotitolo sotto il nome in home'],
        ['home_intro', 'Autentica tradizione partenopea nel cuore di Isola della Scala.', 'Testo introduttivo breve in home'],
        ['storia_titolo', 'La nostra storia', 'Titolo sezione storia'],
        ['storia_testo', 'Testo da personalizzare con la vera storia del ristorante.', 'Testo della sezione storia/chi siamo'],
        ['contatti_indirizzo', 'Via Vittorio Veneto, 39, 37063 Isola della Scala VR', 'Indirizzo mostrato in pagina contatti'],
        ['contatti_telefono', '045 2244631', 'Numero di telefono mostrato in pagina contatti'],
    ];

    for (const [chiave, valore, descrizione] of contenutiIniziali) {
        await db.execute({
            sql: 'INSERT OR IGNORE INTO contenuti_sito (chiave, valore, descrizione) VALUES (?, ?, ?)',
            args: [chiave, valore, descrizione],
        });
    }

    console.log('Contenuti iniziali del sito inseriti.');

    // Crea l'admin di default solo se non esiste già nessun admin
    const contaAdmin = await db.execute('SELECT COUNT(*) as tot FROM admin');
    const numeroAdmin = Number(contaAdmin.rows[0].tot);

    if (numeroAdmin === 0) {
        const usernameDefault = 'admin';
        const passwordDefault = 'cambiami123';
        const hash = bcrypt.hashSync(passwordDefault, 10);

        await db.execute({
            sql: 'INSERT INTO admin (username, password_hash) VALUES (?, ?)',
            args: [usernameDefault, hash],
        });

        console.log(`Admin creato -> username: ${usernameDefault} | password: ${passwordDefault}`);
        console.log('IMPORTANTE: cambia questa password appena possibile.');
    } else {
        console.log('Admin già esistente, nessuna modifica.');
    }

    console.log('Inizializzazione completata.');
}

main().catch((errore) => {
    console.error('Errore durante l\'inizializzazione:', errore);
    process.exit(1);
});
