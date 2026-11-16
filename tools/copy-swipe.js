/* tools/copy-swipe.js — copy buttons for the popup copy swipe file.
   The pattern text is already visible in the page; this script only adds a
   convenience button and never changes the source copy. */
(function () {
  "use strict";

  var buttons = document.querySelectorAll("button[data-copy-target]");
  if (!buttons.length) return;

  function selectFallback(text, done, failed) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      var copied = document.execCommand("copy");
      document.body.removeChild(area);
      if (copied) done();
      else failed();
    } catch (error) {
      document.body.removeChild(area);
      failed();
    }
  }

  function flash(button, label) {
    if (button.dataset.timer) window.clearTimeout(Number(button.dataset.timer));
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.textContent = label;
    button.dataset.timer = String(window.setTimeout(function () {
      button.textContent = button.dataset.label;
    }, 1600));
  }

  for (var i = 0; i < buttons.length; i += 1) {
    (function (button) {
      button.addEventListener("click", function () {
        var target = document.getElementById(button.getAttribute("data-copy-target"));
        if (!target) return;
        var text = target.textContent;
        var done = function () { flash(button, "Copied"); };
        var failed = function () { flash(button, "Select the text to copy"); };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () {
            selectFallback(text, done, failed);
          });
          return;
        }
        selectFallback(text, done, failed);
      });
    })(buttons[i]);
  }
})();
