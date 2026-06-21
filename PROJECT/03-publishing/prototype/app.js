/* i-ONE Bank Global 프로토타입 — 이풍뎅(인터랙션/접근성)
   화면 라우팅 + 거래 플로우 + 상태(빈/로딩/오류/예외) + 키보드/스크린리더 대응.
   외부연동(정부24/유통시스템)은 mock. */
(function () {
  "use strict";
  var appbar = document.querySelector("[data-appbar]");
  var screens = Array.prototype.slice.call(document.querySelectorAll("[data-screen]"));
  var toastEl = document.getElementById("toast");
  var history = ["s0"];
  var state = { issued: false, certs: [], pendingCert: null, demo: {} };

  // 원본 보존(데모/리셋 복원용)
  var s1Body = document.querySelector("#s1 .body").innerHTML;
  var s3Body = document.querySelector("#s3 .body").innerHTML;

  function byId(id) { return document.getElementById(id); }

  /* ---------- 라우팅 ---------- */
  function renderAppbar(id) {
    if (id === "s0") {
      appbar.className = "appbar home";
      appbar.innerHTML =
        '<span class="brand">i-ONE Bank <small>Global</small></span>' +
        '<button class="lang" data-action="lang" aria-haspopup="listbox">EN ▾</button>' +
        '<button class="iconbtn" data-go="s8" aria-label="Customer center"><span aria-hidden="true">🎧</span></button>';
    } else {
      var title = (byId(id).getAttribute("data-title")) || "";
      appbar.className = "appbar";
      appbar.innerHTML =
        '<button class="iconbtn" data-action="back" aria-label="Go back"><span aria-hidden="true">‹</span></button>' +
        '<span class="title">' + title + "</span>";
    }
  }

  function show(id, opts) {
    opts = opts || {};
    screens.forEach(function (s) {
      var on = s.id === id;
      s.classList.toggle("active", on);
    });
    renderAppbar(id);
    if (!opts.noPush && history[history.length - 1] !== id) history.push(id);
    if (id === "s2") refreshWalletCount();
    if (id === "s6") renderStorage();
    // 포커스 이동(스크린리더가 새 화면을 인지)
    var target = byId(id);
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    target.scrollTop = 0;
  }

  function back() {
    if (history.length > 1) { history.pop(); show(history[history.length - 1], { noPush: true }); }
    else show("s0", { noPush: true });
  }

  /* ---------- 토스트 ---------- */
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  /* ---------- 화면별 동작 ---------- */
  function refreshWalletCount() {
    byId("s2-count").textContent = "You have " + state.certs.length + " certificate(s).";
  }

  function renderStorage() {
    var list = byId("s6-list"), empty = byId("s6-empty");
    list.innerHTML = "";
    if (state.demo.s6empty || state.certs.length === 0) {
      list.hidden = true; empty.hidden = false; return;
    }
    list.hidden = false; empty.hidden = true;
    state.certs.forEach(function (c, i) {
      var li = document.createElement("li");
      li.innerHTML =
        '<button class="listitem" data-open="' + i + '">' +
          '<span class="cert"><span class="ico" aria-hidden="true">📄</span>' +
          '<span><span class="name">' + c.name + "</span><br>" +
          '<span class="caption">Issued ' + c.date + "</span></span></span>" +
          '<span class="badge ' + (c.expired ? "warn" : "ok") + '">' + (c.expired ? "Expired" : "Valid") + "</span>" +
        "</button>";
      list.appendChild(li);
    });
  }

  function openDetail(idx) {
    var c = state.certs[idx]; if (!c) return;
    byId("s7-name").textContent = c.name;
    byId("s7-date").textContent = c.date;
    byId("s7-expired").hidden = !c.expired;
    byId("s7-submit").disabled = !!c.expired;
    show("s7");
  }

  function s3Loading() {
    var box = document.querySelector("#s3 .body");
    box.innerHTML =
      '<ol class="steps"><li class="active" data-n="1">List</li><li data-n="2">Request</li><li data-n="3">Done</li></ol>' +
      '<h2 class="section-title">Available certificates</h2>' +
      '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    show("s3");
    setTimeout(function () { document.querySelector("#s3 .body").innerHTML = s3Body; }, 1400);
  }

  function s3Error() {
    var box = document.querySelector("#s3 .body");
    box.innerHTML =
      '<ol class="steps"><li class="active" data-n="1">List</li><li data-n="2">Request</li><li data-n="3">Done</li></ol>' +
      '<div class="status error"><div class="glyph" aria-hidden="true">!</div>' +
      "<h3>Issuing agency under maintenance</h3>" +
      '<p class="muted">The government service is temporarily unavailable.</p>' +
      '<button class="btn primary" style="max-width:200px;margin:8px auto 0" data-action="s3-retry">Retry</button></div>';
    show("s3");
  }

  /* ---------- 이벤트 위임 ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-go],[data-action],[data-cert],[data-open],[data-auth],[data-demo]");
    if (!t) return;

    if (t.hasAttribute("data-go")) {
      var dest = t.getAttribute("data-go");
      if (dest === "wallet-entry") return show(state.issued ? "s2" : "s1");
      return show(dest);
    }
    if (t.hasAttribute("data-open")) return openDetail(parseInt(t.getAttribute("data-open"), 10));
    if (t.hasAttribute("data-cert")) {
      state.pendingCert = t.getAttribute("data-cert");
      byId("s4-name").textContent = state.pendingCert;
      byId("s4-error").hidden = true;
      byId("s4-terms").checked = false; byId("s4-cta").disabled = true;
      return show("s4");
    }
    if (t.hasAttribute("data-auth")) {
      document.querySelectorAll("[data-auth]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      t.setAttribute("aria-pressed", "true");
      return;
    }
    if (t.hasAttribute("data-demo")) {
      var d = t.getAttribute("data-demo");
      if (d === "s3-loading") { state.demo = {}; return s3Loading(); }
      if (d === "s3-error") { return s3Error(); }
      if (d === "s4-fail") { state.demo.s4fail = true; state.pendingCert = state.pendingCert || "Certificate of Alien Registration";
        byId("s4-name").textContent = state.pendingCert; return show("s4"); }
      if (d === "s6-empty") { state.demo.s6empty = true; return show("s6"); }
      if (d === "s7-expired") { state.certs.push({ name: "Certificate of Entry & Exit", date: today(), expired: true });
        return openDetail(state.certs.length - 1); }
      return;
    }

    var action = t.getAttribute("data-action");
    switch (action) {
      case "back": return back();
      case "lang": return toast("Language: EN / 中文 / Tiếng Việt (demo)");
      case "stub": return toast("Coming soon");
      case "email": return toast("Opening email app (mock)");
      case "download": return toast("Downloaded to device (mock)");
      case "submit":
        return toast("Certificate submitted (mock)");
      case "no-cert":
        document.querySelector("#s1 .body").innerHTML =
          '<div class="status"><div class="glyph" aria-hidden="true">🔐</div>' +
          "<h3>No certificate found</h3>" +
          '<p class="muted">A Joint or IBK certificate is required. Financial Certificate is not supported.</p>' +
          '<button class="btn primary" style="max-width:240px;margin:8px auto 0" data-action="how-cert">How to get a certificate</button></div>';
        return;
      case "how-cert": return toast("External guide (mock)");
      case "issue":
        t.disabled = true; t.textContent = "Authenticating…";
        return setTimeout(function () {
          state.issued = true; t.textContent = "Issue & Authenticate";
          toast("Wallet issued"); show("s2");
        }, 900);
      case "request":
        if (state.demo.s4fail) {
          byId("s4-error").hidden = false; state.demo.s4fail = false;
          return;
        }
        t.disabled = true; t.textContent = "Authenticating…";
        return setTimeout(function () {
          t.textContent = "Request & Authenticate"; t.disabled = false;
          var cert = { name: state.pendingCert, date: today(), expired: false };
          state.certs.push(cert);
          byId("s5-receipt").textContent = "GLB-" + Math.floor(100000 + Math.random() * 899999);
          byId("s5-name").textContent = cert.name;
          byId("s5-date").textContent = cert.date;
          show("s5");
        }, 900);
      case "s3-retry":
        document.querySelector("#s3 .body").innerHTML = s3Body; return toast("Reloaded");
      case "reset":
        state = { issued: false, certs: [], pendingCert: null, demo: {} };
        document.querySelector("#s1 .body").innerHTML = s1Body;
        document.querySelector("#s3 .body").innerHTML = s3Body;
        history = ["s0"]; return show("s0", { noPush: true });
    }
  });

  /* 약관 체크 → CTA 활성화 */
  document.addEventListener("change", function (e) {
    if (e.target.id === "s1-terms") byId("s1-cta").disabled = !e.target.checked;
    if (e.target.id === "s4-terms") byId("s4-cta").disabled = !e.target.checked;
  });

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // 초기 화면
  show("s0", { noPush: true });
})();
