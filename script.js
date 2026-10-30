/* =========================================================
   Mahammad Arif G A — portfolio interactions
   Every block is guarded, so the same file runs on all pages.
========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Ambient layers (aurora, grain, progress, cursor glow) ---------- */
  function ensure(cls, html) {
    if ($('.' + cls)) return;
    const d = document.createElement('div');
    d.className = cls;
    d.setAttribute('aria-hidden', 'true');
    if (html) d.innerHTML = html;
    document.body.prepend(d);
  }
  ensure('grain');
  ensure('aurora', '<span></span><span></span><span></span>');

  let progressBar = $('#scrollProgress');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.id = 'scrollProgress';
    document.body.prepend(progressBar);
  }

  let glow = null;
  if (finePointer && !reduced) {
    glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);
    window.addEventListener('pointermove', (e) => {
      glow.style.setProperty('--cx', e.clientX + 'px');
      glow.style.setProperty('--cy', e.clientY + 'px');
      glow.classList.add('on');
    }, { passive: true });
    document.addEventListener('pointerleave', () => glow.classList.remove('on'));
  }

  /* ---------- Preloader → page entrance ---------- */
  const pre = $('#preloader');
  const t0 = performance.now();
  const showPage = () => root.classList.add('loaded');
  function finishPreloader() {
    if (!pre) { showPage(); return; }
    const wait = reduced ? 0 : Math.max(0, 1100 - (performance.now() - t0));
    setTimeout(() => {
      pre.classList.add('done');
      showPage();
      setTimeout(() => pre.remove(), 900);
    }, wait);
  }
  if (document.readyState === 'complete') finishPreloader();
  else window.addEventListener('load', finishPreloader);
  setTimeout(showPage, 3200);

  /* ---------- Split text (hero name) & word reveal (section titles) ---------- */
  $$('.split').forEach((el) => {
    const text = el.textContent;
    el.innerHTML = '<span class="sr-only">' + text + '</span>';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'char';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
    });
  });

  function wrapWords(node, counter) {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          const inner = document.createElement('span');
          inner.className = 'wi';
          inner.style.setProperty('--i', counter.n++);
          inner.textContent = part;
          w.appendChild(inner);
          frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) {
        wrapWords(n, counter);
      }
    });
  }
  $$('.reveal-words').forEach((el) => wrapWords(el, { n: 0 }));

  /* ---------- Typed.js role rotation ---------- */
  if (window.Typed && $('.typed-wrap .text') && !reduced) {
    new Typed('.typed-wrap .text', {
      strings: [
        'high-converting WooCommerce stores.',
        'SEO-ready WordPress websites.',
        'scalable React web apps.',
        'data-driven Google & Meta ad campaigns.',
        'landing pages that turn visits into leads.'
      ],
      typeSpeed: 48, backSpeed: 24, backDelay: 1500, startDelay: 900, loop: true
    });
  }

  /* ---------- Marquee: clone the track for a seamless loop ---------- */
  $$('.marquee-track').forEach((track) => {
    if (reduced) return;
    const clone = track.cloneNode(true);
    [...clone.children].forEach((c) => c.setAttribute('aria-hidden', 'true'));
    [...clone.children].forEach((c) => track.appendChild(c));
  });

  /* ---------- Mobile navigation ---------- */
  const navToggle = $('#navToggle');
  const navbar = $('#navbar');
  function setNav(open) {
    if (!navbar || !navToggle) return;
    navbar.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.innerHTML = open ? "<i class='bx bx-x'></i>" : "<i class='bx bx-menu'></i>";
  }
  if (navToggle && navbar) {
    navToggle.addEventListener('click', () => setNav(!navbar.classList.contains('open')));
    $$('a', navbar).forEach((a) => a.addEventListener('click', () => setNav(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });
    document.addEventListener('click', (e) => {
      if (navbar.classList.contains('open') && !navbar.contains(e.target) && !navToggle.contains(e.target)) setNav(false);
    });
  }

  /* ---------- Scroll-linked UI (header, progress, back-to-top, timeline) ---------- */
  const header = $('#header');
  const toTop = $('#toTop');
  const timeline = $('.timeline');
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const max = root.scrollHeight - root.clientHeight;
    progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    if (header) header.classList.toggle('scrolled', y > 24);
    if (toTop) toTop.classList.toggle('show', y > 700);

    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const vh = window.innerHeight;
      const prog = clamp((vh * 0.62 - r.top) / r.height, 0, 1);
      timeline.style.setProperty('--tl', (prog * 100).toFixed(1) + '%');
      $$('.t-item', timeline).forEach((it) => {
        if (it.hidden) return;
        it.classList.toggle('active', it.getBoundingClientRect().top < vh * 0.64);
      });
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));

  /* ---------- Scroll-spy for in-page nav links ---------- */
  const spyLinks = $$('.navbar a[href^="#"], .navbar a[href^="index.html#"]');
  const spySections = $$('main section[id], section[id]').filter((s) => $('.navbar a[href$="#' + s.id + '"]'));
  if (spySections.length && 'IntersectionObserver' in window && !$('.navbar a[aria-current="page"]')) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        spyLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href').endsWith('#' + en.target.id)));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spySections.forEach((s) => spy.observe(s));
    const hero = $('#top');
    if (hero) new IntersectionObserver((en) => { if (en[0].isIntersecting) spyLinks.forEach((a) => a.classList.remove('active')); }, { threshold: 0.4 }).observe(hero);
  }

  /* ---------- Reveal on scroll (with auto-stagger) ---------- */
  $$('[data-stagger]').forEach((group) => {
    [...group.children].forEach((child, i) => {
      child.classList.add('reveal');
      child.style.setProperty('--d', i * 90);
      $$('.tag', child).forEach((t, ti) => t.style.setProperty('--ti', ti));
    });
  });
  $$('.reveal[data-delay]').forEach((el) => el.style.setProperty('--d', el.dataset.delay));

  const revealTargets = $$('.reveal, .reveal-words');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in-view');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('in-view'));
  }

  /* ---------- Animated counters ---------- */
  const counters = $$('.count');
  function runCounter(el) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    if (reduced) { el.textContent = target.toFixed(decimals) + suffix; return; }
    const dur = 1700;
    const start = performance.now();
    (function tick(now) {
      const p = clamp((now - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }
  if ('IntersectionObserver' in window && counters.length) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        runCounter(en.target);
        cio.unobserve(en.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- Spotlight + 3D tilt ---------- */
  $$('.spot').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      if (el.classList.contains('tilt') && !reduced) {
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1000px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-5px)`;
      }
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduced) {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.22}px, ${y * 0.32}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Hero parallax layers ---------- */
  const hero = $('.hero');
  if (hero && finePointer && !reduced) {
    const layers = $$('.layer[data-depth]', hero);
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach((l) => {
        const d = parseFloat(l.dataset.depth);
        l.style.transform = `translate3d(${(x * d).toFixed(1)}px, ${(y * d).toFixed(1)}px, 0)`;
      });
    });
    hero.addEventListener('pointerleave', () => layers.forEach((l) => { l.style.transform = ''; }));
  }

  /* ---------- Hero particle network ---------- */
  const canvas = $('#heroCanvas');
  if (canvas && hero && !reduced) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, pts = [], visible = true, raf = 0;
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = clamp(Math.floor((w * h) / 17000), 24, 90);
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.6
      }));
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(160,175,255,.7)';
        ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 15000) {
            ctx.strokeStyle = `rgba(124,108,255,${(0.28 * (1 - d2 / 15000)).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        const mx = p.x - mouse.x, my = p.y - mouse.y;
        const md = mx * mx + my * my;
        if (md < 24000) {
          ctx.strokeStyle = `rgba(52,216,199,${(0.55 * (1 - md / 24000)).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    }
    function start() { if (!raf) raf = requestAnimationFrame(frame); }
    resize();
    start();
    window.addEventListener('resize', () => { resize(); });
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) start(); }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  }

  /* ---------- Experience filters ---------- */
  const filterBtns = $$('.chip-btn[data-filter]');
  if (filterBtns.length) {
    const items = $$('.t-item');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        const f = btn.dataset.filter;
        items.forEach((it) => {
          const show = f === 'all' || it.dataset.cat.split(' ').includes(f);
          it.hidden = !show;
          it.classList.remove('pop');
          if (show) { void it.offsetWidth; it.classList.add('pop'); it.classList.add('in-view'); }
        });
        onScroll();
      });
    });
  }

  /* ---------- Toast + copy to clipboard ---------- */
  let toastEl = null, toastTimer = 0;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
      } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = value; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (__) { /* ignore */ }
        ta.remove();
      }
      toast('Copied: ' + value);
    });
  });

  /* ---------- Contact form (opens the visitor's email app) ---------- */
  const form = $('#contactForm');
  const status = $('#formStatus');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = form.elements;
      const name = f['name'].value.trim();
      const email = f['email'].value.trim();
      const subject = f['subject'].value.trim() || 'Portfolio enquiry';
      const message = f['message'].value.trim();
      const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
      window.location.href = `mailto:arifjeermukki@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (status) status.textContent = 'Opening your email app to send this message…';
    });
  }

  /* ---------- Blog reading time ---------- */
  $$('.blog-post').forEach((post) => {
    const words = $$('p', post).map((p) => p.textContent).join(' ').trim().split(/\s+/).length;
    const meta = $('.blog-post-meta', post);
    if (meta) {
      const span = document.createElement('span');
      span.className = 'blog-date';
      span.textContent = Math.max(1, Math.round(words / 200)) + ' min read';
      meta.appendChild(span);
    }
  });

  /* ---------- Footer year ---------- */
  $$('#year').forEach((el) => { el.textContent = new Date().getFullYear(); });

  window.__ready = true; // tells the page's safety net that scripts ran fine
})();
