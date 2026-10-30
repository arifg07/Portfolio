/* =========================================================
   FX layer: extra animation and interaction.
   Runs after script.js. Each feature is wrapped, so one failing
   never takes the others (or the page) down with it.
========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const safe = (name, fn) => { try { fn(); } catch (e) { console.warn('[fx] ' + name, e); } };
  const pageStart = performance.now();

  /* 24 fps timecode: HH:MM:SS:FF */
  function timecode(sec) {
    const s = Math.max(0, sec);
    return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(Math.floor(s) % 60) + ':' + pad(Math.floor((s % 1) * 24));
  }

  /* scroll-driven updaters share one rAF-throttled listener */
  const onScrollFns = [];
  let scrollTick = false;
  function runScrollFns() { scrollTick = false; onScrollFns.forEach((fn) => fn()); }
  window.addEventListener('scroll', () => { if (!scrollTick) { scrollTick = true; requestAnimationFrame(runScrollFns); } }, { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(runScrollFns));

  /* one rAF loop drives every "live" demo, and only while it is on screen */
  const loopers = [];
  let rafId = 0;
  function tick(now) {
    rafId = 0;
    let any = false;
    loopers.forEach((L) => { if (L.vis) { any = true; L.update(now - L.start, now); } });
    if (any && !document.hidden) rafId = requestAnimationFrame(tick);
  }
  function kick() { if (!rafId) rafId = requestAnimationFrame(tick); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  const loopIO = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const L = loopers.find((x) => x.el === en.target);
          if (!L) return;
          const was = L.vis;
          L.vis = en.isIntersecting;
          if (L.vis && !was) { L.start = performance.now(); kick(); }
        });
      }, { threshold: 0.2 })
    : null;
  function addLooper(el, update) {
    const L = { el, update, vis: false, start: 0 };
    loopers.push(L);
    if (loopIO) loopIO.observe(el); else { L.vis = true; L.start = performance.now(); kick(); }
    return L;
  }

  /* ---------- Page transition (colour wipe) ---------- */
  safe('wipe', () => {
    const w = document.createElement('div');
    w.className = 'wipe';
    w.setAttribute('aria-hidden', 'true');
    w.innerHTML = '<i></i><i></i>';
    document.body.appendChild(w);
    try { sessionStorage.removeItem('wipe'); } catch (_) { /* ignore */ }
    setTimeout(() => root.classList.remove('wipe-in'), 1500);

    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      let u;
      try { u = new URL(a.href, location.href); } catch (_) { return; }
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
      if (reduced) return;
      e.preventDefault();
      try { sessionStorage.setItem('wipe', '1'); } catch (_) { /* ignore */ }
      w.classList.add('in');
      setTimeout(() => { location.href = u.href; }, 640);
    });
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) { w.classList.remove('in'); try { sessionStorage.removeItem('wipe'); } catch (_) { /* ignore */ } }
    });
  });

  /* ---------- Preloader timecode ---------- */
  safe('preTc', () => {
    const tc = $('#preTc');
    if (!tc) return;
    const t0 = performance.now();
    (function f(now) {
      if (!tc.isConnected) return;
      tc.textContent = timecode((now - t0) / 1000);
      requestAnimationFrame(f);
    })(t0);
  });

  /* ---------- Cursor: viewfinder with labels ---------- */
  safe('cursor', () => {
    if (!finePointer || reduced) return;
    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cur-dot';
    ring.className = 'cur-ring';
    ring.innerHTML = '<span></span>';
    [dot, ring].forEach((n) => { n.setAttribute('aria-hidden', 'true'); document.body.appendChild(n); });
    const label = $('span', ring);
    let mx = -100, my = -100, rx = -100, ry = -100, first = true;

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      mx = e.clientX; my = e.clientY;
      if (first) { first = false; rx = mx; ry = my; root.classList.add('has-cur'); }
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    }, { passive: true });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    })();

    const interactive = 'a, button, input, textarea, select, label, summary, [data-cursor], .chip-btn';
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest ? e.target.closest(interactive) : null;
      const isText = !!(e.target.closest && e.target.closest('input:not([type=range]):not([type=checkbox]), textarea'));
      const lab = e.target.closest ? e.target.closest('[data-cursor]') : null;
      ring.classList.toggle('text', isText);
      ring.classList.toggle('hover', !!t && !isText);
      if (lab && !isText) { label.textContent = lab.dataset.cursor; ring.classList.add('label'); } else { ring.classList.remove('label'); }
    });
    document.addEventListener('pointerdown', () => ring.classList.add('down'));
    document.addEventListener('pointerup', () => ring.classList.remove('down'));
    document.documentElement.addEventListener('mouseleave', () => { dot.style.opacity = 0; ring.style.opacity = 0; });
    document.documentElement.addEventListener('mouseenter', () => { dot.style.opacity = ''; ring.style.opacity = ''; });
  });

  /* ---------- Click sparks ---------- */
  safe('sparks', () => {
    if (reduced) return;
    document.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const cs = getComputedStyle(root);
      const cols = ['--cyan', '--violet', '--pink', '--amber'].map((v) => cs.getPropertyValue(v).trim());
      for (let i = 0; i < 9; i++) {
        const s = document.createElement('i');
        s.className = 'spark';
        s.setAttribute('aria-hidden', 'true');
        s.style.background = cols[i % 4];
        const kind = i % 3;
        s.style.borderRadius = kind === 0 ? '50%' : kind === 1 ? '2px' : '0';
        if (kind === 2) s.style.clipPath = 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)';
        document.body.appendChild(s);
        const ang = Math.random() * Math.PI * 2;
        const dist = 34 + Math.random() * 52;
        const x = e.clientX - 4, y = e.clientY - 4;
        const anim = s.animate([
          { transform: `translate(${x}px, ${y}px) scale(1) rotate(0deg)`, opacity: 1 },
          { transform: `translate(${x + Math.cos(ang) * dist}px, ${y + Math.sin(ang) * dist}px) scale(0) rotate(${(Math.random() * 360) | 0}deg)`, opacity: 0 }
        ], { duration: 520 + Math.random() * 260, easing: 'cubic-bezier(.2,.8,.3,1)' });
        anim.onfinish = () => s.remove();
      }
    });
  });

  /* ---------- Scramble / decode text on small mono labels ---------- */
  safe('scramble', () => {
    if (reduced || !('IntersectionObserver' in window)) return;
    const glyphs = '01<>/{}[]#$%&*+=?';
    function run(el) {
      const final = el.dataset.final;
      const n = final.length;
      const t0 = performance.now();
      const dur = 650 + n * 12;
      (function f(now) {
        const p = clamp((now - t0) / dur, 0, 1);
        const done = Math.floor(p * n);
        let out = '';
        for (let i = 0; i < n; i++) {
          const c = final[i];
          out += (i < done || c === ' ' || c === '/' || c === '-' || c === '·') ? c : glyphs[(Math.random() * glyphs.length) | 0];
        }
        el.textContent = p < 1 ? out : final;
        if (p < 1) requestAnimationFrame(f);
      })(t0);
    }
    const els = $$('.section-eyebrow, .t-date, .work-kicker, .case-tag, .cert-date, .metric .where')
      .filter((el) => el.children.length === 0 && el.textContent.trim());
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        run(en.target);
      });
    }, { threshold: 0.6 });
    els.forEach((el) => { el.dataset.final = el.textContent; io.observe(el); });
  });

  /* ---------- Hero: glitch on the name + live REC timecode ---------- */
  safe('hero', () => {
    const rec = $('#recTc');
    if (rec) {
      if (reduced) rec.textContent = '00:00:12:07';
      else {
        let lastText = '';
        const hero = $('.hero');
        if (hero) addLooper(hero, (ms, now) => {
          const t = timecode((now - pageStart) / 1000);
          if (t !== lastText) { rec.textContent = t; lastText = t; }
        });
      }
    }

    const nameEl = $('.hero-name .line.split');
    if (!nameEl || reduced) return;
    const srOnly = $('.sr-only', nameEl);
    const txt = srOnly ? srOnly.textContent : nameEl.textContent;
    ['a', 'b'].forEach((k) => {
      const s = document.createElement('span');
      s.className = 'gl ' + k;
      s.setAttribute('aria-hidden', 'true');
      s.textContent = txt;
      nameEl.appendChild(s);
    });
    const fire = () => {
      nameEl.classList.remove('glitching');
      void nameEl.offsetWidth;
      nameEl.classList.add('glitching');
      setTimeout(() => nameEl.classList.remove('glitching'), 620);
    };
    nameEl.addEventListener('pointerenter', fire);
    setTimeout(function again() { fire(); setTimeout(again, 6500 + Math.random() * 3000); }, 3800);
  });

  /* ---------- Statement: words light up with scroll ---------- */
  safe('fill', () => {
    const p = $('#fillText');
    if (!p) return;
    const words = [];
    (function wrap(node) {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'sw';
            s.textContent = part;
            frag.appendChild(s);
            words.push(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    })(p);
    if (reduced) { words.forEach((w) => w.classList.add('on')); return; }
    const update = () => {
      const r = p.getBoundingClientRect();
      const vh = window.innerHeight;
      const prog = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.3), 0, 1);
      const n = Math.round(prog * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    };
    onScrollFns.push(update);
    update();
  });

  /* ---------- Crafts: developer (typing code) ---------- */
  safe('code', () => {
    const pre = $('#codeDemo');
    if (!pre) return;
    const code = $('code', pre);
    const lines = code.textContent.replace(/\n$/, '').split('\n');
    const re = /("[^"]*")|\b(const|let|var)\b|\b(true|false|\d+\+?)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z0-9_"])/g;
    function tokenize(line) {
      const out = [];
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(line))) {
        const cls = m[1] ? 'tok-s' : m[2] ? 'tok-k' : m[3] ? 'tok-n' : m[4] ? 'tok-v' : m[5] ? 'tok-w' : 'tok-p';
        out.push([cls, m[0]]);
      }
      return out;
    }
    const caret = document.createElement('span');
    caret.className = 'caret';
    function build(typed) {
      code.textContent = '';
      const items = [];
      lines.forEach((l) => {
        const row = document.createElement('span');
        row.className = 'cl';
        code.appendChild(row);
        tokenize(l).forEach(([cls, txt]) => {
          const s = document.createElement('span');
          s.className = cls;
          s.textContent = typed ? txt : '';
          row.appendChild(s);
          items.push([s, txt]);
        });
      });
      return items;
    }
    if (reduced) { build(true); return; }

    let items = build(false), ti = 0, ci = 0, phase = 'type', hold = 0, visible = false;
    items[0][0].after(caret);
    const host = pre.closest('.craft') || pre;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0.35 }).observe(host);
    } else visible = true;

    setInterval(() => {
      if (!visible || document.hidden) return;
      if (phase === 'type') {
        const [s, txt] = items[ti];
        const step = /^\s+$/.test(txt) ? txt.length : 1;
        ci = Math.min(txt.length, ci + step);
        s.textContent = txt.slice(0, ci);
        s.after(caret);
        if (ci >= txt.length) {
          ti++; ci = 0;
          if (ti >= items.length) { phase = 'hold'; hold = 110; }
        }
      } else if (--hold <= 0) {
        items = build(false); ti = 0; ci = 0; phase = 'type';
        items[0][0].after(caret);
      }
    }, 34);
  });

  /* ---------- Crafts: designer (pen tool draws a shape) ---------- */
  safe('pen', () => {
    const svg = $('#penSvg');
    if (!svg) return;
    const path = $('#penPath'), fill = $('#penFill'), nib = $('#penNib');
    const anchors = $$('#penAnchors rect');
    const handles = $$('#penHandles g');
    if (reduced) return;
    const len = path.getTotalLength();
    const frac = anchors.map((r) => {
      const px = +r.getAttribute('x') + 5, py = +r.getAttribute('y') + 5;
      let best = 0, bd = Infinity;
      for (let i = 0; i <= 400; i++) {
        const q = path.getPointAtLength((len * i) / 400);
        const d = (q.x - px) ** 2 + (q.y - py) ** 2;
        if (d < bd) { bd = d; best = i / 400; }
      }
      return best;
    });
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    path.style.strokeDasharray = len;
    const T = 9500;
    addLooper(svg.closest('.craft') || svg, (ms) => {
      const t = ms % T;
      const started = t >= 500;
      const p = t < 500 ? 0 : t < 4700 ? ease((t - 500) / 4200) : 1;
      const f = t < 4700 ? 0 : clamp((t - 4700) / 900, 0, 1);
      const o = t > 8600 ? 1 - (t - 8600) / 900 : 1;
      path.style.strokeDashoffset = len * (1 - p);
      path.style.opacity = o;
      fill.style.opacity = 0.22 * f * o;
      anchors.forEach((r, i) => {
        const on = started && p >= frac[i] - 0.002;
        r.style.opacity = on ? o : 0;
        r.style.transform = on ? 'scale(1)' : 'scale(.2)';
      });
      handles.forEach((g) => {
        const i = +g.dataset.a;
        g.style.opacity = started && p >= frac[i] && t < 7600 ? o : 0;
      });
      if (p > 0 && p < 1) {
        const q = path.getPointAtLength(len * p);
        nib.setAttribute('transform', `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) rotate(-24)`);
        nib.style.opacity = 1;
      } else nib.style.opacity = 0;
    });
  });

  /* ---------- Crafts: editor (timeline with a moving playhead) ---------- */
  safe('edit', () => {
    const body = $('#editDemo');
    if (!body) return;
    const nle = $('#nle'), mon = $('#monTc');
    [$('#wf'), $('#wfLit')].forEach((wf) => {
      if (!wf) return;
      for (let i = 0; i < 58; i++) {
        const b = document.createElement('i');
        const h = 0.2 + 0.78 * Math.abs(Math.sin(i * 0.62) * Math.cos(i * 0.21) + 0.25 * Math.sin(i * 2.1));
        b.style.setProperty('--h', clamp(h, 0.12, 1).toFixed(2));
        wf.appendChild(b);
      }
    });
    if (mon) mon.textContent = timecode(0.35 * 8);
    if (reduced) return;
    const T = 8000;
    let lastText = '';
    addLooper(body.closest('.craft') || body, (ms) => {
      const p = (ms % T) / T;
      body.style.setProperty('--p', p.toFixed(4));
      const t = timecode(p * 8);
      if (mon && t !== lastText) { mon.textContent = t; lastText = t; }
    });
  });

  /* ---------- Colour grade before / after slider ---------- */
  safe('grade', () => {
    const st = $('#gradeStage');
    if (!st) return;
    const inp = $('input', st);
    const set = (v) => st.style.setProperty('--x', v + '%');
    inp.addEventListener('input', () => set(inp.value));
    set(inp.value);

    const sc = $('#scopes');
    if (sc) {
      const cols = ['#ff5a6a', '#5dff9a', '#5aa9ff'];
      for (let g = 0; g < 3; g++) {
        for (let i = 0; i < 14; i++) {
          const b = document.createElement('i');
          b.style.setProperty('--sc', cols[g]);
          b.style.setProperty('--n', g * 14 + i);
          b.style.setProperty('--m', (0.35 + Math.abs(Math.sin(i * 0.9 + g * 2)) * 0.65).toFixed(2));
          sc.appendChild(b);
        }
      }
    }
    if (reduced || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      let touched = false;
      inp.addEventListener('pointerdown', () => { touched = true; }, { once: true });
      const t0 = performance.now();
      (function f(now) {
        if (touched) return;
        const t = (now - t0) / 2600;
        if (t >= 1) { inp.value = 50; set(50); return; }
        const v = 50 + Math.sin(t * Math.PI * 2) * 38 * (1 - t * 0.35);
        inp.value = v; set(v);
        requestAnimationFrame(f);
      })(t0);
    }, { threshold: 0.6 });
    io.observe(st);
  });

  /* ---------- Gallery film strip + lightbox ---------- */
  safe('film', () => {
    const film = $('#film');
    if (!film) return;
    const track = $('.film-track', film);
    if (!reduced) {
      [...track.children].forEach((f) => {
        const c = f.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        c.removeAttribute('tabindex');
        track.appendChild(c);
      });
    }
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Image preview');
    lb.innerHTML = "<button type='button' aria-label='Close preview'><i class='bx bx-x'></i></button><figure><img alt=''><figcaption></figcaption></figure>";
    document.body.appendChild(lb);
    const open = (fr) => {
      const img = $('img', fr);
      if (!img) return;
      const li = $('img', lb);
      li.src = img.currentSrc || img.src;
      li.alt = img.alt;
      $('figcaption', lb).textContent = $('figcaption', fr).textContent.replace(/^\d+\s*/, '');
      lb.classList.add('open');
      $('button', lb).focus();
    };
    const close = () => lb.classList.remove('open');
    film.addEventListener('click', (e) => { const fr = e.target.closest('.frame'); if (fr) open(fr); });
    film.addEventListener('keydown', (e) => {
      const fr = e.target.closest && e.target.closest('.frame');
      if (fr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(fr); }
    });
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.closest('button')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  });

  /* ---------- Scroll velocity: marquees speed up / reverse, frames skew ---------- */
  safe('velocity', () => {
    if (reduced) return;
    const tracks = $$('.marquee-track, .film-track');
    const skewEls = [...$$('.marquee'), $('#film')].filter(Boolean);
    if (!tracks.length) return;
    const anims = tracks.map((t) => {
      const list = t.getAnimations ? t.getAnimations() : [];
      return list.find((a) => a.animationName === 'marq') || list[0] || null;
    });
    let last = window.scrollY, v = 0, running = false;
    function step() {
      const y = window.scrollY;
      const dy = clamp(y - last, -120, 120);
      last = y;
      v += (dy - v) * 0.14;
      const boost = clamp(v * 0.18, -6, 6);
      anims.forEach((a) => {
        if (!a) return;
        a.playbackRate = 1 + boost;
        const dur = a.effect && a.effect.getTiming().duration;
        if (a.playbackRate < 0 && dur && a.currentTime < dur * 0.05) a.currentTime += dur;
      });
      const sk = clamp(-v * 0.16, -6, 6).toFixed(2) + 'deg';
      skewEls.forEach((el) => el.style.setProperty('--sk', sk));
      if (Math.abs(v) > 0.04 || Math.abs(dy) > 0) requestAnimationFrame(step);
      else {
        running = false;
        anims.forEach((a) => { if (a) a.playbackRate = 1; });
        skewEls.forEach((el) => el.style.setProperty('--sk', '0deg'));
      }
    }
    window.addEventListener('scroll', () => { if (!running) { running = true; requestAnimationFrame(step); } }, { passive: true });
  });

  /* ---------- Footer name fills as you reach the bottom ---------- */
  safe('mega', () => {
    const m = $('#mega');
    if (!m) return;
    const update = () => {
      const r = m.getBoundingClientRect();
      const p = clamp((window.innerHeight * 0.98 - r.top) / r.height, 0, 1);
      m.style.setProperty('--f', (p * 100).toFixed(1) + '%');
    };
    onScrollFns.push(update);
    update();
  });

  /* ---------- Accent colour dock ---------- */
  safe('dock', () => {
    const opts = [['Teal', '#34D8C7'], ['Sky', '#4DA3FF'], ['Lime', '#A6F04C'], ['Coral', '#FF7A66'], ['Orchid', '#D77CFF']];
    const dock = document.createElement('div');
    dock.className = 'dock no-print';
    dock.innerHTML = "<button type='button' class='dock-toggle' aria-label='Change accent colour' aria-expanded='false'><i class='bx bx-palette'></i></button><div class='dock-opts' role='group' aria-label='Accent colour'></div>";
    document.body.appendChild(dock);
    const wrap = $('.dock-opts', dock);
    const toggle = $('.dock-toggle', dock);
    const btns = opts.map(([name, c]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.setProperty('--c', c);
      b.setAttribute('aria-label', name);
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => apply(c, true));
      wrap.appendChild(b);
      return [c, b];
    });
    function apply(c, save) {
      if (c === opts[0][1]) root.style.removeProperty('--cyan'); else root.style.setProperty('--cyan', c);
      btns.forEach(([bc, b]) => b.setAttribute('aria-pressed', String(bc === c)));
      if (save) { try { localStorage.setItem('accent', c); } catch (_) { /* ignore */ } }
    }
    let saved = null;
    try { saved = localStorage.getItem('accent'); } catch (_) { /* ignore */ }
    apply(opts.some((o) => o[1] === saved) ? saved : opts[0][1], false);
    const setOpen = (o) => { dock.classList.toggle('open', o); toggle.setAttribute('aria-expanded', String(o)); };
    toggle.addEventListener('click', () => setOpen(!dock.classList.contains('open')));
    document.addEventListener('click', (e) => { if (!dock.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  });

  runScrollFns();
})();
