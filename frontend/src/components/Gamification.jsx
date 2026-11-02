import { BADGES, XP_PER_LEVEL } from "../config";

export default function Gamification({ data }) {
  const xp = Number(data.xp);
  const into = xp % XP_PER_LEVEL;
  const pct = Math.round((into / XP_PER_LEVEL) * 100);
  return (
    <div className="card">
      <h2>Quest Progress</h2>
      <div className="level-row">
        <div className="level-badge">LV {data.level.toString()}</div>
        <div className="grow">
          <div className="bar">
            <div className="fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="muted small-text">
            {into} / {XP_PER_LEVEL} XP to level {Number(data.level) + 1} · {xp} XP total
          </span>
        </div>
      </div>
      <div className="mini-stats">
        <div>
          <span className="label">Trades</span>
          <strong>{data.trades.toString()}</strong>
        </div>
        <div>
          <span className="label">Profitable</span>
          <strong>{data.wins.toString()}</strong>
        </div>
      </div>
      <h3>Achievements</h3>
      <div className="badges">
        {BADGES.map((b, i) => (
          <div key={b.name} className={`badge ${data.badges[i] ? "earned" : ""}`} title={b.desc}>
            <span className="icon">{b.icon}</span>
            <span>{b.name}</span>
            <span className="muted small-text">{b.desc}</span>
          </div>
        ))}
      </div>
      <p className="muted small-text">XP: open +5 · close +10 · profitable close +15</p>
    </div>
  );
}
