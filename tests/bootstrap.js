"use strict";

module.exports = async function () {
  process.on("unhandledRejection", (reason) => {
    const msg = String(reason && (reason.message || reason) || "");
    if (msg.includes("No connection to WebDriver Bidi was established")) return;
    console.error("UnhandledRejection:", reason);
  });

  process.on("uncaughtException", (err) => {
    const msg = String(err && (err.message || err) || "");
    if (msg.includes("No connection to WebDriver Bidi was established")) return;
    throw err;
  });
};