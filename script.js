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

// ---------- Sticky header state ----------
const header = document.getElementById("header");
window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 20);
});

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

// ---------- Contact form (mailto handoff) ----------
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

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

// ---------- Footer year ----------
document.getElementById("year").textContent = new Date().getFullYear();
