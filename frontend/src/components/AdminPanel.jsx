import { useState } from "react";
import { parseUnits } from "ethers";
import { PRICE_DECIMALS } from "../config";
import { fmtPrice } from "../utils";

export default function AdminPanel({ data, busy, onSetPrice }) {
  const [value, setValue] = useState("");

  const submit = (dollars) => {
    try {
      onSetPrice(parseUnits(String(dollars), PRICE_DECIMALS));
    } catch {
      /* invalid input ignored */
    }
  };

  const cur = Number(data.price) / 1e8;
  const presets = [
    { label: "+10%", v: (cur * 1.1).toFixed(2) },
    { label: "-10%", v: (cur * 0.9).toFixed(2) },
    { label: "Reset $2,000", v: "2000" },
  ];

  return (
    <div className="card admin">
      <h2>Admin · Price Control</h2>
      <p className="warn">⚠ Simulated oracle for demonstration only. Not a real price feed.</p>
      <p className="muted">
        Current: <strong>{fmtPrice(data.price)}</strong>
      </p>
      <div className="input-row">
        <input
          type="number"
          min="1"
          step="any"
          placeholder="New ETH price in USD, e.g. 2200"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn primary" disabled={busy || !value || Number(value) <= 0} onClick={() => submit(value)}>
          Update
        </button>
      </div>
      <div className="lev-row">
        {presets.map((p) => (
          <button key={p.label} className="lev" disabled={busy} onClick={() => submit(p.v)}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
