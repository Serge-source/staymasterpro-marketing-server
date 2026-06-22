/* ============================================================
   STAYMASTERPRO — script.js
============================================================ */

// ---- Configurable URLs (edit these to match your deployment) ----
const APP_TRIAL_URL   = "https://app.yourdomain.com/register";
const APP_LOGIN_URL   = "https://app.yourdomain.com/login";
const DEMO_URL        = "https://calendly.com/yourcompany/demo";
const CHATBOT_URL     = "https://chat.yourdomain.com";
const CONTACT_EMAIL   = "sales@yourcompany.com";

// ---- Initialize on DOM ready ----
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();

  // AOS — Animate On Scroll
  AOS.init({
    duration: 650,   // default animation duration (ms)
    once:     true,  // animate only the first time element enters viewport
    offset:   60,    // trigger 60px before element enters viewport
    easing:   "ease-out-cubic",
  });

  wireButtons();
  initNavScroll();
  initSmoothScroll();
  initForms();
  initPricingButtons();
  animateStats();
  initScrollProgress();
  initBackToTop();
  initRipple();
  initHeroParallax();
  initBillingToggle();
  initStickyCTA();
  initHamburger();
  initCookieBanner();
  initChatWidget();
  initExitIntent();
  initABTest();
  initPageReveal();
  initDarkMode();
  initParticles();
  initBadgeTicker();
  initVideoPlayer();
});

// ---- Wire all CTA buttons to configured URLs ----
function wireButtons() {
  const trialIds  = ["nav-trial-btn", "hero-trial-btn", "trial-cta-btn", "footer-trial-btn", "hiw-trial-btn"];
  const demoIds   = ["nav-demo-btn", "hero-demo-btn", "demo-schedule-btn", "footer-demo-btn", "contact-demo-btn"];
  const aiIds     = ["hero-ai-btn", "ai-launch-btn", "footer-ai-btn"];
  const emailIds  = ["sales-email-link"];

  trialIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.href = APP_TRIAL_URL; el.target = "_blank"; el.rel = "noopener"; }
  });

  demoIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.href = DEMO_URL; el.target = "_blank"; el.rel = "noopener"; }
  });

  aiIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.href = CHATBOT_URL; el.target = "_blank"; el.rel = "noopener"; }
  });

  emailIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = `mailto:${CONTACT_EMAIL}`;
  });
}

// ---- Navbar scroll effect ----
function initNavScroll() {
  const nav = document.getElementById("mainNav");
  if (!nav) return;

  const updateNav = () => {
    if (window.scrollY > 60) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  };

  window.addEventListener("scroll", updateNav, { passive: true });
  updateNav();

  // Active link highlight on scroll
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".navbar-nav .nav-link");

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.remove("active");
          if (link.getAttribute("href") === `#${entry.target.id}`) {
            link.classList.add("active");
          }
        });
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });

  sections.forEach(sec => observer.observe(sec));
}

// ---- Smooth scroll for anchor links ----
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", e => {
      const target = document.querySelector(anchor.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      const navH = document.getElementById("mainNav")?.offsetHeight || 70;
      const top  = target.getBoundingClientRect().top + window.pageYOffset - navH - 10;
      window.scrollTo({ top, behavior: "smooth" });

      // Close mobile navbar if open
      const collapse = document.getElementById("navContent");
      if (collapse?.classList.contains("show")) {
        bootstrap.Collapse.getInstance(collapse)?.hide();
      }
    });
  });
}

// ---- Form handling (lead + contact + demo modal) ----
function validateField(input) {
  const wrap = input.closest(".lead-field-wrap") || input.parentElement;
  const errorEl = wrap ? wrap.querySelector(".field-error") : null;
  let valid = true;

  if (input.hasAttribute("required")) {
    if (input.type === "email") {
      valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    } else {
      valid = input.value.trim().length > 0;
    }
  }

  if (valid) {
    input.classList.remove("is-invalid");
    if (errorEl) errorEl.classList.remove("visible");
  } else {
    input.classList.add("is-invalid");
    if (errorEl) errorEl.classList.add("visible");
  }
  return valid;
}

function validateForm(form) {
  const requiredFields = form.querySelectorAll("[required]");
  let allValid = true;
  requiredFields.forEach(field => {
    if (!validateField(field)) allValid = false;
  });
  return allValid;
}

