const { slugifyUrl } = require("../helpers/util");

function visible(el) {
  const r = el.getBoundingClientRect();
  const st = window.getComputedStyle(el);
  return r.width > 0 && r.height > 0 && st.display !== "none" && st.visibility !== "hidden" && st.opacity !== "0";
}

async function clickByNeedles(I, needles, { tags = ["button","a","div","span"], scope = null } = {}) {
  return await I.executeScript(({ needles, tags }) => {
    try {
      const root = document.body;
      if (!root) return false;

      const nodes = [];
      for (const t of tags) nodes.push(...root.querySelectorAll(t));

      for (const n of needles) {
        for (const el of nodes) {
          const txt = (el.innerText || el.textContent || "").trim();
          if (!txt) continue;
          if (!txt.includes(n)) continue;
          if (!visible(el)) continue;
          el.scrollIntoView({ block: "center", inline: "center" });
          el.click();
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }

    function visible(el) {
      const r = el.getBoundingClientRect();
      const st = window.getComputedStyle(el);
      return r.width > 0 && r.height > 0 && st.display !== "none" && st.visibility !== "hidden" && st.opacity !== "0";
    }
  }, { needles, tags });
}

module.exports = {
  slugifyUrl,

  async closePopups(I) {
    await clickByNeedles(I, ["Tümünü Kabul Et", "Kabul Et", "Anladım", "Tamam", "Kapat", "Close"]);
  },

  async addToCart(I) {
    return await clickByNeedles(I, ["Sepete Ekle", "Sepete ekle", "Add to cart"]);
  },

  async removeFromCart(I) {
    return await clickByNeedles(I, ["Sil", "Kaldır", "Ürünü Sil", "Sepetten Kaldır", "Remove", "Delete"]);
  },

  async confirmCart(I) {
    return await clickByNeedles(I, ["Sepeti Onayla"]);
  },

};
