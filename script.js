/* ============================================================
   STAYMASTERPRO — script.js
============================================================ */

// ---- Configurable URLs (edit these to match your deployment) ----
const APP_TRIAL_URL       = "https://app.staymasterpro.com/register";
const APP_LOGIN_URL       = "https://app.staymasterpro.com/login";
const DEMO_CALENDLY_URL   = "https://calendly.com/staymasterpro/demo"; // ← replace with your Calendly link
const CHATBOT_URL         = "https://chat.staymasterpro.com";
const CONTACT_EMAIL       = "sales@staymasterpro.com";

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
  initTrialModal();
  initDemoModal();
  initQuizModal();
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

// ---- Wire all CTA buttons ----
function wireButtons() {
  // Trial buttons → open trial modal
  ["nav-trial-btn","hero-trial-btn","trial-cta-btn","footer-trial-btn","hiw-trial-btn","sticky-trial-btn"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", e => { e.preventDefault(); openTrialModal(); });
  });

  // Demo buttons → open demo booking modal
  ["nav-demo-btn","hero-demo-btn","demo-schedule-btn","footer-demo-btn","contact-demo-btn","sticky-demo-btn"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", e => { e.preventDefault(); openDemoModal(); });
  });

  // AI buttons → open chat widget
  ["hero-ai-btn","ai-launch-btn","footer-ai-btn"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", e => {
      e.preventDefault();
      const panel = document.getElementById("chat-panel");
      if (panel) { panel.classList.add("open"); document.getElementById("chat-input")?.focus(); }
    });
  });

  // Contact Sales → scroll to contact + pre-fill Enterprise
  const contactSalesLinks = document.querySelectorAll('a[href="#contact"].pricing-btn, .pricing-btn[data-plan="enterprise"]');
  contactSalesLinks.forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      const section = document.getElementById("contact");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          const planSelect = document.querySelector('#contactForm [name="plan"]');
          if (planSelect) { planSelect.value = "enterprise"; planSelect.dispatchEvent(new Event("change")); }
        }, 600);
      }
    });
  });

  // Email links
  document.querySelectorAll('[id="sales-email-link"]').forEach(el => {
    el.href = `mailto:${CONTACT_EMAIL}`;
  });

  // Login link inside trial modal
  const loginLink = document.getElementById("trialLoginLink");
  if (loginLink) loginLink.href = APP_LOGIN_URL;

  // Onboarding call link inside trial success step
  const onboardingLink = document.getElementById("trialBookOnboarding");
  if (onboardingLink) onboardingLink.addEventListener("click", e => { e.preventDefault(); openDemoModal(); });
}

// ---- Free Trial Modal ----
function track(action, category, label) {
  if (typeof window.trackEvent === "function") window.trackEvent(action, category, label);
  if (typeof fbq === "function") fbq("track", action === "begin_checkout" ? "InitiateCheckout" : "Lead", { content_name: label });
}

function openTrialModal(plan) {
  track("begin_checkout", "Trial", plan || "unknown");
  const modal = new bootstrap.Modal(document.getElementById("trialModal"));
  goToTrialStep(1);
  if (plan) {
    sessionStorage.setItem("trialSelectedPlan", plan);
    goToTrialStep(2);
    setTimeout(() => selectTrialPlan(plan), 100);
  }
  modal.show();
}

function goToTrialStep(n) {
  [1,2,3].forEach(i => {
    document.getElementById(`trialStep${i}`)?.classList.toggle("d-none", i !== n);
    document.querySelector(`.trial-step[data-step="${i}"]`)?.classList.toggle("active", i <= n);
  });
  const bar = document.getElementById("quizProgressBar");
  if (bar) bar.style.width = `${(n/3)*100}%`;
}

function selectTrialPlan(plan) {
  document.querySelectorAll(".trial-plan-card").forEach(c => c.classList.toggle("selected", c.dataset.plan === plan));
  const btn = document.getElementById("trialStep2Next");
  if (btn) { btn.disabled = false; btn.dataset.plan = plan; }
}

