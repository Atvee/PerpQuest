import { useState } from "react";
import { parseUnits } from "ethers";
import { USDC_DECIMALS } from "../config";
import { fmtUsd } from "../utils";

export default function TradePanel({ data, busy, onClaim, onOpen }) {
  const [isLong, setIsLong] = useState(true);
  const [collateral, setCollateral] = useState("100");
  const [leverage, setLeverage] = useState(2);

  let collateralWei = 0n;
  let invalid = "";
  try {
    collateralWei = parseUnits(collateral || "0", USDC_DECIMALS);
    if (collateralWei <= 0n) invalid = "Enter collateral > 0";
    else if (collateralWei > data.balance) invalid = "Exceeds your balance";
  } catch {
    invalid = "Invalid amount";
  }
  const size = invalid ? 0n : collateralWei * BigInt(leverage);

  if (!data.claimed) {
    return (
      <div className="card">
        <h2>Trade ETH/USD</h2>
        <p className="muted">Claim your free 1,000 virtual USDC to start trading.</p>
        <button className="btn primary full" disabled={busy} onClick={onClaim}>
          Claim 1,000 Virtual USDC
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Trade ETH/USD</h2>
      <div className="toggle">
        <button className={`long ${isLong ? "on" : ""}`} onClick={() => setIsLong(true)}>
          LONG
        </button>
        <button className={`short ${!isLong ? "on" : ""}`} onClick={() => setIsLong(false)}>
          SHORT
        </button>
      </div>

      <label className="field">
        <span className="label">Collateral (virtual USDC)</span>
        <div className="input-row">
          <input
            type="number"
            min="0"
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
            placeholder="100"
          />
          <button className="btn ghost small" onClick={() => setCollateral((Number(data.balance) / 1e6).toString())}>
            MAX
          </button>
        </div>
      </label>

      <div className="field">
        <span className="label">Leverage</span>
        <div className="lev-row">
          {[2, 3, 5].map((l) => (
            <button key={l} className={`lev ${leverage === l ? "on" : ""}`} onClick={() => setLeverage(l)}>
              {l}x
            </button>
          ))}
        </div>
      </div>

      <div className="summary">
        <div>
          <span className="muted">Estimated position size</span>
          <strong>{fmtUsd(size)}</strong>
        </div>
        <div>
          <span className="muted">Available</span>
          <strong>{fmtUsd(data.balance)}</strong>
        </div>
      </div>

      {invalid && <p className="hint">{invalid}</p>}

      <button
        className={`btn full ${isLong ? "long-btn" : "short-btn"}`}
        disabled={busy || !!invalid}
        onClick={() => onOpen(isLong, collateralWei, leverage)}
      >
        Open {isLong ? "LONG" : "SHORT"} Position
      </button>
    </div>
  );
}
