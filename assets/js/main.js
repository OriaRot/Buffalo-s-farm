// חוות הבופאלו – סקריפט ראשי
(function () {
  "use strict";

  var WHATSAPP_NUMBER = "972542490141";

  document.documentElement.classList.remove("no-js");

  // ---------- Header: solid on scroll ----------
  var header = document.querySelector(".site-header");
  if (header && !header.classList.contains("is-static")) {
    var onScroll = function () {
      header.classList.toggle("is-solid", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // ---------- Mobile menu ----------
  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    var setOpen = function (open) {
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "סגירת תפריט" : "פתיחת תפריט");
    };
    toggle.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("nav-open"));
    });
    document.querySelectorAll(".main-nav a").forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  // ---------- Store hours & open status (Israel time) ----------
  // 0 = Sunday ... 6 = Saturday; times in minutes from midnight
  var HOURS = {
    0: [510, 1020], 1: [510, 1020], 2: [510, 1020], 3: [510, 1020], 4: [510, 1020],
    5: [510, 840],
    6: null
  };
  var DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

  function israelNow() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(map.weekday);
    return { day: day, minutes: parseInt(map.hour, 10) * 60 + parseInt(map.minute, 10) };
  }

  function fmt(m) {
    var h = Math.floor(m / 60), mm = m % 60;
    return h + ":" + (mm < 10 ? "0" : "") + mm;
  }

  function statusText(now) {
    var today = HOURS[now.day];
    if (today && now.minutes >= today[0] && now.minutes < today[1]) {
      return { open: true, text: "החנות פתוחה עכשיו · עד " + fmt(today[1]) };
    }
    if (today && now.minutes < today[0]) {
      return { open: false, text: "סגור כרגע · נפתח היום ב-" + fmt(today[0]) };
    }
    for (var i = 1; i <= 7; i++) {
      var d = (now.day + i) % 7;
      if (HOURS[d]) {
        var when = i === 1 ? "מחר" : "ביום " + DAY_NAMES[d];
        return { open: false, text: "סגור כרגע · נפתח " + when + " ב-" + fmt(HOURS[d][0]) };
      }
    }
    return { open: false, text: "" };
  }

  try {
    var now = israelNow();
    var status = statusText(now);
    document.querySelectorAll("[data-open-status]").forEach(function (el) {
      el.classList.add(status.open ? "is-open" : "is-closed");
      var label = el.querySelector(".status-text");
      if (label) label.textContent = status.text;
      el.hidden = false;
    });
    document.querySelectorAll(".hours tr[data-days]").forEach(function (tr) {
      var days = tr.getAttribute("data-days").split(",").map(Number);
      if (days.indexOf(now.day) !== -1) tr.classList.add("is-today");
    });
  } catch (e) { /* Intl not supported – status pill stays hidden */ }

  // ---------- Booking form → WhatsApp ----------
  document.querySelectorAll("form[data-whatsapp-form]").forEach(function (form) {
    var dateInput = form.querySelector('input[type="date"]');
    if (dateInput) {
      var t = new Date();
      dateInput.min = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var error = form.querySelector(".form-error");
      var data = new FormData(form);
      var name = (data.get("name") || "").trim();
      var phone = (data.get("phone") || "").trim();
      if (!name || !phone) {
        if (error) error.textContent = "נא למלא שם וטלפון כדי שנוכל לחזור אליכם.";
        (name ? form.phone : form.name).focus();
        return;
      }
      if (error) error.textContent = "";

      var dateStr = "";
      if (data.get("date")) {
        var p = String(data.get("date")).split("-");
        dateStr = p[2] + "/" + p[1] + "/" + p[0];
      }
      var lines = [
        "שלום חוות הבופאלו!",
        "אשמח לתאם ביקור:",
        "",
        "• שם: " + name,
        "• טלפון: " + phone,
        "• סוג הביקור: " + (data.get("type") || "—")
      ];
      if (dateStr) lines.push("• תאריך מבוקש: " + dateStr);
      if (data.get("people")) lines.push("• מספר משתתפים: " + data.get("people"));
      if ((data.get("notes") || "").trim()) lines.push("• הערות: " + data.get("notes").trim());

      var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
      window.open(url, "_blank", "noopener");
    });
  });

  // Pre-select booking type from links like visit.html?type=workshop#book
  var typeParam = new URLSearchParams(location.search).get("type");
  if (typeParam) {
    var opt = document.querySelector('form[data-whatsapp-form] option[data-key="' + typeParam + '"]');
    if (opt) opt.selected = true;
  }
  document.querySelectorAll("[data-book-type]").forEach(function (a) {
    a.addEventListener("click", function () {
      var o = document.querySelector('form[data-whatsapp-form] option[data-key="' + a.getAttribute("data-book-type") + '"]');
      if (o) o.selected = true;
    });
  });

  // ---------- Reveal on scroll ----------
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  // ---------- Category chips: highlight current section ----------
  var chipLinks = document.querySelectorAll(".chips a[href^='#']");
  if (chipLinks.length && "IntersectionObserver" in window) {
    var chipFor = {};
    chipLinks.forEach(function (a) { chipFor[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        chipLinks.forEach(function (a) { a.classList.remove("is-active"); });
        var active = chipFor[entry.target.id];
        if (active) {
          active.classList.add("is-active");
          var list = active.closest("ul");
          var li = active.parentElement;
          list.scrollLeft = li.offsetLeft - (list.clientWidth - li.offsetWidth) / 2;
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(chipFor).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  }

  // ---------- Footer year ----------
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
