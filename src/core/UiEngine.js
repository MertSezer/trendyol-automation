"use strict";

class UiEngine{

  constructor({I,reporter}){
    this.I=I
    this.reporter=reporter
  }

  async safeClick(selectors){

    for(const s of selectors){

      try{
        await this.I.waitForElement(s,3)
        await this.I.click(s)
        return true
      }catch(e){}

    }

    return false
  }

}

module.exports={UiEngine}