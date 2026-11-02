import { fmtPrice, fmtUsd } from "../utils";

export default function Dashboard({ data }) {
  const cards = [
    { label: "ETH / USD (simulated)", value: fmtPrice(data.price), accent: true },
    { label: "Virtual USDC Balance", value: fmtUsd(data.balance) },
    { label: "Total Trades", value: data.trades.toString() },
    { label: "Total XP", value: data.xp.toString() },
    { label: "Level", value: data.level.toString() },
  ];
  return (
    <section className="grid-5">
      {cards.map((c) => (
        <div key={c.label} className={`card stat ${c.accent ? "accent" : ""}`}>
          <span className="label">{c.label}</span>
          <span className="value">{c.value}</span>
        </div>
      ))}
    </section>
  );
}
