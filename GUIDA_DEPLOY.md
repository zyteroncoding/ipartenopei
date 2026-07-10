# I Partenopei — Guida setup e deploy (Vercel + Turso)

Architettura: **un solo progetto Vercel**, sito pubblico + API nello stesso
posto. Niente più Railway, niente più CORS da configurare, niente più costi fissi.

```
ipartenopei/
├── index.html, menu.html, contatti.html    ← pagine pubbliche
├── css/, js/                                ← stili e script del sito
├── admin/                                    ← pannello di gestione
├── api/                                       ← funzioni Node.js (le "API")
│   ├── _db.js          (connessione Turso, non è un endpoint)
│   ├── _auth.js         (gestione sessioni, non è un endpoint)
│   ├── menu.js           → /api/menu
│   ├── categorie.js       → /api/categorie
│   ├── contenuti.js        → /api/contenuti
│   ├── auth-login.js        → /api/auth-login
│   └── contatti.js           → /api/contatti
├── scripts/init-db.js    ← da eseguire una volta per creare le tabelle
├── package.json
└── .env.example
```

I file dentro `api/` diventano automaticamente endpoint quando li carichi su
Vercel: `api/menu.js` risponde su `tuosito.vercel.app/api/menu`, senza bisogno
di configurazione. I file che iniziano con `_` (underscore) sono ignorati da
questa regola: sono solo moduli di supporto condivisi.

---

## 1. Crea il database Turso

1. Vai su [turso.tech](https://turso.tech) → **Sign Up** → accedi con GitHub
2. Dashboard (**turso.tech/app**) → **Create Database** → nome a piacere (es. `ipartenopei`) → regione più vicina → **Create**
3. Nella pagina del database, copia:
   - L'**URL** di connessione (`libsql://...`)
   - Un **token** (pulsante "Create Token")

Tienili da parte, ti servono subito dopo.

## 2. Crea l'account Resend (per l'invio email dal form contatti)

1. Vai su [resend.com](https://resend.com) → crea un account gratuito
2. **API Keys → Create API Key** → copia la chiave (inizia con `re_`)

Per iniziare puoi usare il mittente di test già configurato nel codice
(`onboarding@resend.dev`), che funziona subito senza verificare nulla. Se in
futuro vuoi un mittente con il tuo dominio (es. `sito@ipartenopei.it`), dovrai
verificare quel dominio nella sezione Domains di Resend.

## 3. Apri il progetto in VS Code e installa le dipendenze

```
cd ipartenopei
npm install
```

Questo scarica `@libsql/client`, `bcryptjs` e `dotenv` nella cartella `node_modules/`.

## 4. Crea il file .env in locale (solo per inizializzare il database)

Copia `.env.example` in un nuovo file chiamato `.env` nella stessa cartella,
e riempilo con i valori ottenuti ai punti 1 e 2:

```
TURSO_DATABASE_URL=libsql://ipartenopei-tuousername.turso.io
TURSO_AUTH_TOKEN=il-token-che-hai-copiato
RESEND_API_KEY=re_xxxxxxxx
EMAIL_RISTORANTE=la-tua-email@esempio.it
```

## 5. Inizializza il database

```
npm run init-db
```

Questo crea tutte le tabelle su Turso e un admin di default. Il terminale ti
stamperà username e password — segnateli, ti servono per accedere al pannello.
**Cambia la password appena possibile.**

## 6. Carica il progetto su GitHub

```
git init
git add .
git commit -m "Primo commit: sito I Partenopei con Vercel + Turso"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/ipartenopei.git
git push -u origin main
```

Il file `.gitignore` esclude automaticamente `.env` e `node_modules/` dal
caricamento — è corretto, non devono mai finire su GitHub.

## 7. Deploy su Vercel

1. [vercel.com](https://vercel.com) → login con GitHub
2. **Add New → Project** → seleziona `ipartenopei` → **Import**
3. Framework Preset: Vercel lo rileva da solo (o scegli "Other", va bene comunque: le funzioni in `api/` funzionano indipendentemente dal preset)
4. **Prima di cliccare Deploy**, apri **Environment Variables** e aggiungi le stesse 4 variabili del file `.env`:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `RESEND_API_KEY`
   - `EMAIL_RISTORANTE`
5. **Deploy**

Al termine avrai un URL tipo `https://ipartenopei.vercel.app` — sito e API
online insieme, stesso dominio, nessuna configurazione aggiuntiva.

---

## Come aggiornare il sito dopo il primo deploy

```
git add .
git commit -m "Descrivi cosa hai cambiato"
git push
```

Vercel rifà il deploy automaticamente ad ogni push.

## Come funziona il pannello admin

`tuosito.vercel.app/admin/login.html` → accedi con le credenziali stampate al
punto 5. Da lì puoi gestire categorie, piatti del menù, e i testi del sito
(storia, indirizzo, ecc.) senza toccare il codice.

## Problemi comuni

**Le funzioni API rispondono 500** → controlla di aver impostato tutte e 4 le
variabili d'ambiente su Vercel (punto 7.4), non solo in locale nel file `.env`.

**Il form contatti non invia email** → verifica che `RESEND_API_KEY` sia
corretta e che il piano gratuito di Resend non abbia limiti giornalieri già
raggiunti (per un form contatti di un ristorante è comunque molto improbabile).

**"npm: command not found"** → serve Node.js: scaricalo da
[nodejs.org](https://nodejs.org) (versione LTS), poi riprova `npm install`.

**Il menù/i testi non si aggiornano dopo una modifica dal pannello admin** →
prova a ricaricare la pagina con `Ctrl+F5` (forza il ricaricamento senza
cache del browser).
