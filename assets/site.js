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
  // ---- Products & Services: pillar filter tabs ----------------------------
  var filters = document.querySelectorAll(".filter-btn");
  var cards = document.querySelectorAll("[data-category]");
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
  // Deep links like /products-services/#geohazard show that pillar
  if (filters.length && location.hash) {
    var h = location.hash.slice(1);
    var match = document.querySelector('.filter-btn[data-filter="' + h + '"]');
    if (match) applyFilter(h);
  }

  // ---- Contact form ---------------------------------------------------------
  // GitHub Pages has no server, so the form opens the visitor's email app with
  // the enquiry filled in. To receive submissions without email apps, point
  // the form's data-endpoint at a form service (e.g. Formspree) — see README.
  var form = document.getElementById("contact-form");
  if (!form) return;
  var params = new URLSearchParams(location.search);
  var topics = {
    "capability-deck": "Request: CLIMASTRA capability deck",
    "sample-methodology": "Request: sample methodology note",
    "technical-report": "Request: full technical brief",
    "careers": "Careers / internship enquiry",
    "collaboration": "Research collaboration"
  };
  var topic = params.get("topic");
  var subjectField = form.querySelector("[name=subject]");
  if (topic && topics[topic] && subjectField) subjectField.value = topics[topic];
  var brief = params.get("brief");
  var scope = form.querySelector("[name=scope]");
  if (brief && scope && !scope.value) scope.value = "Regarding the brief: " + brief + "\n\n";

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(form);
    var to = form.getAttribute("data-mailto");
    var endpoint = form.getAttribute("data-endpoint");
    var fb = document.getElementById("form-feedback");
    var subject = (d.get("subject") || "Project enquiry") + " — " + d.get("name");
    var body =
      "Name: " + d.get("name") + "\n" +
      "Email: " + d.get("email") + "\n" +
      "Organisation type: " + d.get("orgtype") + "\n" +
      "Service area: " + d.get("pillar") + "\n\n" +
      d.get("scope");
    if (endpoint) {
      fetch(endpoint, { method: "POST", body: d, headers: { Accept: "application/json" } })
        .then(function (r) {
          fb.innerHTML = r.ok
            ? "<strong>Thank you.</strong> Your enquiry has been sent to the CLIMASTRA team."
            : "Sorry, sending failed. Please email us at <a href=\"mailto:" + to + "\">" + to + "</a>.";
          fb.hidden = false;
          if (r.ok) form.reset();
        })
        .catch(function () {
          fb.innerHTML = "Sorry, sending failed. Please email us at <a href=\"mailto:" + to + "\">" + to + "</a>.";
          fb.hidden = false;
        });
      return;
    }
    window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    fb.innerHTML = "<strong>Your email app should now open</strong> with the enquiry filled in — just press send. " +
      "If nothing opened, write to us directly at <a href=\"mailto:" + to + "\">" + to + "</a>.";
    fb.hidden = false;
  });
})();
