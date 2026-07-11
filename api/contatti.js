// API del form contatti. Usa Resend (https://resend.com) per l'invio email,
// perché su ambienti serverless come Vercel non è disponibile un server SMTP
// locale (a differenza di un hosting tradizionale). Resend ha un piano
// gratuito più che sufficiente per un form contatti di un ristorante.
//
// Serve una API key gratuita: registrati su resend.com, verifica un dominio
// (o usa il dominio di test che offrono per iniziare), crea una API key e
// impostala su Vercel come variabile d'ambiente RESEND_API_KEY.

const { getIndirizzoIp, verificaLimite, registraTentativo } = require('./_rate_limit');

const MAX_INVII = 5;
const FINESTRA_SECONDI = 60 * 60; // 1 ora
const BLOCCO_SECONDI = 60 * 60;   // blocco di 1 ora dopo troppi invii

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ errore: 'Metodo non consentito.' });
    }

    const ip = getIndirizzoIp(req);
    const chiaveLimite = `contatti:${ip}`;

    const limite = await verificaLimite(chiaveLimite);
    if (!limite.consentito) {
        return res.status(429).json({
            errore: 'Hai inviato troppi messaggi in poco tempo. Riprova più tardi o chiamaci direttamente.',
        });
    }

    // Contiamo questo invio indipendentemente dall'esito, per evitare che
    // qualcuno aggiri il limite mandando richieste apposta non valide
    await registraTentativo(chiaveLimite, MAX_INVII, FINESTRA_SECONDI, BLOCCO_SECONDI);

    const { nome, email, messaggio } = req.body || {};

    if (!nome || !email || !messaggio) {
        return res.status(400).json({ errore: 'Tutti i campi sono obbligatori.' });
    }

    if (nome.length > 100 || email.length > 100 || messaggio.length > 3000) {
        return res.status(400).json({ errore: 'Uno o più campi superano la lunghezza massima consentita.' });
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
        return res.status(400).json({ errore: 'Indirizzo email non valido.' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const emailRistorante = process.env.EMAIL_RISTORANTE;

    if (!apiKey || !emailRistorante) {
        console.error('RESEND_API_KEY o EMAIL_RISTORANTE non configurate su Vercel.');
        return res.status(500).json({ errore: 'Invio email non configurato. Contatta il ristorante telefonicamente.' });
    }

    try {
        const rispostaResend = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // Finché non verifichi un dominio tuo su Resend, questo
                // indirizzo "from" di test è l'unico che funziona.
                // Dopo la verifica del dominio, sostituiscilo con
                // qualcosa come "sito@ipartenopei.it"
                from: 'I Partenopei <onboarding@resend.dev>',
                to: emailRistorante,
                reply_to: email,
                subject: `Nuovo messaggio dal sito - da ${nome}`,
                text: `Nome: ${nome}\nEmail: ${email}\n\nMessaggio:\n${messaggio}`,
            }),
        });

        if (!rispostaResend.ok) {
            const erroreDettaglio = await rispostaResend.text();
            console.error('Errore Resend:', erroreDettaglio);
            return res.status(500).json({ errore: 'Invio email non riuscito. Riprova più tardi.' });
        }

        return res.status(200).json({ successo: true, messaggio: 'Messaggio inviato con successo.' });

    } catch (errore) {
        console.error('Errore invio email:', errore);
        return res.status(500).json({ errore: 'Invio email non riuscito. Riprova più tardi.' });
    }
};
