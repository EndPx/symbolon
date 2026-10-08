import test from "node:test";
import assert from "node:assert/strict";
import { holdingBalances } from "../src/app/portfolio-state.ts";
import type { DeskState } from "../src/ledger/symbolon.ts";

test("portfolio groups holdings by issuer and instrument without treating locked or foreign assets as available", () => {
  const make = (id:string,issuer:string,instrument:string,amount:string,owner="alice::a",locked=false) => ({contractId:id,templateId:"holding",payload:{issuer,owner,instrument,amount,viewers:[],lockParties:locked?[owner]:[]}});
  const state: DeskState = {feeds:[],requests:[],quotes:[],positions:[],proposals:[],closed:[],holdings:[make("a","issuer::a","USDCx-demo","1000"),make("b","issuer::a","USDCx-demo","4.3333333333"),make("locked","issuer::a","USDCx-demo","200","alice::a",true),make("other-issuer","issuer::b","USDCx-demo","5000"),make("foreign","issuer::a","USDCx-demo","9000","bob::b"),make("collateral","issuer::a","cBTC-demo","0.1")]};
  const rows = holdingBalances(state,"alice::a");
  assert.equal(rows.length,3);
  const cash = rows.find(row=>row.issuer==="issuer::a"&&row.instrument==="USDCx-demo")!;
  assert.equal(cash.available,1004.3333333333);
  assert.equal(cash.locked,200);
  assert.equal(rows.find(row=>row.issuer==="issuer::b")?.available,5000);
  assert.equal(rows.find(row=>row.instrument==="cBTC-demo")?.available,0.1);
  assert.equal(new Set(rows.map(row=>row.key)).size,3);
});
