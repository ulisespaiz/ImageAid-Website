(() => {
  // ---------- Menu sheet ----------
  const btn = document.querySelector('[data-menu]');
  const sheet = document.querySelector('[data-sheet]');
  if (btn && sheet) {
    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      btn.firstChild.textContent = open ? 'Close ' : 'Menu ';
      sheet.hidden = !open;
      document.body.classList.toggle('locked', open);
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    sheet.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) { set(false); btn.focus(); } });
  }

  // ---------- Rail counter ----------
  const rail = document.querySelector('.rail');
  const hint = document.querySelector('.rail-hint span:last-child');
  if (rail && hint) rail.addEventListener('scroll', () => {
    const i = Math.round(rail.scrollLeft / (rail.firstElementChild.offsetWidth + 12));
    hint.textContent = `${Math.min(i + 1, rail.children.length)} / ${rail.children.length}`;
  }, { passive: true });

  // ---------- Flow field ----------
  // Particles travel through a vessel with a laminar (parabolic) velocity profile,
  // driven by a triphasic pulse: surge, brief backflow, small second surge, rest.
  const cvs = document.querySelector('[data-flow]');
  const tr = document.querySelector('[data-trace]');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const tctx = tr && tr.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const g = (t, mu, s) => Math.exp(-((t - mu) ** 2) / (2 * s * s));
  const pulse = (t) => 1.0 * g(t, .15, .042) - .28 * g(t, .30, .045) + .12 * g(t, .44, .05);
  const PERIOD = 860; // ms, ~70 bpm

  let W = 0, H = 0, dpr = 1, parts = [], cyBase = 0, R0 = 0, mobile = true;
  const center = (x) => cyBase + Math.sin((x / W) * Math.PI * 1.8 + 0.6) * H * (mobile ? 0.03 : 0.05);
  const radius = (x) => R0 * (1 - 0.34 * g(x / W, 0.72, 0.06)); // a gentle narrowing downstream

  const resize = () => {
    const r = cvs.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(2, devicePixelRatio || 1);
    cvs.width = W * dpr; cvs.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mobile = W < 760;
    cyBase = H * (mobile ? 0.53 : 0.64);
    R0 = H * (mobile ? 0.12 : 0.15);
    const n = Math.max(320, Math.min(1400, Math.round((W * H) / 800)));
    parts = Array.from({ length: n }, () => ({ x: Math.random() * W, u: Math.random() * 2 - 1, red: Math.random() < 0.14, s: 0.7 + Math.random() * 0.6 }));
  };

  const frame = (now) => {
    const ph = (now % PERIOD) / PERIOD;
    const p = pulse(ph) + 0.035;
    const vmax = (mobile ? 14 : 20);
    // fade the previous frame instead of clearing it, so particles leave flow trails
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = reduce ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,.16)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    // vessel walls
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(16,16,16,.22)';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) { const y = center(x) + sgn * radius(x); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }

    // particles as streaks; length follows velocity, so backflow streaks flip direction
    ctx.lineCap = 'round';
    for (const red of [false, true]) {
      ctx.strokeStyle = red ? 'rgba(255,61,46,.95)' : 'rgba(42,60,255,.7)';
      ctx.lineWidth = red ? 1.8 : 1.4;
      ctx.beginPath();
      for (const q of parts) {
        if (q.red !== red) continue;
        const R = radius(q.x);
        const v = vmax * q.s * (1 - q.u * q.u) * p * (R0 / R) ** 2;
        if (!reduce) q.x += v;
        if (q.x > W + 20) { q.x = -20; q.u = Math.random() * 2 - 1; }
        if (q.x < -20) q.x = W + 20;
        const y = center(q.x) + q.u * R * 0.94;
        const len = Math.max(1.2, Math.abs(v) * 1.4) * Math.sign(v || 1);
        ctx.moveTo(q.x - len, y);
        ctx.lineTo(q.x, y);
      }
      ctx.stroke();
    }

    // mini velocity trace
    if (tctx) {
      const w = tr.width, h = tr.height, base = h * 0.7;
      tctx.clearRect(0, 0, w, h);
      tctx.strokeStyle = 'rgba(16,16,16,.25)'; tctx.setLineDash([3, 4]); tctx.lineWidth = 1;
      tctx.beginPath(); tctx.moveTo(0, base); tctx.lineTo(w, base); tctx.stroke(); tctx.setLineDash([]);
      tctx.strokeStyle = '#ff3d2e'; tctx.lineWidth = 3; tctx.lineJoin = 'round';
      tctx.beginPath();
      for (let i = 0; i <= w; i += 2) {
        const t = ((ph - (w - i) / w * 2) % 1 + 1) % 1; // two beats visible, newest at right
        const y = base - pulse(t) * h * 0.6;
        i ? tctx.lineTo(i, y) : tctx.moveTo(i, y);
      }
      tctx.stroke();
    }
  };

  let raf = 0, visible = true;
  const loop = (now) => { frame(now); raf = requestAnimationFrame(loop); };
  const start = () => { if (!raf && visible && !document.hidden && !reduce) raf = requestAnimationFrame(loop); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  resize();
  frame(PERIOD * 0.15);
  if (!reduce) { for (let i = 0; i < 24; i++) frame(PERIOD * (0.08 + i * 0.006)); }
  addEventListener('resize', () => { resize(); frame(performance.now()); });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(cvs);
  }
  start();
})();
