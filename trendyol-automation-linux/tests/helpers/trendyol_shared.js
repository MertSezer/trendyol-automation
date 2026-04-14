function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shortenText(s, max = 120) {
  if (!s) return "";

  const clean = String(s)
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length <= max) return clean;

  return clean.substring(0, max) + "...";
}

function isBadPage(current, title) {
  const c = String(current || "");
  const t = String(title || "");

  const listingLike =
    !c.includes("-p-") ||
    c.includes("/sr?") ||
    c.includes("/sirali-urunler") ||
    c.includes("/cok-satanlar") ||
    c.includes("butik/liste");

  const genericTitle =
    t.includes("Online Alışveriş Sitesi") ||
    t.includes("Türkiye’nin Trend Yolu") ||
    t.includes("Türkiye'nin Trend Yolu") ||
    t.includes("Arama Sonuçları");

  return listingLike || genericTitle;
}

async function safeScreenshot(I, name) {
  await I.saveScreenshot(name).catch(() => {});
}

async function acceptCookieLikePopups(I) {
  return I.executeScript(() => {
    const norm = (s) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const nodes = Array.from(
      document.querySelectorAll("button,a,div[role='button'],span[role='button']")
    );

    const hints = [
      "kabul et",
      "tumunu kabul et",
      "tümünü kabul et",
      "accept",
      "agree",
      "tamam",
      "ok",
      "kapat",
      "anladim",
      "anladım",
    ].map(norm);

    let clicked = 0;

    for (const el of nodes) {
      const txt = norm(el.innerText || el.textContent || "");
      if (!txt) continue;
      if (!hints.some((h) => txt.includes(h))) continue;

      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;

      try {
        el.click();
        clicked += 1;
      } catch (_) {}
    }

    return clicked;
  }).catch(() => 0);
}