function initForms() {
  const formIds = ["heroLeadForm", "pricingLeadForm", "footerLeadForm", "contactForm", "demoModalForm", "exitForm"];

  formIds.forEach(id => {
    const form = document.getElementById(id);
    if (!form) return;

    // Live validation on blur
    form.querySelectorAll("[required]").forEach(field => {
      field.addEventListener("blur", () => validateField(field));
      field.addEventListener("input", () => {
        if (field.classList.contains("is-invalid")) validateField(field);
      });
    });

    form.addEventListener("submit", e => {
      e.preventDefault();

      if (!validateForm(form)) return; // Stop if invalid

      // Collect form data
      const data = Object.fromEntries(new FormData(form));
      console.log(`Form [${id}] submitted:`, data); // Replace with API call

      // Show success toast
      const messages = {
        heroLeadForm:    "Thanks! We'll be in touch shortly.",
        pricingLeadForm: "Thanks! We'll send you a plan recommendation.",
        footerLeadForm:  "You're subscribed! Thanks for joining.",
        contactForm:     "Message received! Our team will reply within 24h.",
        demoModalForm:   "Demo request sent! We'll contact you to confirm.",
        exitForm:        "Extended trial activated! Check your inbox.",
      };
      showToast(messages[id] || "Thank you! We'll be in touch.");

      form.reset();
      form.querySelectorAll(".is-invalid").forEach(f => f.classList.remove("is-invalid"));
      form.querySelectorAll(".field-error.visible").forEach(e => e.classList.remove("visible"));

      // Close modal if this was the demo modal form
      if (id === "demoModalForm") {
        const modal = bootstrap.Modal.getInstance(document.getElementById("demoModal"));
        setTimeout(() => modal?.hide(), 1200);
      }
      // Close exit overlay if exitForm submitted
      if (id === "exitForm") {
        const overlay = document.getElementById("exit-overlay");
        if (overlay) overlay.classList.remove("active");
      }
    });
  });
}

// ---- Pricing buttons — link each plan to trial URL with query param ----
function initPricingButtons() {
  document.querySelectorAll(".pricing-btn[data-plan]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      const plan = btn.dataset.plan;
      window.open(`${APP_TRIAL_URL}?plan=${plan}`, "_blank", "noopener");
    });
  });
}

// ---- Animated stat counters ----
function animateStats() {
  const statEls = document.querySelectorAll(".stat-number");

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);

      const el     = entry.target;
      const text   = el.textContent.trim();
      const suffix = text.replace(/[\d,.]/g, ""); // e.g. "+", "%", "k"
      const raw    = parseFloat(text.replace(/[^0-9.]/g, ""));

      if (isNaN(raw)) return;

      let start = 0;
      const duration = 1800;
      const step = timestamp => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        const current  = Math.floor(eased * raw);

        // Format with commas for thousands
        el.textContent = current.toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = text; // restore original
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });

  statEls.forEach(el => observer.observe(el));
}

// ---- Video player (lazy embed on click) ----
function initVideoPlayer() {
  const playBtn = document.getElementById("videoPlayBtn");
  const poster  = document.getElementById("videoPoster");
  const embed   = document.getElementById("videoEmbed");
  if (!playBtn || !poster || !embed) return;

  playBtn.addEventListener("click", () => {
    poster.classList.add("d-none");
    embed.classList.remove("d-none");
  });
}

// ---- Page load reveal ----
function initPageReveal() {
  requestAnimationFrame(() => {
    document.body.classList.remove("page-loading");
    document.body.classList.add("page-loaded");
  });
}

// ---- Dark mode ----
function initDarkMode() {
  const btn     = document.getElementById("darkModeToggle");
  const moonIcon = btn?.querySelector(".dm-moon");
  const sunIcon  = btn?.querySelector(".dm-sun");
  if (!btn) return;

  function applyDark(on) {
    document.documentElement.classList.toggle("dark-mode", on);
    moonIcon?.classList.toggle("d-none", on);
    sunIcon?.classList.toggle("d-none", !on);
    localStorage.setItem("darkMode", on ? "1" : "0");
  }

  // Restore saved state
  applyDark(document.documentElement.classList.contains("dark-mode"));

  btn.addEventListener("click", () => {
    applyDark(!document.documentElement.classList.contains("dark-mode"));
  });
}

