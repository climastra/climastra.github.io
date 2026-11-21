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
  // Each <form class="js-form"> is sent to Formspree (data-endpoint) in the
  // background. If that fails, the visitor gets an email link (data-mailto)
  // with everything filled in. data-kind picks the subject line and wording.
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

  document.querySelectorAll("form.js-form").forEach(function (form) {
    var kind = KINDS[form.getAttribute("data-kind")] || KINDS.enquiry;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var to = form.getAttribute("data-mailto");
      var endpoint = form.getAttribute("data-endpoint");
      var fb = form.querySelector(".form-feedback");
      var subject = kind.subject(d);
      var body = kind.fields.map(function (f) { return f[0] + ": " + (d.get(f[1]) || "—"); }).join("\n") +
        "\n\n" + (d.get("message") || "");
      var mailto = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      if (endpoint) {
        var btn = form.querySelector("[type=submit]");
        var label = btn ? btn.textContent : "";
        var failMsg = "Sorry, your " + kind.noun + " could not be sent. Please email us at <a href=\"" + mailto + "\">" + to + "</a>.";
        d.set("_subject", subject);   // email subject in Formspree
        d.set("_replyto", d.get("email"));
        if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
        fetch(endpoint, { method: "POST", body: d, headers: { Accept: "application/json" } })
          .then(function (r) {
            if (r.ok) {
              fb.innerHTML = "<strong>Thank you.</strong> " + kind.thanks + clean(d.get("email")) + ".";
              form.reset();
              return;
            }
            return r.json().catch(function () { return {}; }).then(function (j) {
              var detail = j && j.errors && j.errors.length ? " (" + clean(j.errors.map(function (x) { return x.message; }).join("; ")) + ")" : "";
              fb.innerHTML = failMsg + detail;
            });
          })
          .catch(function () { fb.innerHTML = failMsg; })
          .then(function () {
            fb.hidden = false;
            if (btn) { btn.disabled = false; btn.textContent = label; }
          });
        return;
      }
      window.location.href = mailto;
      fb.innerHTML = "<strong>Your email app should now open</strong> with your " + kind.noun + " filled in. Just press send. " +
        "If nothing opened, write to us directly at <a href=\"mailto:" + to + "\">" + to + "</a>.";
      fb.hidden = false;
    });
  });
})();
