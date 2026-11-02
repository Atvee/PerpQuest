import { useWallet } from "./hooks/useWallet";
import { usePerpQuest } from "./hooks/usePerpQuest";
import { CONTRACT_ADDRESS } from "./config";
import { short } from "./utils";
import Dashboard from "./components/Dashboard";
import TradePanel from "./components/TradePanel";
import Positions from "./components/Positions";
import Gamification from "./components/Gamification";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const wallet = useWallet();
  const pq = usePerpQuest(wallet);
  const busy = !!pq.txStatus;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo">⚔</span> PerpQuest
        </div>
        <div className="wallet">
          {wallet.account && (
            <span className={`net ${wallet.isSepolia ? "ok" : "bad"}`}>
              {wallet.isSepolia ? "Sepolia" : `Wrong network (${wallet.chainId?.toString() ?? "?"})`}
            </span>
          )}
          {wallet.account ? (
            <span className="addr" title={wallet.account}>
              {short(wallet.account)}
            </span>
          ) : (
            <button className="btn primary" onClick={wallet.connect}>
              Connect MetaMask
            </button>
          )}
        </div>
      </header>

      <div className="banner">
        🧪 Educational demo · virtual credits only · ETH price is <strong>simulated</strong> and set by the contract
        owner.
      </div>

      {!wallet.hasMetaMask && <div className="msg error">MetaMask not detected. Install it to use PerpQuest.</div>}
      {!CONTRACT_ADDRESS && (
        <div className="msg error">
          Contract address missing. Set <code>VITE_CONTRACT_ADDRESS</code> in <code>frontend/.env</code>.
        </div>
      )}
      {wallet.error && <div className="msg error">{wallet.error}</div>}
      {wallet.account && !wallet.isSepolia && (
        <div className="msg error">
          Please switch to Sepolia.{" "}
          <button className="btn small primary" onClick={wallet.switchToSepolia}>
            Switch network
          </button>
        </div>
      )}
      {pq.txStatus && <div className="msg info">⏳ {pq.txStatus}</div>}
      {pq.error && (
        <div className="msg error" onClick={pq.clearMessages}>
          {pq.error}
        </div>
      )}
      {pq.success && (
        <div className="msg success" onClick={pq.clearMessages}>
          {pq.success}
        </div>
      )}

      {!wallet.account ? (
        <div className="card center">
          <h2>Welcome to PerpQuest</h2>
          <p className="muted">
            Trade ETH/USD with virtual credits, earn XP, unlock badges. Connect your wallet to begin.
          </p>
        </div>
      ) : pq.ready ? (
        <>
          {pq.loading && <p className="muted">Loading on-chain data…</p>}
          <Dashboard data={pq.data} />
          <div className="cols">
            <TradePanel data={pq.data} busy={busy} onClaim={pq.claim} onOpen={pq.open} />
            <Gamification data={pq.data} />
          </div>
          <Positions data={pq.data} busy={busy} onClose={pq.close} />
          {pq.isOwner && <AdminPanel data={pq.data} busy={busy} onSetPrice={pq.setPrice} />}
        </>
      ) : null}

      <footer>PerpQuest · academic project · Sepolia testnet · contract {CONTRACT_ADDRESS || "not set"}</footer>
    </div>
  );
}
