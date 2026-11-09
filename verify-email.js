/* PopupLoom email verification page.
 * The token is read from the URL fragment, kept only in this closure and
 * stripped from the address bar. It is sent once to /api/auth/verify-email.
 */
(function () {
  "use strict";

  var TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
  var token = "";
  var working = document.getElementById("workingPanel");
  var done = document.getElementById("donePanel");
  var error = document.getElementById("errorPanel");
  var errorText = document.getElementById("errorText");
  var statusEl = document.getElementById("verifyStatus");

  function setStatus(message, kind) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.className = "reset-status" + (kind ? " " + kind : "");
    statusEl.hidden = !message;
  }

  function show(panel) {
    [working, done, error].forEach(function (el) { if (el) el.hidden = el !== panel; });
  }

  function readFragmentToken() {
    var raw = window.location.hash ? window.location.hash.slice(1) : "";
    if (!raw) return false;
    var candidate = "";
    try { candidate = new URLSearchParams(raw).get("token") || ""; } catch (e) { candidate = ""; }
    var valid = TOKEN_RE.test(candidate);
    if (valid) token = candidate;
    try { window.history.replaceState(null, "", window.location.pathname + window.location.search); } catch (e) {}
    return valid;
  }

  async function verify() {
    if (!TOKEN_RE.test(token)) {
      show(error);
      setStatus("This verification link is invalid or has expired. Sign in or reset your password.", "error");
      return;
    }
    try {
      var response = await fetch(PF.apiBase + "/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token })
      });
      var data = {};
      try { data = await response.json(); } catch (e) { data = {}; }
      if (!response.ok || !data.token) {
        show(error);
        if (errorText) errorText.textContent = data.error || "This verification link is invalid or has expired.";
        setStatus(data.error || "This verification link is invalid or has expired.", "error");
        return;
      }
      try { localStorage.setItem("pf.token", data.token); } catch (e) {}
      token = "";
      show(done);
      setStatus(data.message || "Email verified. You are signed in.", "ok");
    } catch (e) {
      show(error);
      if (errorText) errorText.textContent = "Could not reach the server. Check your connection and try again.";
      setStatus("Could not reach the server. Check your connection and try again.", "error");
    }
  }

  var hadFragment = !!(window.location.hash && window.location.hash.length > 1);
  var valid = readFragmentToken();
  if (!valid) {
    show(error);
    setStatus(hadFragment ? "This verification link is invalid or has expired." : "Open the verification link from your email to continue.", hadFragment ? "error" : "");
  } else {
    verify();
  }
})();