// ---- Hero particle canvas ----
function initParticles() {
  const canvas = document.getElementById("heroParticles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, dots;

  function resize() {
    const hero = canvas.parentElement;
    W = canvas.width  = hero.offsetWidth;
    H = canvas.height = hero.offsetHeight;
    dots = Array.from({ length: Math.floor((W * H) / 14000) }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 1.5 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    dots.forEach(d => {
      d.x += d.vx;  d.y += d.vy;
      if (d.x < 0) d.x = W;  if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H;  if (d.y > H) d.y = 0;

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fill();
    });

    // Draw connecting lines for nearby dots
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x;
        const dy = dots[i].y - dots[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90) {
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.strokeStyle = `rgba(255,255,255,${0.12 * (1 - dist / 90)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  draw();
}

// ---- Animated hero badge ticker ----
function initBadgeTicker() {
  const el = document.getElementById("heroBadgeTicker");
  if (!el) return;

  const counts = [1000, 1023, 1047, 1062, 1081, 1094, 1112];
  let idx = 0;

  function tick() {
    idx = (idx + 1) % counts.length;
    el.style.transform = "translateY(-4px)";
    el.style.opacity   = "0";
    setTimeout(() => {
      el.textContent     = counts[idx].toLocaleString() + "+";
      el.style.transform = "translateY(0)";
      el.style.opacity   = "1";
    }, 200);
  }

  el.style.transition = "transform 0.2s ease, opacity 0.2s ease";
  setInterval(tick, 3500);
}

// ---- Cookie / GDPR Banner ----
function initCookieBanner() {
  if (localStorage.getItem("cookieConsent")) return;
  const banner = document.getElementById("cookie-banner");
  if (!banner) return;

  setTimeout(() => banner.classList.add("visible"), 1200);

  document.getElementById("cookie-accept")?.addEventListener("click", () => {
    localStorage.setItem("cookieConsent", "accepted");
    banner.classList.remove("visible");
  });
  document.getElementById("cookie-decline")?.addEventListener("click", () => {
    localStorage.setItem("cookieConsent", "declined");
    banner.classList.remove("visible");
  });
}

// ---- Live Chat Widget ----
const CHAT_RESPONSES = {
  "tell me about pricing":        "We have 4 plans — Starter ($49/mo), Growth ($149/mo), Professional ($299/mo), and Enterprise (custom). All include a 14-day free trial! 🎉",
  "how does the free trial work?": "Sign up with just your email — no credit card needed. You get full access for 14 days. After that, choose the plan that fits you best.",
  "book a demo":                   "Awesome! You can schedule a free 30-minute demo with our team. Click the 'Book Demo' button at the top of the page or I can open the scheduling link for you. 📅",
  "what platforms do you integrate with?": "StayMaster Pro works alongside Airbnb, VRBO, Booking.com, Expedia, TripAdvisor, HomeAway, Stripe, and WhatsApp — with more integrations coming soon! 🔗",
};
const FALLBACK_RESPONSE = "Great question! Our team would love to answer that in detail. You can book a free demo or start a 14-day trial to explore the platform yourself. 😊";

function initChatWidget() {
  const bubble   = document.getElementById("chat-bubble");
  const panel    = document.getElementById("chatPanel");
  const closeBtn = document.getElementById("chatPanelClose");
  const iconOpen = document.getElementById("chat-icon-open");
  const iconClose= document.getElementById("chat-icon-close");
  const unread   = document.getElementById("chatUnreadDot");
  const messages = document.getElementById("chatPanelMessages");
  const input    = document.getElementById("chatInput");
  const sendBtn  = document.getElementById("chatSend");
  if (!bubble || !panel) return;

  let isOpen = false;

  function openChat() {
    isOpen = true;
    panel.style.display = "flex";
    requestAnimationFrame(() => panel.classList.add("open"));
    iconOpen.classList.add("d-none");
    iconClose.classList.remove("d-none");
    if (unread) unread.classList.add("hidden");
    input?.focus();
  }
  function closeChat() {
    isOpen = false;
    panel.classList.remove("open");
    setTimeout(() => { if (!isOpen) panel.style.display = "none"; }, 300);
    iconOpen.classList.remove("d-none");
    iconClose.classList.add("d-none");
  }

  bubble.addEventListener("click", () => isOpen ? closeChat() : openChat());
  closeBtn?.addEventListener("click", closeChat);

  // Show unread dot after 6s if not opened
  setTimeout(() => { if (!isOpen && unread) unread.classList.remove("hidden"); }, 6000);

  // Quick replies
  document.querySelectorAll(".quick-reply").forEach(btn => {
    btn.addEventListener("click", () => {
      const msg = btn.dataset.msg;
      addMessage(msg, "user");
      btn.closest(".chat-panel-quick")?.remove();
      setTimeout(() => addTyping().then(() => addMessage(getResponse(msg), "ai")), 600);
    });
  });

  // Send message
  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMessage(text, "user");
    setTimeout(() => addTyping().then(() => addMessage(getResponse(text), "ai")), 700);
  }
  sendBtn?.addEventListener("click", sendMessage);
  input?.addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(); });

  function addMessage(text, role) {
    const div = document.createElement("div");
    div.className = `cp-msg ${role}`;
    div.innerHTML = `<div class="cp-bubble">${text}</div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function addTyping() {
    const div = document.createElement("div");
    div.className = "cp-msg ai";
    div.innerHTML = `<div class="cp-bubble typing-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return new Promise(resolve => setTimeout(() => { div.remove(); resolve(); }, 1000));
  }

  function getResponse(text) {
    const key = text.toLowerCase().trim();
    return CHAT_RESPONSES[key] || FALLBACK_RESPONSE;
  }
}

// ---- Exit-Intent Popup ----
function initExitIntent() {
  if (sessionStorage.getItem("exitShown")) return;
  const overlay = document.getElementById("exit-overlay");
  const closeBtn = document.getElementById("exitClose");
  const form     = document.getElementById("exitForm");
  if (!overlay) return;

  let triggered = false;
  let scrollDepth = 0;

  // Track scroll depth — only trigger if user has scrolled at least 30%
  window.addEventListener("scroll", () => {
    const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
    if (pct > scrollDepth) scrollDepth = pct;
  }, { passive: true });

  // Desktop: mouse leaves viewport at top
  document.addEventListener("mouseleave", e => {
    if (triggered || e.clientY > 20 || scrollDepth < 30) return;
    showExit();
  });

  // Mobile fallback: back-button intent via popstate
  history.pushState(null, "", location.href);
  window.addEventListener("popstate", () => {
    if (!triggered && scrollDepth >= 20) showExit();
  });

  function showExit() {
    triggered = true;
    sessionStorage.setItem("exitShown", "1");
    overlay.classList.add("visible");
    lucide.createIcons();
  }

  function hideExit() {
    overlay.classList.remove("visible");
  }

  closeBtn?.addEventListener("click", hideExit);
  overlay.addEventListener("click", e => { if (e.target === overlay) hideExit(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") hideExit(); });

  form?.addEventListener("submit", e => {
    e.preventDefault();
    const email = form.querySelector("input")?.value;
    console.log("Exit-intent lead:", email);
    showToast("🎉 Your 30-day trial has been activated! Check your inbox.");
    hideExit();
  });
}

// ---- A/B Test — Hero Headline Variants ----
function initABTest() {
  const el = document.getElementById("heroHeadline");
  if (!el) return;

  const variants = [
    { id: "A", html: 'Manage Your Vacation Rentals <span class="text-accent">Smarter, Faster,</span> and More Profitably' },
    { id: "B", html: 'Stop Losing Revenue to<br><span class="text-accent">Manual Property Management</span>' },
    { id: "C", html: 'The All-in-One Platform That <span class="text-accent">Vacation Rental Pros</span> Trust' },
  ];

  // Deterministic per-session assignment (no random flicker on reload)
  let variantIndex = parseInt(sessionStorage.getItem("abVariant") ?? "-1");
  if (variantIndex < 0) {
    variantIndex = Math.floor(Math.random() * variants.length);
    sessionStorage.setItem("abVariant", String(variantIndex));
  }

  const chosen = variants[variantIndex];
  el.innerHTML = chosen.html;

  // Dev badge (remove in production)
  const badge = document.createElement("div");
  badge.className = "ab-variant-badge";
  badge.textContent = `A/B: ${chosen.id}`;
  document.body.appendChild(badge);

  // Log for analytics
  console.log(`[A/B] Hero variant: ${chosen.id}`);
}

// ---- Annual / Monthly pricing toggle ----
function initBillingToggle() {
  const toggle = document.getElementById("billingToggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const isAnnual = toggle.getAttribute("aria-checked") === "true";
    const nowAnnual = !isAnnual;
    toggle.setAttribute("aria-checked", String(nowAnnual));

    const labelMonthly = document.getElementById("label-monthly");
    const labelAnnual  = document.getElementById("label-annual");
    if (labelMonthly) labelMonthly.style.opacity = nowAnnual ? "0.5" : "1";
    if (labelAnnual)  labelAnnual.style.opacity  = nowAnnual ? "1"   : "0.5";

    document.querySelectorAll(".pricing-price[data-monthly]").forEach(el => {
      const val = nowAnnual ? el.dataset.annual : el.dataset.monthly;
      if (!val) return;
      el.innerHTML = `${val}<span>/mo</span>`;
      el.classList.add("price-flash");
      setTimeout(() => el.classList.remove("price-flash"), 350);
    });
  });
}

// ---- Sticky CTA bar ----
function initStickyCTA() {
  const bar = document.getElementById("sticky-cta");
  if (!bar) return;

  // Wire buttons
  const trialBtn = document.getElementById("sticky-trial-btn");
  const demoBtn  = document.getElementById("sticky-demo-btn");
  if (trialBtn) { trialBtn.href = APP_TRIAL_URL; trialBtn.target = "_blank"; trialBtn.rel = "noopener"; }
  if (demoBtn)  { demoBtn.href  = DEMO_URL;      demoBtn.target  = "_blank"; demoBtn.rel  = "noopener"; }

  const heroSection = document.getElementById("home");
  if (!heroSection) return;

  const observer = new IntersectionObserver(entries => {
    const heroVisible = entries[0].isIntersecting;
    bar.classList.toggle("visible", !heroVisible);
  }, { threshold: 0.1 });

  observer.observe(heroSection);
}

// ---- Animated hamburger ----
function initHamburger() {
  const btn      = document.getElementById("navToggler");
  const collapse = document.getElementById("navContent");
  if (!btn || !collapse) return;

  collapse.addEventListener("show.bs.collapse",  () => btn.classList.add("open"));
  collapse.addEventListener("hide.bs.collapse",  () => btn.classList.remove("open"));
}

// ---- Scroll progress bar ----
function initScrollProgress() {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;
  window.addEventListener("scroll", () => {
    const doc  = document.documentElement;
    const scrolled = doc.scrollTop / (doc.scrollHeight - doc.clientHeight) * 100;
    bar.style.width = scrolled + "%";
  }, { passive: true });
}

// ---- Back to top button ----
function initBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    btn.classList.toggle("visible", window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ---- Ripple effect on accent & primary buttons ----
function initRipple() {
  document.querySelectorAll(".btn-accent, .btn-primary, .btn-outline-primary").forEach(btn => {
    btn.classList.add("btn-ripple");
    btn.addEventListener("click", function(e) {
      const rect   = this.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height);
      const x      = e.clientX - rect.left - size / 2;
      const y      = e.clientY - rect.top  - size / 2;
      const wave   = document.createElement("span");
      wave.className = "ripple-wave";
      wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
      this.appendChild(wave);
      wave.addEventListener("animationend", () => wave.remove());
    });
  });
}

// ---- Subtle hero parallax on scroll ----
function initHeroParallax() {
  const heroText = document.querySelector(".hero-text");
  if (!heroText) return;

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (y < 600) {
      heroText.style.transform = `translateY(${y * 0.08}px)`;
      heroText.style.opacity   = 1 - y / 550;
    }
  }, { passive: true });
}

// ---- Toast utility ----
function showToast(message) {
  const toastEl  = document.getElementById("successToast");
  const msgEl    = document.getElementById("toastMessage");
  if (!toastEl || !msgEl) return;

  msgEl.textContent = message;
  lucide.createIcons(); // re-init icons in toast

  const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 4000 });
  toast.show();
}
