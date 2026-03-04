function resolve(mod) {
  const p = mod?.default || mod?.ProductPage || mod;
  if (typeof p === "function") {
    const proto = p.prototype ? Object.getOwnPropertyNames(p.prototype) : [];
    // class export ise instance al
    if (proto.includes("open") || proto.includes("prepare") || proto.includes("selectVariants") || proto.includes("addToCart")) {
      try { return new p(); } catch (e) {}
    }
    // factory export ise çağır
    try { return p(); } catch (e) {}
  }
  return p;
}

const Base = resolve(require("./ProductPage"));
const { I } = inject();

async function getAvailableColors(max = 5) {
  const res = await I.executeScript((max) => {
    const fold = (s) => (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const isVisible = (el) => {
      const st = window.getComputedStyle(el);
      if (!st || st.display === "none" || st.visibility === "hidden" || st.opacity === "0") return false;
      const r = el.getBoundingClientRect();
      return r.width >= 6 && r.height >= 6;
    };

    const body = document.body;
    if (!body) return { ok: false, colors: [] };

    const labelCandidates = Array.from(body.querySelectorAll("*"))
      .filter(el => {
        const t = fold(el.innerText || el.textContent || "");
        return t === "renk" || t.startsWith("renk");
      }).slice(0, 80);

    let container = null;
    for (const el of labelCandidates) {
      let cur = el;
      for (let i = 0; i < 10 && cur; i++) {
        const clickables = cur.querySelectorAll('button,[role="button"],input[type="radio"],a,label,div,span');
        if (clickables.length >= 3) { container = cur; break; }
        cur = cur.parentElement;
      }
      if (container) break;
    }

    const scope = container || body;

    const nodes = Array.from(scope.querySelectorAll('button,[role="button"],input[type="radio"],a,label,div,span'))
      .filter(isVisible);

    const isDisabled = (el) => {
      if (el.hasAttribute("disabled")) return true;
      if (el.getAttribute("aria-disabled") === "true") return true;
      const cls = (el.getAttribute("class") || "").toLowerCase();
      return cls.includes("disabled") || cls.includes("passive") || cls.includes("out");
    };

    const getName = (el) => {
      const attrs = [
        el.getAttribute("aria-label"),
        el.getAttribute("title"),
        el.getAttribute("data-value"),
        el.getAttribute("data-variation"),
        el.getAttribute("data-variant"),
        el.getAttribute("data-testid"),
        el.getAttribute("value"),
      ].filter(Boolean).join(" ");
      const txt = (el.innerText || el.textContent || "").trim();
      const all = fold(attrs + " " + txt);
      return all.replace(/^renk\s*[:\-]?\s*/,"").trim();
    };

    const colors = [];
    const seen = new Set();

    for (const el of nodes) {
      if (isDisabled(el)) continue;
      const name = getName(el);
      if (!name) continue;
      if (name.length < 3) continue;
      if (name.includes("sepete") || name.includes("satın") || name.includes("beden")) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      colors.push(name);
      if (colors.length >= max) break;
    }

    return { ok: true, colors };
  }, max);

  return (res && res.ok && res.colors) ? res.colors : [];
}

async function selectColorSmart(color) {
  const result = await I.executeScript((value) => {
    const fold = (s) => (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const targetFold = fold(value);

    const isVisible = (el) => {
      const st = window.getComputedStyle(el);
      if (!st || st.display === "none" || st.visibility === "hidden" || st.opacity === "0") return false;
      const r = el.getBoundingClientRect();
      return r.width >= 6 && r.height >= 6;
    };

    const attrText = (el) => {
      const attrs = [
        el.getAttribute("aria-label"),
        el.getAttribute("title"),
        el.getAttribute("data-value"),
        el.getAttribute("data-variation"),
        el.getAttribute("data-variant"),
        el.getAttribute("data-testid"),
        el.getAttribute("value"),
      ].filter(Boolean).join(" ");
      const txt = (el.innerText || el.textContent || "").trim();
      return fold(attrs + " " + txt);
    };

    const nodes = Array.from(document.body.querySelectorAll('button,[role="button"],input[type="radio"],a,label,div,span'))
      .filter(isVisible);

    const target = nodes.find((el) => attrText(el).includes(targetFold));
    if (!target) return { ok: false };

    target.scrollIntoView({ block: "center", inline: "center" });
    target.click();
    return { ok: true };
  }, color);

  return !!result?.ok;
}

module.exports = {
  // Base page methods (delegation)
  async open(url) { return Base.open(url); },
  async prepare() { return Base.prepare(); },
  async selectVariants(color, size) { return Base.selectVariants(color, size); },
  async addToCart() { return Base.addToCart(); },

  // New dynamic methods
  getAvailableColors,
  selectColorSmart,
};
