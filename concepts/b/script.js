(() => {
  // Menu drawer
  const btn = document.querySelector('[data-menu]');
  const drawer = document.querySelector('[data-drawer]');
  if (btn && drawer) {
    const set = (open) => { btn.setAttribute('aria-expanded', String(open)); drawer.hidden = !open; document.body.classList.toggle('locked', open); };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    drawer.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) { set(false); btn.focus(); } });
  }

  // Morphing scope: m = 0 triphasic, 1 biphasic, 2 monophasic (blended in between)
  const root = document.querySelector('[data-scrub]');
  if (!root) return;
  const trace = root.querySelector('[data-trace]');
  const rev = root.querySelector('[data-rev]');
  const ro = { name: root.querySelector('[data-ro-name]'), ph: root.querySelector('[data-ro-ph]'), rev: root.querySelector('[data-ro-rev]'), up: root.querySelector('[data-ro-up]') };
  const g = (t, mu, s) => Math.exp(-((t - mu) ** 2) / (2 * s * s));
  const erf = (x) => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)); };
  const shapes = [
    (t) => 1.0 * g(t, .15, .042) - .28 * g(t, .30, .045) + .12 * g(t, .44, .05),
    (t) => .78 * g(t, .16, .05) - .15 * g(t, .32, .05),
    (t) => .30 * g(t, .16, .11) * (1 + erf(2.2 * (t - .16) / (.11 * Math.SQRT2))),
  ];
  const BASE = 150, AMP = 120, W = 200, N = 90;
  const f = (m, t) => { const i = Math.min(1, Math.floor(m)); const k = m - i; return shapes[i](t) * (1 - k) + shapes[i + 1](t) * k; };
  const draw = (m) => {
    let d = '', r = '';
    for (let c = 0; c < 2; c++) {
      let seg = [];
      for (let j = 0; j <= N; j++) {
        const t = j / N, x = (c + t) * W, y = BASE - AMP * f(m, t);
        d += (c === 0 && j === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
        if (y > BASE + 0.5) seg.push([x, y]); else if (seg.length) { r += 'M' + seg[0][0].toFixed(1) + ' ' + BASE + seg.map(([a, b]) => 'L' + a.toFixed(1) + ' ' + b.toFixed(1)).join('') + 'L' + seg[seg.length - 1][0].toFixed(1) + ' ' + BASE + 'Z'; seg = []; }
      }
    }
    trace.setAttribute('d', d);
    rev.setAttribute('d', r);
  };
  const labels = [
    { name: 'Triphasic', ph: '3', rev: 'Yes', up: 'Sharp' },
    { name: 'Biphasic', ph: '2', rev: 'Yes', up: 'Sharp' },
    { name: 'Monophasic', ph: '1', rev: 'No', up: 'Slow' },
  ];
  let cur = 0, target = 0, raf = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = () => {
    cur += (target - cur) * 0.12;
    if (Math.abs(target - cur) < 0.002) cur = target;
    draw(cur);
    raf = cur === target ? 0 : requestAnimationFrame(tick);
  };
  const go = (m) => {
    target = m;
    Object.entries(labels[m]).forEach(([k, v]) => { ro[k].textContent = v; });
    if (reduce) { cur = m; draw(m); return; }
    if (!raf) raf = requestAnimationFrame(tick);
  };
  draw(0);
  const steps = [...root.querySelectorAll('.step')];
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    steps.forEach((s) => s.classList.toggle('on', s === e.target));
    go(+e.target.dataset.m);
  }), { rootMargin: '-55% 0px -35% 0px' });
  steps.forEach((s) => io.observe(s));
})();
