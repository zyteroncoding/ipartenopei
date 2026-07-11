// Animazioni allo scroll: reveal degli elementi quando entrano nello
// schermo, e parallax dell'immagine principale dell'hero.

document.addEventListener('DOMContentLoaded', () => {
    attivaRevealAlloScroll();
    attivaParallaxHero();
});

// Osserva tutti gli elementi con l'attributo data-reveal e aggiunge
// la classe "visibile" quando entrano nella viewport, facendo partire
// la transizione CSS (fade + movimento) definita in style.css
function attivaRevealAlloScroll() {
    const elementi = document.querySelectorAll('[data-reveal]');
    if (elementi.length === 0) return;

    // Se il browser non supporta IntersectionObserver, mostra tutto
    // subito senza animazione (nessun elemento resta invisibile)
    if (!('IntersectionObserver' in window)) {
        elementi.forEach((el) => el.classList.add('visibile'));
        return;
    }

    const osservatore = new IntersectionObserver((voci) => {
        voci.forEach((voce) => {
            if (voce.isIntersecting) {
                voce.target.classList.add('visibile');
                osservatore.unobserve(voce.target); // anima una sola volta
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -60px 0px',
    });

    elementi.forEach((el) => osservatore.observe(el));
}

// Effetto parallax: l'immagine dell'hero si muove più lentamente dello
// scroll della pagina, creando un effetto di profondità marcato.
function attivaParallaxHero() {
    const immagine = document.querySelector('.hero-immagine');
    if (!immagine) return;

    // Rispetta la preferenza di sistema "riduci le animazioni"
    const preferisceMenoMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (preferisceMenoMovimento) return;

    let ultimoScroll = -1;
    let ticking = false;

    function aggiornaParallax() {
        const scrollY = window.scrollY;

        if (scrollY !== ultimoScroll) {
            // Velocità del parallax: l'immagine si sposta al 35% della
            // velocità dello scroll della pagina (effetto marcato ma controllato)
            const spostamento = scrollY * 0.35;
            immagine.style.setProperty('--parallax-y', `${spostamento}px`);
            ultimoScroll = scrollY;
        }

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(aggiornaParallax);
            ticking = true;
        }
    }, { passive: true });

    aggiornaParallax();
}
