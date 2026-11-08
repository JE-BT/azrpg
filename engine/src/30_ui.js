// =============================================================================================
// 30_ui.js · Alpha 7: windows in the RPG Maker manner.
//   say() is the message box (a name plate, pages, ▼ to go on); choose() is a command window: a
//   cursor that moves with the arrow keys, a detail column, and a help line that describes the
//   option under the cursor. Both return promises, so scenes read as straight-line scripts, and
//   both wait their turn if another window is open. The libraries call only say, choose, toast,
//   banner and busy.
// =============================================================================================
AZ.hhmm = h => { h = ((h % 24) + 24) % 24; const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`; };
AZ.tod = h => (h < 4 ? "night" : h < 7 ? "early morning" : h < 11 ? "morning" : h < 13 ? "midday" : h < 16 ? "afternoon" : h < 18 ? "late afternoon" : h < 21 ? "evening" : "night");
AZ.dayWords = t => `Day ${Math.floor(t / 24) + 1}, ${AZ.tod(((t % 24) + 24) % 24)}`;

AZ.UI = class {
  constructor() {
    const $ = id => document.getElementById(id);
    this.el = { msg: $("msg"), menu: $("menuwin"), toasts: $("toasts"), banner: $("banner") };
    this.active = null; this.modalKey = null; this.sceneOn = false;
  }
  busy() { return !!this.active || !!this.modalKey || this.sceneOn; }
  async turn() { while (this.active) await new Promise(r => setTimeout(r, 40)); }

  async say(pages, who) {
    pages = (Array.isArray(pages) ? pages : [pages]).flat().filter(p => p != null && p !== "").map(String);
    if (pages.length > 3 && pages.every(p => p.length <= 1)) pages = [pages.join("")];
    if (!pages.length) return;
    await this.turn();
    return new Promise(res => {
      let i = 0;
      const el = this.el.msg;
      const show = () => {
        el.innerHTML = `${who ? `<div class="who">${who}</div>` : ""}<div class="page">${pages[i]}</div><div class="more" aria-hidden="true">${i < pages.length - 1 ? "▼" : "■"}</div>`;
        el.classList.add("on"); el.scrollTop = 0;
      };
      const next = () => { i++; if (i >= pages.length) { el.classList.remove("on"); el.innerHTML = ""; this.active = null; res(); } else show(); };
      this.active = { type: "say", next };
      el.onclick = e => { if (!e.target.closest("a")) next(); };
      show();
    });
  }

  // options: [{label, detail, desc, cls, disabled}]; opts: {cancel, title, sub, who, wide}
  async choose(prompt, options, opts = {}) {
    await this.turn();
    return new Promise(res => {
      const el = this.el.menu, dets = options.some(o => o.detail != null && o.detail !== "");
      let sel = Math.max(0, options.findIndex(o => !o.disabled));
      el.innerHTML = `${opts.who ? `<div class="who">${opts.who}</div>` : ""}${opts.title ? `<div class="mt">${opts.title}</div>` : ""}${opts.sub ? `<div class="ms">${opts.sub}</div>` : ""}` +
        `${prompt ? `<div class="mp">${prompt}</div>` : ""}<ul class="ml${dets ? " cols" : ""}" role="listbox">${options.map((o, k) =>
          `<li data-k="${k}" role="option" class="${o.cls || ""}${o.disabled ? " dis" : ""}"><span class="lab">${o.label}</span>${dets ? `<span class="lead"></span><span class="det">${o.detail ?? ""}</span>` : ""}</li>`).join("")}</ul><div class="mh"></div>`;
      el.classList.toggle("wide", !!opts.wide);
      el.classList.add("on");
      const lis = [...el.querySelectorAll("li")], help = el.querySelector(".mh");
      const paint = () => {
        lis.forEach((li, k) => { li.classList.toggle("sel", k === sel); li.setAttribute("aria-selected", k === sel); });
        help.innerHTML = options[sel]?.desc || "";
        if (lis[sel] && lis[sel].scrollIntoView) lis[sel].scrollIntoView({ block: "nearest" });
      };
      const done = k => { el.classList.remove("on"); el.innerHTML = ""; this.active = null; res(k); };
      const move = d => { for (let t = 0; t < options.length; t++) { sel = (sel + d + options.length) % options.length; if (!options[sel].disabled) break; } paint(); };
      lis.forEach(li => {
        const k = +li.dataset.k;
        li.onmouseenter = () => { if (!options[k].disabled && k !== sel) { sel = k; paint(); } };
        li.onclick = e => { e.stopPropagation(); if (!options[k].disabled) done(k); };
      });
      this.active = { type: "choose", move, pick: () => { if (options[sel] && !options[sel].disabled) done(sel); }, cancel: () => { if (opts.cancel != null) done(opts.cancel); } };
      paint();
    });
  }
  key(e) {
    const a = this.active, k = e.key;
    if (a) {
      if (a.type === "say") { if ([" ", "Enter", "z", "Z", "Escape", "x", "X"].includes(k)) a.next(); return true; }
      if (k === "ArrowUp" || k === "w" || k === "W") a.move(-1);
      else if (k === "ArrowDown" || k === "s" || k === "S") a.move(1);
      else if (k === "Enter" || k === " " || k === "z" || k === "Z") a.pick();
      else if (k === "Escape" || k === "x" || k === "X" || k === "Backspace") a.cancel();
      return true;
    }
    if (this.modalKey) { this.modalKey(e); return true; }
    return false;
  }
  toast(html, cls = "") {
    const d = document.createElement("div");
    d.className = "toast win " + cls;
    d.innerHTML = html;
    this.el.toasts.prepend(d);
    while (this.el.toasts.children.length > 4) this.el.toasts.lastChild.remove();
    setTimeout(() => d.classList.add("fade"), 5200);
    setTimeout(() => d.remove(), 6200);
  }
  banner(title, sub) {
    const b = this.el.banner;
    b.innerHTML = `<div class="t">${title}</div>${sub ? `<div class="s">${sub}</div>` : ""}`;
    b.classList.remove("on"); void b.offsetWidth; b.classList.add("on");
    clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.remove("on"), 3200);
  }
};
