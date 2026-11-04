/* PopupLoom password reset page.
 * The token is read from the URL fragment, kept only in this closure, and
 * stripped from the address bar. It is never stored, logged or sent anywhere
 * except the single POST to /api/auth/reset-password.
 */
(function () {
  "use strict";

  var TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
  var token = "";
  var requestPanel = document.getElementById("requestPanel");
  var resetPanel = document.getElementById("resetPanel");
  var donePanel = document.getElementById("donePanel");
  var statusEl = document.getElementById("resetStatus");
  var requestForm = document.getElementById("requestForm");
  var resetForm = document.getElementById("resetForm");
  var requestSubmit = document.getElementById("requestSubmit");
  var resetSubmit = document.getElementById("resetSubmit");

  function setStatus(message, kind) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.className = "reset-status" + (kind ? " " + kind : "");
    statusEl.hidden = !message;
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    button.disabled = !!busy;
    if (busy) button.setAttribute("aria-busy", "true");
    else button.removeAttribute("aria-busy");
    if (label) button.textContent = label;
  }

  function readFragmentToken() {
    var raw = window.location.hash ? window.location.hash.slice(1) : "";
    if (!raw) return false;
    var candidate = "";
    try { candidate = new URLSearchParams(raw).get("token") || ""; } catch (e) { candidate = ""; }
    var valid = TOKEN_RE.test(candidate);
    if (valid) token = candidate;
    // Remove the fragment (and any other fragment data) from history and the
    // address bar. The token never reaches a Referer header either way.
    try { window.history.replaceState(null, "", window.location.pathname + window.location.search); } catch (e) {}
    return valid;
  }

  async function postJson(path, body) {
    var response = await fetch(PF.apiBase + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    var data = {};
    try { data = await response.json(); } catch (e) { data = {}; }
    return { ok: response.ok, status: response.status, data: data };
  }

  async function submitRequest(event) {
    if (event) event.preventDefault();
    var emailEl = document.getElementById("resetEmail");
    var email = (emailEl && emailEl.value || "").trim();
    if (!email) { setStatus("Enter your email address.", "error"); if (emailEl) emailEl.focus(); return; }
    setStatus("");
    setBusy(requestSubmit, true, "Sending…");
    try {
      var result = await postJson("/api/auth/forgot-password", { email: email });
      if (result.status === 429) {
        setStatus("Too many requests. Wait a few minutes and try again.", "error");
      } else if (!result.ok) {
        setStatus(result.data.error || "Could not send the reset link. Try again later.", "error");
      } else {
        setStatus(result.data.message || "If an account exists for that email, a reset link is on its way.", "ok");
        if (emailEl) emailEl.value = "";
      }
    } catch (e) {
      setStatus("Could not reach the server. Check your connection and try again.", "error");
    } finally {
      setBusy(requestSubmit, false, "Send reset link");
    }
  }

  async function submitReset(event) {
    if (event) event.preventDefault();
    var passwordEl = document.getElementById("newPassword");
    var confirmEl = document.getElementById("confirmPassword");
    var password = passwordEl ? passwordEl.value : "";
    var confirmation = confirmEl ? confirmEl.value : "";
    if (!TOKEN_RE.test(token)) {
      showRequestPanel("This password reset link is invalid or has expired. Request a new one.", "error");
      return;
    }
    if (password.length < 12) { setStatus("Password must be at least 12 characters.", "error"); if (passwordEl) passwordEl.focus(); return; }
    if (password !== confirmation) { setStatus("New passwords do not match.", "error"); if (confirmEl) confirmEl.focus(); return; }
    setStatus("");
    setBusy(resetSubmit, true, "Saving…");
    try {
      var result = await postJson("/api/auth/reset-password", { token: token, password: password });
      if (result.status === 429) {
        setStatus("Too many requests. Wait a few minutes and try again.", "error");
      } else if (!result.ok) {
        setStatus(result.data.error || "This password reset link is invalid or has expired. Request a new one.", "error");
      } else {
        token = "";
        if (passwordEl) passwordEl.value = "";
        if (confirmEl) confirmEl.value = "";
        if (resetPanel) resetPanel.hidden = true;
        if (donePanel) donePanel.hidden = false;
        setStatus(result.data.message || "Your password has been reset. Sign in with your new password.", "ok");
      }
    } catch (e) {
      setStatus("Could not reach the server. Check your connection and try again.", "error");
    } finally {
      setBusy(resetSubmit, false, "Set new password");
    }
  }

  function showRequestPanel(message, kind) {
    token = "";
    if (resetPanel) resetPanel.hidden = true;
    if (donePanel) donePanel.hidden = true;
    if (requestPanel) requestPanel.hidden = false;
    setStatus(message || "", kind);
  }

  function showResetPanel() {
    if (requestPanel) requestPanel.hidden = true;
    if (donePanel) donePanel.hidden = true;
    if (resetPanel) resetPanel.hidden = false;
    var passwordEl = document.getElementById("newPassword");
    if (passwordEl) setTimeout(function () { try { passwordEl.focus(); } catch (e) {} }, 40);
  }

  var hadFragment = !!(window.location.hash && window.location.hash.length > 1);
  var validToken = readFragmentToken();
  if (validToken) showResetPanel();
  else if (hadFragment) showRequestPanel("This password reset link is invalid or has expired. Request a new one.", "error");

  if (requestForm) requestForm.addEventListener("submit", submitRequest);
  if (resetForm) resetForm.addEventListener("submit", submitReset);

  // A link to this page from the login form starts on the request panel.
  window.PFReset = {
    hasToken: function () { return TOKEN_RE.test(token); }
  };
})();
