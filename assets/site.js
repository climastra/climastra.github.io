// CLIMASTRA site interactions (no dependencies)

// ---- Analytics consent (DPDP Act 2023 / DPDP Rules 2025) -------------------
// Opt-in only: Google Tag Manager loads after "Accept analytics" (see
// _partials/head-consent.html). The choice is stored in this browser with a
// timestamp and policy version, and can be withdrawn as easily as it was given.
(function () {
  var KEY = "climastra-consent";
  var POLICY_VERSION = "2026-11-16";
  var banner = document.getElementById("consent-banner");
  if (!banner) return;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function save(v) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ analytics: v, at: new Date().toISOString(), policy: POLICY_VERSION }));
    } catch (e) {}
  }
  function clearGaCookies() {
    var host = location.hostname, parts = host.split(".");
    var domains = ["", host, "." + host, "." + parts.slice(-2).join(".")];
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (/^(_ga|_gid|_gat|_gcl)/.test(name)) {
        domains.forEach(function (d) {
          document.cookie = name + "=; Max-Age=0; path=/" + (d ? "; domain=" + d : "");
        });
      }
    });
  }
  function show() { banner.hidden = false; }
  function hide() { banner.hidden = true; }

  var current = read();
  if (!current || current.policy !== POLICY_VERSION) show();

  banner.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-consent]");
    if (!btn) return;
    var choice = btn.getAttribute("data-consent");
    var was = read();
    save(choice);
    hide();
    if (choice === "granted") {
      if (window.climastraLoadGTM) window.climastraLoadGTM();
    } else {
      if (window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" });
      clearGaCookies();
      // If analytics was running on this page, reload so Google's script stops.
      if (was && was.analytics === "granted") location.reload();
    }
  });
  document.querySelectorAll("[data-consent-open]").forEach(function (b) {
    b.addEventListener("click", show);
  });
})();

