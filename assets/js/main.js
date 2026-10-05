// ImageAiD site behaviour. Progressive enhancement: pages read fine without JS.
// Hero card beam adapted from Card Beam Animation by BL/S Studio (CodePen, MIT).
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Header state ----------
  const hdr = document.querySelector('[data-hdr]');
  const onScroll = () => hdr.classList.toggle('scrolled', scrollY > 12);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Mobile menu ----------
  const menuBtn = document.querySelector('[data-menu-btn]');
  const sheet = document.querySelector('[data-sheet]');
  if (menuBtn && sheet) {
    const setMenu = (open) => {
      menuBtn.setAttribute('aria-expanded', String(open));
      sheet.hidden = !open;
      document.body.classList.toggle('locked', open);
      if (open) sheet.querySelector('a').focus({ preventScroll: true });
    };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) { setMenu(false); menuBtn.focus(); } });
    matchMedia('(min-width: 1080px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  // ---------- Card Beam (after BL/S Studio) ----------
  // Cards stream left to right. Left of the probe they render as raw Doppler samples;
  // the probe line clips them over into a clean waveform card on the right.
  const stage = document.querySelector('[data-beam]');
  const line = document.querySelector('[data-line]');
  const scanCvs = document.querySelector('[data-scanner]');
  const ambCvs = document.querySelector('[data-ambient]');
  if (stage && line && scanCvs && ambCvs) {
    const base = [...line.children];
    const rawText = (cols, rows, seed) => {
      let s = seed * 9301 + 49297;
      const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
      const bars = '▁▂▃▄▅▆▇█';
      const out = [];
      for (let r = 0; r < rows; r++) {
        const t = (r * 0.004 + rnd() * 0.001).toFixed(3);
        const v = (rnd() * 90 - 18).toFixed(2);
        const f = (rnd() * 4 + 6).toFixed(1);
        let l = `t+${t} v${v >= 0 ? '+' : ''}${v} f${f}k ${bars[Math.floor(rnd() * 8)]}${bars[Math.floor(rnd() * 8)]} 0x${Math.floor(rnd() * 65535).toString(16).padStart(4, '0')} `;
        while (l.length < cols) l += Math.floor(rnd() * 16).toString(16);
        out.push(l.slice(0, cols));
      }
      return out.join('\n');
    };
    const fillRaw = () => {
      [...line.children].forEach((c, i) => {
        const pre = c.querySelector('pre');
        const w = c.offsetWidth, h = c.offsetHeight;
        const cw = w >= 340 ? 6.6 : 5.7, lh = w >= 340 ? 13 : 12;
        pre.textContent = rawText(Math.ceil(w / cw), Math.ceil(h / lh), i + 1);
      });
    };

    let W = 0, setW = 0, x = 0, vel = 0, baseSpeed = 0, items = [];
    const measure = () => {
      W = stage.clientWidth;
      // ensure one set spans the viewport, then duplicate it so the loop is seamless
      while (line.children.length > base.length) line.lastChild.remove();
      let setCount = 1;
      const one = () => base.reduce((a, c) => a + c.offsetWidth, 0) + base.length * parseFloat(getComputedStyle(line).columnGap || 28);
      while (one() * setCount < W) { base.forEach((c) => line.appendChild(c.cloneNode(true))); setCount++; }
      const unit = [...line.children];
      unit.forEach((c) => line.appendChild(c.cloneNode(true)));
      setW = unit.reduce((a, c) => a + c.offsetWidth, 0) + unit.length * parseFloat(getComputedStyle(line).columnGap || 28);
      items = [...line.children].map((el) => ({ el, clean: el.querySelector('.sc-clean'), raw: el.querySelector('.sc-raw'), left: el.offsetLeft, w: el.offsetWidth, state: '' }));
      baseSpeed = W < 760 ? 42 : 64;
      if (!vel) vel = baseSpeed;
      if (x === 0 || x > 0 || x < -setW) x = -setW + W * 0.5 - items[0].w * 0.5;
      fillRaw();
    };

    let scanning = false;
    const clip = () => {
      const sx = W / 2;
      scanning = false;
      for (const it of items) {
        const L = x + it.left, R = L + it.w;
        let st;
        if (R <= sx) st = 'raw'; else if (L >= sx) st = 'clean'; else st = 'mid';
        if (st === 'mid') {
          scanning = true;
          const pct = ((sx - L) / it.w) * 100;
          it.clean.style.setProperty('--clip-right', pct + '%');
          it.raw.style.setProperty('--clip-left', pct + '%');
          if (it.state !== 'mid' && !reduce) {
            const f = document.createElement('div');
            f.className = 'scan-flash';
            it.el.appendChild(f);
            setTimeout(() => f.remove(), 650);
          }
        } else if (st !== it.state) {
          const v = st === 'raw' ? '100%' : '0%';
          it.clean.style.setProperty('--clip-right', v);
          it.raw.style.setProperty('--clip-left', v);
        }
        it.state = st;
      }
    };

    // drag / fling
    let dragging = false, lastX = 0, lastT = 0;
    line.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastT = performance.now(); vel = 0; line.classList.add('dragging'); line.setPointerCapture(e.pointerId); });
    line.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const now = performance.now(), dx = e.clientX - lastX;
      x += dx; vel = (dx / Math.max(1, now - lastT)) * 1000;
      lastX = e.clientX; lastT = now;
    });
    const end = () => { if (!dragging) return; dragging = false; line.classList.remove('dragging'); };
    line.addEventListener('pointerup', end);
    line.addEventListener('pointercancel', end);

    // ---- particle scanner (after BL/S Studio's ParticleScanner, 2D canvas) ----
    const sctx = scanCvs.getContext('2d');
    const actx = ambCvs.getContext('2d');
    let dpr = 1, H = 0, parts = [], amb = [], glow = 1, intensity = 0.8;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 16;
    const sp = sprite.getContext('2d');
    const gr = sp.createRadialGradient(8, 8, 0, 8, 8, 8);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(160,240,228,.85)'); gr.addColorStop(.7, 'rgba(63,208,189,.4)'); gr.addColorStop(1, 'rgba(63,208,189,0)');
    sp.fillStyle = gr; sp.beginPath(); sp.arc(8, 8, 8, 0, Math.PI * 2); sp.fill();
    const sizeCanvases = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      H = stage.clientHeight + 40;
      for (const [c, h] of [[scanCvs, H], [ambCvs, stage.clientHeight]]) {
        c.width = W * dpr; c.height = h * dpr; c.style.width = W + 'px'; c.style.height = h + 'px';
        c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const n = W < 760 ? 90 : 220;
      amb = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * stage.clientHeight, v: Math.random() * 30 + 15, r: Math.random() * 1.4 + .4, a: Math.random() * .6 + .2 }));
    };
    const spawn = () => ({ x: W / 2 + (Math.random() - .5) * 3, y: Math.random() * H, vx: (Math.random() * .8 + .2) * (1 + (intensity - .8)), vy: (Math.random() - .5) * .3, r: (Math.random() * .6 + .4) * (1 + (intensity - .8) * .7), life: 1, decay: Math.random() * .02 + .005, a: Math.random() * .4 + .6, t: 0, tw: Math.random() * .06 + .02 });
    const drawScanner = () => {
      sctx.globalCompositeOperation = 'source-over';
      sctx.clearRect(0, 0, W, H);
      const target = scanning ? 3 : 1;
      glow += (target - glow) * .05;
      intensity += ((scanning ? 1.8 : .8) - intensity) * .05;
      const fade = scanning ? 35 : 60, cx = W / 2;
      sctx.globalCompositeOperation = 'lighter';
      const bar = (half, rgba) => {
        const g = sctx.createLinearGradient(cx - half, 0, cx + half, 0);
        g.addColorStop(0, 'rgba(63,208,189,0)'); g.addColorStop(.5, rgba); g.addColorStop(1, 'rgba(63,208,189,0)');
        sctx.fillStyle = g; sctx.fillRect(cx - half, 0, half * 2, H);
      };
      bar(1.5, `rgba(255,255,255,${Math.min(1, .95 * glow)})`);
      bar(6, `rgba(160,240,228,${Math.min(1, .7 * glow)})`);
      bar(12, `rgba(63,208,189,${Math.min(1, .35 * glow)})`);
      if (scanning) bar(26, 'rgba(63,208,189,.14)');
      const max = Math.floor(scanning ? 1400 : 420);
      if (parts.length < max) { const k = scanning ? 6 : 1; for (let i = 0; i < k; i++) parts.push(spawn()); }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.t++; p.life -= p.decay;
        if (p.life <= 0 || p.x > W) { if (parts.length > max) { parts.splice(i, 1); continue; } Object.assign(p, spawn()); continue; }
        let fa = 1;
        if (p.y < fade) fa = p.y / fade; else if (p.y > H - fade) fa = (H - p.y) / fade;
        sctx.globalAlpha = Math.max(0, Math.min(1, (p.a * p.life + Math.sin(p.t * p.tw) * .2) * fa));
        sctx.drawImage(sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      sctx.globalAlpha = 1;
      // vertical fade, as in the original light bar
      sctx.globalCompositeOperation = 'destination-in';
      const vg = sctx.createLinearGradient(0, 0, 0, H);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(fade / H, 'rgba(0,0,0,1)'); vg.addColorStop(1 - fade / H, 'rgba(0,0,0,1)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
      sctx.fillStyle = vg; sctx.fillRect(0, 0, W, H);
    };
    const drawAmbient = (dt) => {
      const h = stage.clientHeight;
      actx.clearRect(0, 0, W, h);
      actx.globalCompositeOperation = 'lighter';
      for (const p of amb) {
        p.x += p.v * dt; if (p.x > W + 10) { p.x = -10; p.y = Math.random() * h; }
        if (Math.random() < .1) p.a = Math.max(.1, Math.min(.9, p.a + (Math.random() - .5) * .1));
        actx.globalAlpha = p.a * .5;
        actx.drawImage(sprite, p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
      }
      actx.globalAlpha = 1;
    };

    let raf = 0, last = 0, visible = true;
    const frame = (now) => {
      const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      if (!dragging) { vel += (baseSpeed - vel) * .04; x += vel * dt; }
      if (x > 0) x -= setW; if (x < -setW) x += setW;
      line.style.transform = `translate3d(${x}px, -50%, 0)`;
      clip();
      drawScanner();
      drawAmbient(dt);
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && visible && !document.hidden && !reduce) { last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    const layout = () => {
      measure(); sizeCanvases();
      line.style.transform = `translate3d(${x}px, -50%, 0)`;
      clip(); drawScanner(); drawAmbient(0);
    };
    layout();
    let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { x = 0; layout(); }, 120); });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(stage);
    if (document.fonts) document.fonts.ready.then(() => { fillRaw(); });
    start();
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

  // ---------- Contact form ----------
  const form = document.getElementById('contact-form');
  if (form) {
    const status = form.querySelector('.form-status');
    const btn = form.querySelector('button[type="submit"]');
    const show = (msg, ok) => { status.textContent = msg; status.className = 'form-status full ' + (ok ? 'ok' : 'err'); status.hidden = false; };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const label = btn.textContent; btn.textContent = 'Sending…';
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error();
        form.reset(); show('Thanks, we got your message and will be in touch soon.', true);
      } catch { show('Something went wrong. Please email hello@imageaid.us instead.', false); }
      finally { btn.textContent = label; }
    });
  }
})();
