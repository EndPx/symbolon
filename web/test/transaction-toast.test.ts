import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NotificationRegion, TransactionToast, type Receipt } from "../src/app/TransactionToast.tsx";

test("pending and uncertain notices cannot be dismissed as successful transactions", () => {
  for (const phase of ["pending","unconfirmed"] as const) {
    const receipt: Receipt = {phase,label:"Repo settlement",detail:"Check the original command."};
    const html = renderToStaticMarkup(createElement(NotificationRegion,{},createElement(TransactionToast,{receipt,onDismiss:()=>{},onView:()=>{}})));
    assert.match(html,/role="status" aria-live="polite"/);
    assert.doesNotMatch(html,/Dismiss notification|Confirmed|View receipt/);
    assert.match(html,/Check the original command/);
    assert.equal(receipt.phase,phase);
  }
});

test("a confirmed toast offers receipt access without displaying ledger identifiers inline", () => {
  const receipt: Receipt = {phase:"succeeded",label:"Test assets issued",updateId:"private-ledger-update"};
  const html = renderToStaticMarkup(createElement(TransactionToast,{receipt,onDismiss:()=>{},onView:()=>{}}));
  assert.match(html,/Confirmed/);
  assert.match(html,/View receipt/);
  assert.match(html,/Dismiss notification/);
  assert.doesNotMatch(html,/private-ledger-update/);
  assert.equal(receipt.updateId,"private-ledger-update");
});