(function () {
  // ---- Products & Services: area-of-expertise filter tabs ----------------------------
  var filters = document.querySelectorAll(".filter-btn");
  var cards = document.querySelectorAll(".expertise-cards [data-category]");
  function applyFilter(f) {
    filters.forEach(function (b) {
      var on = b.getAttribute("data-filter") === f;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    cards.forEach(function (c) {
      c.classList.toggle("is-hidden", !(f === "all" || c.getAttribute("data-category") === f));
    });
  }
  filters.forEach(function (b) {
    b.addEventListener("click", function () { applyFilter(b.getAttribute("data-filter")); });
  });
  // Deep links like /products-services/#geohazard show that area of expertise
  function filterFromHash() {
    var h = location.hash.slice(1);
    if (!filters.length || !h) return;
    var match = document.querySelector('.filter-btn[data-filter="' + h + '"]');
    applyFilter(match ? h : "all");   // e.g. #gis (foundation band): show everything
    var target = document.getElementById(h);
    if (target) target.scrollIntoView();
  }
  filterFromHash();
  window.addEventListener("hashchange", filterFromHash);

  // ---- Forms (Contact enquiry, Careers application) -------------------------
  // Each <form class="js-form"> is sent to Un-static in the background, with a
  // Cloudflare Turnstile check (settings in _data/forms.yml). If that fails, the
  // visitor gets an email link (data-mailto) with everything filled in.
  // data-kind picks the subject line and wording.
  var params = new URLSearchParams(location.search);
  var contact = document.getElementById("contact-form");
  if (contact) {
    var topics = {
      "sample-methodology": "Request: sample methodology note",
      "technical-report": "Request: full technical brief",
      "careers": "Careers / internship enquiry",
      "collaboration": "Research collaboration"
    };
    var topic = params.get("topic");
    var subjectField = contact.querySelector("[name=subject]");
    if (topic && topics[topic] && subjectField) subjectField.value = topics[topic];
    var brief = params.get("brief");
    var scope = contact.querySelector("[name=message]");
    if (brief && scope && !scope.value) scope.value = "Regarding the brief: " + brief + "\n\n";
  }

  var KINDS = {
    enquiry: {
      subject: function (d) { return (d.get("subject") || "Project enquiry") + " — " + d.get("name"); },
      fields: [["Name", "name"], ["Email", "email"], ["Organisation type", "organisation_type"], ["Service area", "service_area"]],
      thanks: "Your enquiry has reached the CLIMASTRA team. We'll reply to ",
      noun: "enquiry"
    },
    careers: {
      subject: function (d) { return "Careers: " + d.get("opportunity") + " — " + d.get("name"); },
      fields: [["Name", "name"], ["Email", "email"], ["Discipline", "discipline"], ["Looking for", "opportunity"], ["CV link", "cv_link"], ["Consent", "consent"]],
      thanks: "Your application has reached the CLIMASTRA team. We'll be in touch at ",
      noun: "application"
    }
  };
  function clean(v) { return String(v == null ? "" : v).replace(/[<>&"]/g, ""); }

  // Settings for each form come from the hidden marker printed just before it by
  // the form-switch shortcode (_data/forms.yml): Un-static address + Turnstile key.
  function settingsFor(form) {
    var el = form.previousElementSibling;
    while (el && !(el.classList && el.classList.contains("form-switch"))) el = el.previousElementSibling;
    return el ? { endpoint: el.getAttribute("data-endpoint") || "", sitekey: el.getAttribute("data-sitekey") || "" } : { endpoint: "", sitekey: "" };
  }

  // Cloudflare Turnstile (spam protection), loaded only on pages with a live form
  var tsQueue = [], tsLoading = false;
  function withTurnstile(cb) {
    if (window.turnstile) return cb(window.turnstile);
    tsQueue.push(cb);
    if (tsLoading) return;
    tsLoading = true;
    window.climastraTurnstileReady = function () { tsQueue.splice(0).forEach(function (f) { f(window.turnstile); }); };
    var sc = document.createElement("script");
    sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=climastraTurnstileReady";
    sc.async = true; sc.defer = true;
    document.head.appendChild(sc);
  }

  document.querySelectorAll("form.js-form").forEach(function (form) {
    var kind = KINDS[form.getAttribute("data-kind")] || KINDS.enquiry;
    var cfg = settingsFor(form);
    if (cfg.endpoint) form.setAttribute("action", cfg.endpoint);
    var widget = null;
    if (cfg.endpoint && cfg.sitekey) {
      var box = document.createElement("div");
      box.className = "ts-box";
      var row = form.querySelector(".form-row");
      form.insertBefore(box, row);
      withTurnstile(function (ts) {
        widget = ts.render(box, { sitekey: cfg.sitekey, theme: "dark", size: "flexible" });
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var to = form.getAttribute("data-mailto");
      var fb = form.querySelector(".form-feedback");
      var subject = kind.subject(d);
      var body = kind.fields.map(function (f) { return f[0] + ": " + (d.get(f[1]) || "—"); }).join("\n") +
        "\n\n" + (d.get("message") || "");
      var mailto = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

      if (!cfg.endpoint) {   // no form service configured: open the visitor's email app
        window.location.href = mailto;
        fb.innerHTML = "<strong>Your email app should now open</strong> with your " + kind.noun + " filled in. Just press send. " +
          "If nothing opened, write to us directly at <a href=\"mailto:" + to + "\">" + to + "</a>.";
        fb.hidden = false;
        return;
      }
      if (cfg.sitekey && !d.get("cf-turnstile-response")) {
        fb.innerHTML = "Please complete the security check just above the button, then send again.";
        fb.hidden = false;
        return;
      }

      // Un-static AJAX endpoint expects JSON at <form address>/ajax
      var payload = {};
      d.forEach(function (v, k) { if (typeof v === "string") payload[k] = v; });
      payload.subject = subject;
      var btn = form.querySelector("[type=submit]");
      var label = btn ? btn.textContent : "";
      var failMsg = "Sorry, your " + kind.noun + " could not be sent. Please email us at <a href=\"" + mailto + "\">" + to + "</a>.";
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      fetch(cfg.endpoint.replace(/\/$/, "") + "/ajax", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          if (r.ok) {
            fb.innerHTML = "<strong>Thank you.</strong> " + kind.thanks + clean(d.get("email")) + ".";
            form.reset();
            return;
          }
          return r.text().then(function (t) {
            var detail = "";
            try { var j = JSON.parse(t); detail = j.message || j.error || (j.errors && j.errors.join ? j.errors.join("; ") : ""); } catch (err) {}
            fb.innerHTML = failMsg + (detail ? " (" + clean(detail) + ")" : "");
          });
        })
        .catch(function () { fb.innerHTML = failMsg; })
        .then(function () {
          fb.hidden = false;
          if (btn) { btn.disabled = false; btn.textContent = label; }
          if (widget !== null && window.turnstile) window.turnstile.reset(widget);   // tokens are single-use
        });
    });
  });
})();
