// ---------- Typed.js hero role rotation ----------
if (window.Typed) {
  new Typed(".text", {
    strings: [
      "scalable web apps.",
      "high-converting stores.",
      "SEO-ready storefronts.",
      "data-driven ad campaigns."
    ],
    typeSpeed: 55,
    backSpeed: 30,
    backDelay: 1400,
    loop: true
  });
}

// ---------- Scroll progress bar ----------
const scrollProgress = document.getElementById("scrollProgress");
if (scrollProgress) {
  window.addEventListener("scroll", () => {
    const h = document.documentElement;
    const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    scrollProgress.style.width = scrolled + "%";
  });
}

// ---------- Sticky header state ----------
const header = document.getElementById("header");
if (header) {
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 20);
  });
}

// ---------- Mobile nav toggle ----------
const navToggle = document.getElementById("navToggle");
const navbar = document.getElementById("navbar");
navToggle.addEventListener("click", () => {
  const isOpen = navbar.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", isOpen);
  navToggle.innerHTML = isOpen ? "<i class='bx bx-x'></i>" : "<i class='bx bx-menu'></i>";
});
navbar.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navbar.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.innerHTML = "<i class='bx bx-menu'></i>";
  });
});

// ---------- Hero window tabs (dev.js / growth.chart) ----------
const tabButtons = document.querySelectorAll(".tab-btn");
const panes = document.querySelectorAll("[data-pane]");
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.tab;
    panes.forEach(pane => {
      pane.classList.toggle("active", pane.dataset.pane === target);
    });
    // Restart bar-grow animation each time the chart tab is shown
    if (target === "growth") {
      document.querySelectorAll(".bar").forEach(bar => {
        bar.style.animation = "none";
        // eslint-disable-next-line no-unused-expressions
        bar.offsetHeight; // force reflow
        bar.style.animation = "";
      });
    }
  });
});

// ---------- Scroll-reveal ----------
const revealEls = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in-view");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => revealObserver.observe(el));

// ---------- Animated stat counters ----------
const statNums = document.querySelectorAll(".stat-num");
if (statNums.length) {
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || "";
      const isDecimal = String(target).includes(".");
      const duration = 1400;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        el.textContent = (isDecimal ? value.toFixed(1) : Math.round(value)) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      statObserver.unobserve(el);
    });
  }, { threshold: 0.5 });
  statNums.forEach(el => statObserver.observe(el));
}

// ---------- Card tilt + cursor spotlight ----------
const tiltCards = document.querySelectorAll(".skill-card, .work-card, .case-block, .blog-post");
tiltCards.forEach(card => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotateX = ((y - cy) / cy) * -3;
    const rotateY = ((x - cx) / cx) * 3;
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    card.style.setProperty("--mx", `${x}px`);
    card.style.setProperty("--my", `${y}px`);
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "";
  });
});

// ---------- Hero parallax on floating chips + window ----------
const heroVisual = document.querySelector(".hero-visual");
if (heroVisual && window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
  const chips = heroVisual.querySelectorAll(".floating-chip");
  const win = heroVisual.querySelector(".window");
  document.querySelector(".hero").addEventListener("mousemove", (e) => {
    const rect = heroVisual.getBoundingClientRect();
    const relX = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const relY = (e.clientY - rect.top - rect.height / 2) / rect.height;
    chips.forEach((chip, i) => {
      const depth = 14 + i * 6;
      chip.style.transform = `translate(${relX * depth}px, ${relY * depth}px)`;
    });
    if (win) win.style.transform = `rotateX(${relY * -3}deg) rotateY(${relX * 3}deg)`;
  });
}

// ---------- Magnetic buttons ----------
document.querySelectorAll(".btn").forEach(btn => {
  btn.addEventListener("mousemove", (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.15}px, ${y * 0.3}px)`;
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "";
  });
});

// ---------- Contact form (mailto handoff) ----------
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = contactForm.name.value.trim();
    const email = contactForm.email.value.trim();
    const subject = contactForm.subject.value.trim() || "Portfolio enquiry";
    const message = contactForm.message.value.trim();

    const body = `Name: ${name}%0AEmail: ${email}%0A%0A${encodeURIComponent(message)}`;
    const mailto = `mailto:arifjeermukki@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;

    window.location.href = mailto;
    formStatus.textContent = "Opening your email app to send this message…";
  });
}

// ---------- Footer year ----------
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
