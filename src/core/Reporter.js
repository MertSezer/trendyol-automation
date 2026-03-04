"use strict";

const fs = require("fs");
const path = require("path");

class Reporter {

  constructor(){
    this.counters = { opened:0, added:0, removed:0, skip:0, warn:0 }
    this.events=[]
  }

  step(name,data={}){
    this.events.push({type:"step",name,...data})
  }

  mark(kind,data={}){
    if(this.counters[kind]!==undefined) this.counters[kind]++
    this.events.push({type:kind,...data})
  }

  write(){
    fs.mkdirSync("output",{recursive:true})
    fs.writeFileSync(
      path.join("output","case_report.json"),
      JSON.stringify({counters:this.counters,events:this.events},null,2)
    )
  }

}

module.exports={Reporter}