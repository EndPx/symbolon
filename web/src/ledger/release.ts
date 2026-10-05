/** Real-asset release is blocked until the reviewed token adapters and operator
 * manifest exist. A public wallet connection must not turn demo holdings into
 * an implied MainNet product. */
import { tradingBlocker } from "./deployment";
export function requireTradingRelease(network?: string) {
  const reason = tradingBlocker(network);
  if (reason) throw new Error(reason);
}