function initTrialModal() {
  // Step 1 form submit
  const step1Form = document.getElementById("trialStep1Form");
  if (step1Form) {
    step1Form.addEventListener("submit", e => {
      e.preventDefault();
      if (!validateForm(step1Form)) return;
      goToTrialStep(2);
      lucide.createIcons();
    });
  }

  // Plan card selection
  document.querySelectorAll(".trial-plan-card").forEach(card => {
    card.addEventListener("click", () => selectTrialPlan(card.dataset.plan));
  });

  // Step 2 next
  const step2Btn = document.getElementById("trialStep2Next");
  if (step2Btn) {
    step2Btn.addEventListener("click", () => {
      goToTrialStep(3);
      const goBtn = document.getElementById("trialGoToApp");
      if (goBtn) { goBtn.href = APP_TRIAL_URL + "?plan=" + (step2Btn.dataset.plan || "growth"); goBtn.target = "_blank"; goBtn.rel = "noopener"; }
      lucide.createIcons();
    });
  }

  // Password visibility toggle
  const togglePwd = document.getElementById("toggleTrialPwd");
  const pwdInput  = document.getElementById("trialPassword");
  if (togglePwd && pwdInput) {
    togglePwd.addEventListener("click", () => {
      const show = pwdInput.type === "password";
      pwdInput.type = show ? "text" : "password";
      togglePwd.innerHTML = show
        ? '<i data-lucide="eye-off" style="width:18px;height:18px;"></i>'
        : '<i data-lucide="eye" style="width:18px;height:18px;"></i>';
      lucide.createIcons();
    });
  }

  // Password strength meter
  if (pwdInput) {
    pwdInput.addEventListener("input", () => {
      const v = pwdInput.value;
      let score = 0;
      if (v.length >= 8) score++;
      if (/[A-Z]/.test(v)) score++;
      if (/[0-9]/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      const fill  = document.getElementById("pwdFill");
      const label = document.getElementById("pwdLabel");
      const colors = ["#ff4d4d","#ff9800","#f4c95d","#00a6a6"];
      const labels = ["Weak","Fair","Good","Strong"];
      if (fill)  { fill.style.width = `${score*25}%`; fill.style.background = colors[score-1] || "#ddd"; }
      if (label) { label.textContent = v.length ? labels[score-1] || "" : ""; label.style.color = colors[score-1] || ""; }
    });
  }
}

// ---- Demo Booking Modal + Native Calendar ----
const calState = {
  year: null, month: null,        // currently displayed month
  availability: {},               // { "2026-06-25": [{slot, available},...] }
  selectedDate: null,
  selectedSlot: null,
  loading: false,
};

function initDemoModal() {
  // Tab switcher
  document.querySelectorAll(".demo-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".demo-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".demo-tab-panel").forEach(p => p.classList.add("d-none"));
      tab.classList.add("active");
      document.getElementById(`demoTab${tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)}`)?.classList.remove("d-none");
      lucide.createIcons();
    });
  });

  // Month nav
  document.getElementById("calPrevMonth")?.addEventListener("click", () => {
    let { year, month } = calState;
    month--;
    if (month < 0) { month = 11; year--; }
    calState.year = year; calState.month = month;
    loadCalendarMonth(year, month);
  });
  document.getElementById("calNextMonth")?.addEventListener("click", () => {
    let { year, month } = calState;
    month++;
    if (month > 11) { month = 0; year++; }
    calState.year = year; calState.month = month;
    loadCalendarMonth(year, month);
  });

  // Back buttons
  document.getElementById("calBackToDate")?.addEventListener("click", () => showBookingStep("date"));
  document.getElementById("calBackToSlot")?.addEventListener("click", () => showBookingStep("slot"));

  // Timezone label
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzEl = document.getElementById("calTzLabel");
    if (tzEl && tz) tzEl.textContent = tz.replace("_", " ");
  } catch(_) {}

  // Booking confirm form
  const confirmForm = document.getElementById("bookingConfirmForm");
  if (confirmForm) {
    confirmForm.querySelectorAll("[required]").forEach(field => {
      field.addEventListener("blur",  () => validateField(field));
      field.addEventListener("input", () => { if (field.classList.contains("is-invalid")) validateField(field); });
    });
    confirmForm.addEventListener("submit", async e => {
      e.preventDefault();
      if (!validateForm(confirmForm)) return;
      const btn = document.getElementById("confirmBookingBtn");
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Confirming…';

      const fd = new FormData(confirmForm);
      const payload = {
        fullName:      fd.get("fullName"),
        email:         fd.get("email"),
        phone:         fd.get("phone"),
        company:       fd.get("company"),
        numProperties: fd.get("numProperties"),
        date:          calState.selectedDate,
        slot:          calState.selectedSlot,
        timezone:      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
      };

      try {
        const res  = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          track("purchase", "Demo", `booking_confirmed_${data.confirmation}`);
          showBookingStep("success");
          document.getElementById("confirmDateDisplay").textContent = formatDate(data.date);
          document.getElementById("confirmTimeDisplay").textContent = formatSlot(data.slot);
          document.getElementById("confirmRefDisplay").textContent  = data.confirmation;
          lucide.createIcons();
          // Remove slot from availability so it shows as taken
          if (calState.availability[data.date]) {
            calState.availability[data.date] = calState.availability[data.date]
              .map(s => s.slot === data.slot ? { ...s, available: false } : s);
          }
        } else {
          showToast(data.message || "Booking failed. Please try another slot.");
          btn.disabled = false;
          btn.innerHTML = '<i data-lucide="calendar-check" class="btn-icon me-2" style="width:18px;height:18px;"></i>Confirm Booking';
          lucide.createIcons();
          if (res.status === 409) showBookingStep("slot"); // slot taken — go back
        }
      } catch (_) {
        showToast("Network error. Please try again.");
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="calendar-check" class="btn-icon me-2" style="width:18px;height:18px;"></i>Confirm Booking';
        lucide.createIcons();
      }
    });
  }

  // Demo request form (second tab)
  const demoReqForm = document.getElementById("demoRequestForm");
  if (demoReqForm) {
    demoReqForm.querySelectorAll("[required]").forEach(field => {
      field.addEventListener("blur",  () => validateField(field));
      field.addEventListener("input", () => { if (field.classList.contains("is-invalid")) validateField(field); });
    });
    demoReqForm.addEventListener("submit", e => {
      e.preventDefault();
      if (!validateForm(demoReqForm)) return;
      showToast("Demo request received! We'll call you within 2 business hours.");
      demoReqForm.reset();
      bootstrap.Modal.getInstance(document.getElementById("bookDemoModal"))?.hide();
    });
  }
}

