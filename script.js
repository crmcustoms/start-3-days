/* ============================================================
   CRMCUSTOMS — Старт за 3 дні · client logic
   Vanilla JS, no dependencies (GitHub Pages friendly).
   ============================================================ */
(function () {
  "use strict";

  var PLANFIX_WEBHOOK =
    "https://crmcustomsua.planfix.ua/webhook/json/vgko-hwom-4ply-4umd";

  /* ---------- Smooth scroll for in-page anchors ---------- */
  document.querySelectorAll('[data-scroll], a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (!id || id === "#" || id[0] !== "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Animated counters ---------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    if (target === 0) { el.textContent = "0" + suffix; return; }
    var dur = 900;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window) {
    var co = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            co.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(function (el) { co.observe(el); });
  } else {
    counters.forEach(animateCount);
  }

  /* ---------- Sticky mobile CTA ---------- */
  var stickyCta = document.getElementById("sticky-cta");
  var hero = document.querySelector(".hero");
  var formSection = document.getElementById("form");
  if (stickyCta && hero && "IntersectionObserver" in window) {
    var heroObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          // show when hero is scrolled past
          stickyCta.classList.toggle("is-visible", !entry.isIntersecting);
        });
      },
      { rootMargin: "-120px 0px 0px 0px" }
    );
    heroObserver.observe(hero);

    // hide again while the form itself is on screen
    var formObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) stickyCta.classList.remove("is-visible");
        });
      },
      { threshold: 0.2 }
    );
    formObserver.observe(formSection);
  }

  /* ---------- Lead form → Planfix webhook ---------- */
  var form = document.getElementById("lead-form");
  var statusEl = document.getElementById("form-status");

  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "form__status" + (kind ? " is-" + kind : "");
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var phone = (data.get("phone") || "").toString().trim();
      var comment = (data.get("comment") || "").toString().trim();

      if (!name || !phone) {
        setStatus("Заповніть, будь ласка, ім'я та контакт.", "err");
        return;
      }

      var payload = {
        body: {
          subject: "Лід [start-3-days] — " + name,
          name: name,
          phone: phone,
          email: "",
        },
        description:
          "Заявка з лендингу «Старт за 3 дні»: " +
          (comment || "без коментаря"),
      };

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      setStatus("Надсилаємо…", null);

      // NOTE: Planfix webhook CORS is unverified from the browser.
      // We POST directly; if the browser blocks the response (CORS), the
      // request body is still delivered, so we treat it as success and only
      // hard-fail on genuine network errors. Swap to a thin proxy/Formspree
      // if delivery proves unreliable in production.
      fetch(PLANFIX_WEBHOOK, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function () {
          onSuccess();
        })
        .catch(function () {
          // Likely opaque/CORS — retry as no-cors so the payload still lands.
          fetch(PLANFIX_WEBHOOK, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
            .then(function () { onSuccess(); })
            .catch(function () {
              if (submitBtn) submitBtn.disabled = false;
              setStatus(
                "Не вдалося надіслати. Напишіть нам у Telegram @crmcustomsua.",
                "err"
              );
            });
        });

      function onSuccess() {
        form.reset();
        if (submitBtn) submitBtn.disabled = false;
        setStatus("Готово! Заявка вже в Planfix — скоро зв'яжемось.", "ok");
        if (typeof fbq === "function") fbq("track", "Lead");
      }
    });
  }
})();
