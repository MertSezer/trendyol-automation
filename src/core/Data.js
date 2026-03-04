"use strict";

const fs = require("fs");

function readProducts(file="products.txt"){

  if(!fs.existsSync(file)) return []

  return fs.readFileSync(file,"utf8")
    .split(/\r?\n/)
    .map(x=>x.trim())
    .filter(x=>x && !x.startsWith("#"))

}

module.exports={readProducts}