function openDemoModal() {
  track("schedule", "Demo", "book_demo_opened");
  const modal = new bootstrap.Modal(document.getElementById("bookDemoModal"));
  modal.show();
  // Reset to step 1
  showBookingStep("date");
  // Load current month if not loaded
  const now = new Date();
  if (calState.year === null) {
    calState.year  = now.getFullYear();
    calState.month = now.getMonth();
  }
  loadCalendarMonth(calState.year, calState.month);
}

function showBookingStep(step) {
  const steps = { date: "bookingStepDate", slot: "bookingStepSlot", form: "bookingStepForm", success: "bookingStepSuccess" };
  Object.entries(steps).forEach(([k, id]) => {
    document.getElementById(id)?.classList.toggle("d-none", k !== step);
  });
  lucide.createIcons();
}

async function loadCalendarMonth(year, month) {
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const label = document.getElementById("calMonthLabel");
  if (label) label.textContent = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Prev month button: disable if current month
  const now = new Date();
  const prevBtn = document.getElementById("calPrevMonth");
  if (prevBtn) prevBtn.disabled = (year === now.getFullYear() && month <= now.getMonth());

  const grid = document.getElementById("calGrid");
  if (!grid) return;
  grid.innerHTML = '<div class="cal-loading"><span class="spinner-border spinner-border-sm text-secondary"></span></div>';

  try {
    const res  = await fetch(`/api/bookings/availability?month=${monthStr}`);
    const data = await res.json();
    if (data.success) {
      Object.assign(calState.availability, data.availability);
      renderCalendarGrid(year, month, data.availability);
    }
  } catch (_) {
    grid.innerHTML = '<p class="text-muted small text-center p-3">Could not load availability. Please try again.</p>';
  }
}