async function clickByHints(I, hints, options = {}) {
  const {
    selectors = "button,a,div,span",
    minWidth = 8,
    minHeight = 8,
    scrollIntoView = true,
  } = options;

  return I.executeScript(
    ({ hints, selectors, minWidth, minHeight, scrollIntoView }) => {
      const norm = (s) =>
        (s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      const visible = (el) => {
        const r = el.getBoundingClientRect();
        return r.width >= minWidth && r.height >= minHeight;
      };

      const ownText = (el) => {
        const aria = el.getAttribute("aria-label") || "";
        const title = el.getAttribute("title") || "";
        const value = el.getAttribute("value") || "";

        const directText = Array.from(el.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        const txt = aria || title || value || directText || "";
        return txt.replace(/\s+/g, " ").trim();
      };

      const normalizedHints = hints.map(norm);
      const nodes = Array.from(document.querySelectorAll(selectors));
      const candidates = [];

      for (const el of nodes) {
        if (!visible(el)) continue;

        const raw = ownText(el);
        if (!raw) continue;

        const txt = norm(raw);

        const matched = normalizedHints.find(
          (h) => txt === h || txt.startsWith(h) || txt.includes(h)
        );

        if (!matched) continue;
        if (txt.length > 60) continue;

        let score = 0;

        if (txt === matched) score += 1000;
        else if (txt.startsWith(matched)) score += 700;
        else score += 400;

        if (el.tagName === "BUTTON") score += 200;
        if (el.getAttribute("role") === "button") score += 120;

        score -= txt.length;

        candidates.push({
          el,
          raw,
          score,
        });
      }

      candidates.sort((a, b) => b.score - a.score);

      const best = candidates[0];
      if (!best) return null;

      try {
        if (scrollIntoView) {
          best.el.scrollIntoView({ block: "center" });
        }

        best.el.click();
        return best.raw;
      } catch (_) {
        return null;
      }
    },
    { hints, selectors, minWidth, minHeight, scrollIntoView }
  ).catch(() => null);
}

async function verifyAddToCart(I) {
  return I.executeScript(() => {
    const text = (document.body?.innerText || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    return {
      url: location.href,
      hasAddedText:
        text.includes("sepete eklendi") ||
        text.includes("ürün sepetinde") ||
        text.includes("urun sepetinde") ||
        text.includes("sepetinizde"),
      hasBasketCount:
        !!document.querySelector('[data-testid*="basket"]') ||
        !!document.querySelector(".basket-preview") ||
        !!document.querySelector(".shopping-basket") ||
        !!document.querySelector(".basketItemCount") ||
        !!document.querySelector(".item-count"),
    };
  }).catch(() => ({
    url: "",
    hasAddedText: false,
    hasBasketCount: false,
  }));
}

async function verifyRemoveFromCart(I) {
  return I.executeScript(() => {
    const norm = (s) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const text = norm(document.body?.innerText || "");

    const emptyHints = [
      "sepetin bos",
      "sepetiniz bos",
      "sepetinde urun bulunmamaktadir",
      "sepetinizde urun bulunmamaktadir",
      "sepette urun yok",
      "alisverise basla",
    ];

    const itemSelectors = [
      '[data-testid*="cart-item"]',
      '[data-testid*="basket-item"]',
      ".pb-basket-item",
      ".basket-item",
      '[class*="basket-item"]',
      '[class*="cart-item"]',
    ];

    let visibleItemCount = 0;

    for (const sel of itemSelectors) {
      const nodes = Array.from(document.querySelectorAll(sel));
      for (const el of nodes) {
        const r = el.getBoundingClientRect();
        if (r.width > 5 && r.height > 5) {
          visibleItemCount += 1;
        }
      }
    }

    return {
      url: location.href,
      emptyLike: emptyHints.some((h) => text.includes(h)),
      visibleItemCount,
      stillOnCartPage: location.href.includes("sepet"),
    };
  }).catch(() => ({
    url: "",
    emptyLike: false,
    visibleItemCount: -1,
    stillOnCartPage: false,
  }));
}

module.exports = {
  normalizeText,
  shortenText,
  isBadPage,
  safeScreenshot,
  acceptCookieLikePopups,
  clickByHints,
  verifyAddToCart,
  verifyRemoveFromCart,
};
function classifyPage(url, title) {
  const u = normalizeText(url || "");
  const t = normalizeText(title || "");

  const reasons = [];

  const badUrlHints = [
    "/sr?",
    "/butik/",
    "/list",
    "/kampanya",
    "/search",
    "/arama",
    "/cok-satanlar",
    "/favoriler",
    "/hesabim"
  ];

  const badTitleHints = [
    "arama",
    "sonuclar",
    "sonuçlar",
    "listeleme",
    "butik",
    "kampanya",
    "giris",
    "giriş"
  ];

  const looksLikeCart = u.includes("/sepet");
  const looksLikeProductUrl =
    u.includes("-p-") || u.includes("/product/") || u.includes("merchantId=");

  if (looksLikeCart) {
    reasons.push("cart_page");
  }

  if (!looksLikeProductUrl) {
    reasons.push("url_not_product_like");
  }

  if (badUrlHints.some((h) => u.includes(normalizeText(h)))) {
    reasons.push("url_matches_bad_hint");
  }

  if (badTitleHints.some((h) => t.includes(normalizeText(h)))) {
    reasons.push("title_matches_bad_hint");
  }

  const isBad = reasons.length > 0;

  return {
    pageKind: isBad ? "non_product_or_listing" : "pdp",
    isBadPage: isBad,
    reasons
  };
}

function sanitizeText(value) {
  if (value == null) return value;

  let v = String(value);

  const looksMojibake =
    /Ã.|Ä.|Å.|â€™|â€œ|â€|â€“|â€”|�/.test(v);

  if (looksMojibake) {
    try {
      v = Buffer.from(v, "latin1").toString("utf8");
    } catch (_) {}
  }

  return v
    .normalize("NFC")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports.classifyPage = classifyPage;
module.exports.sanitizeText = sanitizeText;

