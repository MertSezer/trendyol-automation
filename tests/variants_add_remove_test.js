Feature("Trendyol - Variants (Color/Size) Add/Remove (I only)");

Scenario("Product URL -> discover variants -> try combos -> add/remove", async ({ I, CartPage }) => {
  const url = process.env.PRODUCT_URL;
  const maxColors = Number(process.env.MAX_COLORS || 3);
  const maxSizes = Number(process.env.MAX_SIZES || 2);

  if (!url) throw new Error("PRODUCT_URL missing (.env)");

  const fold = (s) => (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const discover = await (async () => {
    I.amOnPage(url);
    I.wait(3);

    return await I.executeScript((maxColors, maxSizes) => {
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

      const getLabelNodes = (label) => {
        const lf = fold(label);
        return Array.from(document.body.querySelectorAll("*"))
          .filter(el => {
            const t = fold(el.innerText || el.textContent || "");
            return t === lf || t.startsWith(lf);
          }).slice(0, 120);
      };

      const findContainerNear = (labelNodes) => {
        for (const el of labelNodes) {
          let cur = el;
          for (let i = 0; i < 10 && cur; i++) {
            const clickables = cur.querySelectorAll('button,[role="button"],input[type="radio"],a,label,div,span');
            if (clickables.length >= 3) return cur;
            cur = cur.parentElement;
          }
        }
        return null;
      };

      const pickOptions = (container, limit) => {
        const nodes = Array.from(container.querySelectorAll('button,[role="button"],input[type="radio"],a,label,div,span'))
          .filter(isVisible);

        const isDisabled = (el) => {
          if (el.hasAttribute("disabled")) return true;
          if (el.getAttribute("aria-disabled") === "true") return true;
          const cls = (el.getAttribute("class") || "").toLowerCase();
          return cls.includes("disabled") || cls.includes("passive") || cls.includes("out");
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
          const all = fold(attrs + " " + txt);
// normalize ".... renk: siyah siyah" -> "siyah"
const m = all.match(/renk\s*:\s*(.+)$/);
if (m && m[1]) {
  const v = m[1].trim();
  // "siyah siyah" gibi tekrarları sadeleştir
  const parts = v.split(" ").filter(Boolean);
  if (parts.length >= 2 && parts.every(p => p === parts[0])) return parts[0];
  return v;
}
return all;
        };

        const out = [];
        const seen = new Set();
        for (const el of nodes) {
          if (isDisabled(el)) continue;
          const name = attrText(el); if (!name || name.length < 2) continue; if (name === 'renk:' || name.includes('selected') || name.includes('slicing-') || name.includes('icon') || name.includes('info') || name.includes('slide') || name.includes('slider') || name.includes('tooltip') || name.includes('wrapper') || name.includes('section') || name.includes('container') || name.includes('text-box') || name.includes('textbox') || name.includes('text box')) continue;
          if (seen.has(name)) continue;
          seen.add(name);
          const cleaned = (name.split(' ').length >= 2 && name.split(' ').every(Boolean)) ? name.split(' ').slice(-1)[0] : name; out.push({ name: cleaned, idx: out.length });
          if (out.length >= limit) break;
        }
        return out;
      };

      const colorLabel = getLabelNodes("Renk");
      const sizeLabel = getLabelNodes("Beden");

      const colorContainer = colorLabel.length ? findContainerNear(colorLabel) : null;
      const sizeContainer = sizeLabel.length ? findContainerNear(sizeLabel) : null;

      const colors = colorContainer ? pickOptions(colorContainer, maxColors) : [];
      const sizes  = sizeContainer  ? pickOptions(sizeContainer, maxSizes)  : [];

      return { hasColors: !!colorContainer, hasSizes: !!sizeContainer, colors, sizes };
    }, maxColors, maxSizes);
  })();

  I.say(`DISCOVER: ${JSON.stringify(discover)}`);

  // helper: click by partial match
  const clickByValue = async (value) => {
    return await I.executeScript((value) => {
      const fold = (s) => (s || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const target = fold(value);

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
        const all = fold(attrs + " " + txt);
// normalize ".... renk: siyah siyah" -> "siyah"
const m = all.match(/renk\s*:\s*(.+)$/);
if (m && m[1]) {
  const v = m[1].trim();
  // "siyah siyah" gibi tekrarları sadeleştir
  const parts = v.split(" ").filter(Boolean);
  if (parts.length >= 2 && parts.every(p => p === parts[0])) return parts[0];
  return v;
}
return all;
      };

      const nodes = Array.from(document.body.querySelectorAll('button,[role="button"],input[type="radio"],a,label,div,span'))
        .filter(isVisible);

      const el = nodes.find(n => attrText(n).includes(target) || target.includes(attrText(n)));
      if (!el) return false;
      el.scrollIntoView({ block: "center", inline: "center" });
      el.click();
      return true;
    }, value);
  };

  // If no variants, fallback to plain add/remove once
  const tryOnce = async () => {
    // add to cart
    const added = await I.executeScript(() => {
      const needles = ["Sepete Ekle", "Sepete ekle", "Add to cart"];
      const tags = ["button","a","div","span"];
      const nodes = [];
      for (const t of tags) nodes.push(...document.querySelectorAll(t));
      for (const n of needles) {
        for (const el of nodes) {
          const txt = (el.innerText || el.textContent || "").trim();
          if (!txt) continue;
          if (!txt.includes(n)) continue;
          const r = el.getBoundingClientRect();
          const st = window.getComputedStyle(el);
          const visible = r.width>0 && r.height>0 && st.display!=="none" && st.visibility!=="hidden" && st.opacity!=="0";
          if (!visible) continue;
          el.scrollIntoView({ block: "center", inline: "center" });
          el.click();
          return true;
        }
      }
      return false;
    });

    if (!added) {
      I.saveScreenshot(`add_to_cart_not_found_${Date.now()}.png`);
      return;
    }

    I.wait(2);
    I.saveScreenshot(`after_add_${Date.now()}.png`);

    await CartPage.goToCart();
    await CartPage.verifyAndScreenshot();
    await CartPage.goToCheckout();
    await CartPage.goToCart();
    await CartPage.removeFromCart();
    await CartPage.verifyEmpty();
    I.saveScreenshot(`after_remove_${Date.now()}.png`);
  };

  // run combos
  const colors = discover.colors || [];
  const sizes = discover.sizes || [];

  if (!colors.length && !sizes.length) {
    I.say("No variants found, running plain add/remove once");
    await tryOnce();
    return;
  }

  const combos = [];
  for (const c of (colors.length ? colors : [{ name: "" }])) {
    for (const s of (sizes.length ? sizes : [{ name: "" }])) {
      combos.push({ c: c.name, s: s.name });
    }
  }

  // try first few combos
  const maxCombos = Math.min(combos.length, 5);
  for (let i = 0; i < maxCombos; i++) {
    const { c, s } = combos[i];
    I.say(`TRY COMBO ${i+1}/${maxCombos}: color='${c}' size='${s}'`);

    I.amOnPage(url);
    I.wait(3);

    if (c) await clickByValue(c);
    if (s) await clickByValue(s);

    await tryOnce();
  }
});