function renderCalendarGrid(year, month, availability) {
  const grid = document.getElementById("calGrid");
  if (!grid) return;

  const firstDay  = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  let html = "";
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const date    = new Date(year, month, d);
    const isPast  = date < today;
    const hasSlots = availability[dateStr] && availability[dateStr].some(s => s.available);

    let cls = "cal-cell";
    if (isPast || !hasSlots) cls += " cal-cell--disabled";
    else cls += " cal-cell--available";
    if (dateStr === calState.selectedDate) cls += " cal-cell--selected";

    html += `<div class="${cls}" data-date="${dateStr}">${d}</div>`;
  }

  grid.innerHTML = html;

  grid.querySelectorAll(".cal-cell--available").forEach(cell => {
    cell.addEventListener("click", () => {
      calState.selectedDate = cell.dataset.date;
      grid.querySelectorAll(".cal-cell--selected").forEach(c => c.classList.remove("cal-cell--selected"));
      cell.classList.add("cal-cell--selected");
      renderSlots(calState.selectedDate);
      showBookingStep("slot");
      lucide.createIcons();
    });
  });
}

function renderSlots(dateStr) {
  const slots = calState.availability[dateStr] || [];
  const label = document.getElementById("selectedDateLabel");
  if (label) label.textContent = formatDate(dateStr);

  const grid = document.getElementById("slotGrid");
  if (!grid) return;

  grid.innerHTML = slots.map(({ slot, available }) => {
    const cls = available ? "slot-btn" : "slot-btn slot-btn--taken";
    return `<button class="${cls}" data-slot="${slot}" ${!available ? "disabled" : ""}>${formatSlot(slot)}</button>`;
  }).join("");

  grid.querySelectorAll(".slot-btn:not([disabled])").forEach(btn => {
    btn.addEventListener("click", () => {
      calState.selectedSlot = btn.dataset.slot;
      grid.querySelectorAll(".slot-btn--selected").forEach(b => b.classList.remove("slot-btn--selected"));
      btn.classList.add("slot-btn--selected");
      const slotLabel = document.getElementById("selectedSlotLabel");
      if (slotLabel) slotLabel.textContent = `${formatDate(calState.selectedDate)} · ${formatSlot(calState.selectedSlot)}`;
      // Reset confirm form
      const form = document.getElementById("bookingConfirmForm");
      if (form) {
        form.reset();
        form.querySelectorAll(".is-invalid").forEach(f => f.classList.remove("is-invalid"));
        form.querySelectorAll(".field-error.visible").forEach(f => f.classList.remove("visible"));
        const btn2 = document.getElementById("confirmBookingBtn");
        if (btn2) { btn2.disabled = false; btn2.innerHTML = '<i data-lucide="calendar-check" class="btn-icon me-2" style="width:18px;height:18px;"></i>Confirm Booking'; }
      }
      showBookingStep("form");
      lucide.createIcons();
    });
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatSlot(slot) {
  if (!slot) return "";
  const [h, m] = slot.split(":").map(Number);
  const end = new Date(2000, 0, 1, h, m + 30);
  const fmt = t => t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${fmt(new Date(2000,0,1,h,m))} – ${fmt(end)}`;
}

// ---- Plan Recommendations Quiz ----
const quizAnswers = {};

function initQuizModal() {
  document.querySelectorAll(".quiz-option").forEach(btn => {
    btn.addEventListener("click", () => {
      const q = btn.dataset.q;
      const v = btn.dataset.v;
      quizAnswers[q] = v;

      // Highlight selection
      document.querySelectorAll(`.quiz-option[data-q="${q}"]`).forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");

      setTimeout(() => {
        if (q === "1") {
          document.getElementById("quizQ1").classList.add("d-none");
          document.getElementById("quizQ2").classList.remove("d-none");
          document.getElementById("quizProgressBar").style.width = "66%";
        } else if (q === "2") {
          document.getElementById("quizQ2").classList.add("d-none");
          showQuizResult();
        }
      }, 350);
    });
  });

  document.getElementById("quizRestartBtn")?.addEventListener("click", () => {
    quizAnswers["1"] = null; quizAnswers["2"] = null;
    document.querySelectorAll(".quiz-option").forEach(b => b.classList.remove("selected"));
    document.getElementById("quizQ3").classList.add("d-none");
    document.getElementById("quizQ1").classList.remove("d-none");
    document.getElementById("quizProgressBar").style.width = "33%";
  });

  document.getElementById("quizStartTrialBtn")?.addEventListener("click", e => {
    e.preventDefault();
    bootstrap.Modal.getInstance(document.getElementById("quizModal"))?.hide();
    const plan = document.getElementById("quizStartTrialBtn")?.dataset.plan || "growth";
    setTimeout(() => openTrialModal(plan), 300);
  });
}

function showQuizResult() {
  const props     = quizAnswers["1"] || "3-10";
  const challenge = quizAnswers["2"] || "bookings";

  let plan = "growth", price = "$149/mo", reason = "";

  if (props === "1-2") {
    plan = "starter"; price = "$49/mo";
    reason = "With 1–2 properties, Starter gives you everything you need — channel sync, automated messaging, and basic reporting — without overpaying.";
  } else if (props === "30+") {
    plan = "professional"; price = "$299/mo";
    reason = "Managing 30+ properties needs enterprise-grade tools: API access, white-label portal, and priority support. Professional is built for you.";
  } else if (challenge === "pricing") {
    plan = "growth"; price = "$149/mo";
    reason = "Growth includes dynamic pricing AI that automatically adjusts your rates to maximize revenue across all channels.";
  } else if (challenge === "reporting") {
    plan = "growth"; price = "$149/mo";
    reason = "Growth's owner portal and advanced analytics give you the financial visibility and reporting your owners expect.";
  } else if (challenge === "operations") {
    plan = "growth"; price = "$149/mo";
    reason = "Growth's operations hub automates cleaning schedules, maintenance tickets, and staff coordination across all your properties.";
  } else {
    plan = "growth"; price = "$149/mo";
    reason = "Growth is our most popular plan — it handles multi-channel booking, guest messaging, and owner reporting for growing portfolios.";
  }

  const planNames = { starter: "Starter", growth: "Growth", professional: "Professional" };
  document.getElementById("quizResultPlan").textContent = planNames[plan];
  document.getElementById("quizResultPrice").textContent = price;
  document.getElementById("quizResultReason").textContent = reason;
  document.getElementById("quizResultPlanInline").textContent = planNames[plan];
  const startBtn = document.getElementById("quizStartTrialBtn");
  if (startBtn) startBtn.dataset.plan = plan;

  document.getElementById("quizQ3").classList.remove("d-none");
  document.getElementById("quizProgressBar").style.width = "100%";
  lucide.createIcons();
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
      openTrialModal(btn.dataset.plan);
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
  if (demoBtn)  { demoBtn.addEventListener("click", e => { e.preventDefault(); openDemoModal(); }); }

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
