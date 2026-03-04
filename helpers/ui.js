/**
 * helpers/ui.js
 */
module.exports = ({ I, ball }) => {
  async function safeClickText(text) {
    try {
      const t = String(text);

      const clicked = await I.executeScript((needle) => {
        try {
          const tags = ["button", "a", "div", "span"];
          const nodes = [];
          for (const tag of tags) nodes.push(...document.querySelectorAll(tag));

          for (const el of nodes) {
            const txt = (el.innerText || el.textContent || "").trim();
            if (!txt) continue;
            if (!txt.includes(needle)) continue;

            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            const visible =
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== "hidden" &&
              style.display !== "none" &&
              style.opacity !== "0";

            if (!visible) continue;

            el.scrollIntoView({ block: "center", inline: "center" });
            el.click();
            return true;
          }
          return false;
        } catch (e) {
          return false;
        }
      }, t);

      return Boolean(clicked);
    } catch (e) {
      return false;
    }
  }

  // ✅ Türkçe karakterleri ASCII’ye indirgeme (yeşil ~ yesil)
  async function clickVariantByAttribute(desiredValue) {
    const value = String(desiredValue || "").trim();
    if (!value) return false;
    if (/^\d+$/.test(value)) throw new Error(`Variant value looks numeric "${desiredValue}" (refusing)`);

    const res = await I.executeScript(({ value }) => {
      const fold = (s) => {
        try {
          return (s || "")
            .toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/ı/g, "i")
            .replace(/İ/g, "i")
            .replace(/\s+/g, " ")
            .trim();
        } catch {
          return (s || "").toString().toLowerCase().replace(/\s+/g, " ").trim();
        }
      };

      const body = document.body;
      if (!body) return { ok: false, reason: "NO_BODY" };

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
        ]
          .filter(Boolean)
          .join(" ");
        const txt = (el.innerText || el.textContent || "").trim();
        return fold(attrs + " " + txt);
      };

      const targetFold = fold(value);

      const nodes = Array.from(
        body.querySelectorAll('button,[role="button"],input[type="radio"],a,label,div,span')
      ).filter(isVisible);

      const target = nodes.find((el) => attrText(el).includes(targetFold));
      if (!target) return { ok: false, reason: "NO_ATTR_MATCH" };

      target.scrollIntoView({ block: "center", inline: "center" });
      target.click();
      return { ok: true };
    }, { value });

    return !!res?.ok;
  }

  async function clickVariantNearLabel(labelText, desiredValue) {
    const label = String(labelText || "").trim();
    const value = String(desiredValue || "").trim();

    if (!value) throw new Error(`Variant value empty for label="${labelText}"`);
    if (/^\d+$/.test(value)) throw new Error(`Variant value looks numeric "${desiredValue}" (refusing)`);

    const res = await I.executeScript(({ label, value }) => {
      const fold = (s) => {
        try {
          return (s || "")
            .toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/ı/g, "i")
            .replace(/İ/g, "i")
            .replace(/\s+/g, " ")
            .trim();
        } catch {
          return (s || "").toString().toLowerCase().replace(/\s+/g, " ").trim();
        }
      };

      const body = document.body;
      if (!body) return { ok: false, reason: "NO_BODY" };

      const labelFold = fold(label);
      const valueFold = fold(value);

      const labelNodes = Array.from(body.querySelectorAll("*"))
        .filter((el) => {
          const t = fold(el.innerText || el.textContent || "");
          return t && (t === labelFold || t.includes(labelFold));
        })
        .slice(0, 120);

      if (!labelNodes.length) return { ok: false, reason: "LABEL_NOT_FOUND" };

      let container = null;
      for (const el of labelNodes) {
        let cur = el;
        for (let i = 0; i < 10 && cur; i++) {
          const clickableCount = cur.querySelectorAll('button,[role="button"],input[type="radio"],a,label').length;
          const childCount = cur.querySelectorAll("*").length;
          if (clickableCount > 0 && childCount > 8) {
            container = cur;
            break;
          }
          cur = cur.parentElement;
        }
        if (container) break;
      }
      if (!container) return { ok: false, reason: "CONTAINER_NOT_FOUND" };

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
        ]
          .filter(Boolean)
          .join(" ");
        const txt = (el.innerText || el.textContent || "").trim();
        return fold(attrs + " " + txt);
      };

      const candidates = Array.from(
        container.querySelectorAll('button,[role="button"],input[type="radio"],a,label,div,span')
      ).filter(isVisible);

      let target = candidates.find((el) => attrText(el).includes(valueFold));
      if (!target) return { ok: false, reason: "VALUE_NOT_FOUND_IN_CONTAINER" };

      target.scrollIntoView({ block: "center", inline: "center" });
      target.click();
      return { ok: true };
    }, { label, value });

    return !!res?.ok;
  }

  async function bestEffortClickAny(texts, stepName) {
    for (const txt of texts) {
      const ok = await safeClickText(txt);
      if (ok) {
        if (stepName) ball("GREEN", stepName, `clicked: ${txt}`);
        return true;
      }
    }
    if (stepName) ball("WHITE", stepName, "not found");
    return false;
  }

  async function bestEffortCloseModals() {
    try { I.pressKey("Escape"); } catch {}
    await bestEffortClickAny(["Kapat", "Vazgeç", "Hayır", "Tamam", "İptal", "×", "✕"], "CLOSE_MODAL");
  }

  async function bestEffortAcceptCookies() {
    await bestEffortClickAny(
      ["Kabul Et", "Tümünü Kabul Et", "Tüm Çerezleri Kabul Et", "Kabul ediyorum", "Accept", "Accept all", "Allow all"],
      "COOKIES"
    );
  }

  return {
    safeClickText,
    clickVariantNearLabel,
    clickVariantByAttribute,
    bestEffortClickAny,
    bestEffortCloseModals,
    bestEffortAcceptCookies
  };
};
