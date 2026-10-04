// ImageAiD site behavior. Everything here is progressive enhancement:
// the pages are fully readable and the form still submits with JS disabled.
(() => {
  // ---------- Mobile menu ----------
  const menuBtn = document.querySelector('[data-menu-btn]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  if (menuBtn && mobileNav) {
    const setOpen = (open) => {
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menuBtn.querySelector('.icon-open').toggleAttribute('hidden', open);
      menuBtn.querySelector('.icon-close').toggleAttribute('hidden', !open);
      mobileNav.hidden = !open;
      document.body.classList.toggle('menu-open', open);
      if (open) mobileNav.querySelector('a')?.focus();
    };
    menuBtn.addEventListener('click', () => setOpen(menuBtn.getAttribute('aria-expanded') !== 'true'));
    mobileNav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mobileNav.hidden) { setOpen(false); menuBtn.focus(); }
    });
    matchMedia('(min-width: 1040px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  // ---------- Audience tabs (WAI-ARIA tabs pattern) ----------
  document.querySelectorAll('[data-tabs]').forEach((root) => {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (step) { e.preventDefault(); select(tabs[(i + step + tabs.length) % tabs.length], true); }
        if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
  });

  // ---------- Sticky mobile CTA: show after the hero, hide near the form ----------
  const sticky = document.querySelector('[data-sticky-cta]');
  const hero = document.querySelector('.hero');
  const contact = document.getElementById('contact');
  if (sticky && hero && contact && 'IntersectionObserver' in window) {
    let pastHero = false, atContact = false;
    const update = () => sticky.classList.toggle('is-visible', pastHero && !atContact);
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; update(); }).observe(hero);
    new IntersectionObserver(([e]) => { atContact = e.isIntersecting; update(); }, { rootMargin: '0px 0px -20% 0px' }).observe(contact);
  }

  // ---------- Contact form ----------
  const form = document.getElementById('contact-form');
  if (form) {
    const status = form.querySelector('.form-status');
    const button = form.querySelector('button[type="submit"]');
    const show = (msg, ok) => {
      status.textContent = msg;
      status.className = 'form-status ' + (ok ? 'ok' : 'err');
      status.hidden = false;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      button.disabled = true;
      const label = button.textContent;
      button.textContent = 'Sending…';
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');
        form.reset();
        show("Thanks, we got your message and will be in touch soon.", true);
      } catch (err) {
        show('Something went wrong sending your message. Please email hello@imageaid.us instead.', false);
      } finally {
        button.disabled = false;
        button.textContent = label;
      }
    });
  }
})();
