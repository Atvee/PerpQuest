import { fmtPrice, fmtSigned, fmtUsd } from "../utils";

export default function Positions({ data, busy, onClose }) {
  const { positions, price } = data;
  return (
    <div className="card">
      <h2>My Positions</h2>
      {positions.length === 0 ? (
        <p className="muted">No positions yet. Open one from the trade panel.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Side</th>
                <th>Collateral</th>
                <th>Lev</th>
                <th>Size</th>
                <th>Entry</th>
                <th>{`Current / Exit`}</th>
                <th>PnL</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id.toString()}>
                  <td>#{p.id.toString()}</td>
                  <td className={p.isLong ? "pos" : "neg"}>{p.isLong ? "LONG" : "SHORT"}</td>
                  <td>{fmtUsd(p.collateral)}</td>
                  <td>{p.leverage.toString()}x</td>
                  <td>{fmtUsd(p.size)}</td>
                  <td>{fmtPrice(p.entryPrice)}</td>
                  <td>{fmtPrice(p.isOpen ? price : p.exitPrice)}</td>
                  <td className={p.pnl > 0n ? "pos" : p.pnl < 0n ? "neg" : ""}>
                    <strong>{fmtSigned(p.pnl)}</strong>
                  </td>
                  <td>
                    <span className={`pill ${p.isOpen ? "open" : "closed"}`}>{p.isOpen ? "OPEN" : "CLOSED"}</span>
                  </td>
                  <td>
                    {p.isOpen && (
                      <button className="btn ghost small" disabled={busy} onClick={() => onClose(p.id)}>
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
