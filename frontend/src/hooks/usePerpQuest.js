import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract } from "ethers";
import { ABI } from "../abi";
import { CONTRACT_ADDRESS } from "../config";
import { parseError } from "../utils";

const EMPTY = {
  price: 0n,
  balance: 0n,
  claimed: false,
  xp: 0n,
  trades: 0n,
  wins: 0n,
  level: 1n,
  badges: [false, false, false, false],
  owner: "",
  positions: [],
};

export function usePerpQuest({ provider, signer, account, isSepolia }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState(""); // pending message
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const ready = !!(provider && account && isSepolia && CONTRACT_ADDRESS);

  const reader = useMemo(
    () => (provider && CONTRACT_ADDRESS ? new Contract(CONTRACT_ADDRESS, ABI, provider) : null),
    [provider]
  );

  const refresh = useCallback(async () => {
    if (!ready || !reader) return;
    try {
      const [price, owner, balance, claimed, stats, level, badges, rawPositions] = await Promise.all([
        reader.getPrice(),
        reader.owner(),
        reader.balances(account),
        reader.hasClaimed(account),
        reader.getStats(account),
        reader.getLevel(account),
        reader.getBadges(account),
        reader.getUserPositions(account),
      ]);
      const pnls = await Promise.all(rawPositions.map((p) => reader.getPnL(p.id)));
      const positions = rawPositions
        .map((p, i) => ({
          id: p.id,
          isLong: p.isLong,
          collateral: p.collateral,
          leverage: p.leverage,
          size: p.size,
          entryPrice: p.entryPrice,
          timestamp: p.timestamp,
          isOpen: p.isOpen,
          exitPrice: p.exitPrice,
          pnl: pnls[i],
        }))
        .reverse();
      setData({
        price,
        owner,
        balance,
        claimed,
        xp: stats[0],
        trades: stats[1],
        wins: stats[2],
        level,
        badges: Array.from(badges),
        positions,
      });
    } catch (e) {
      setError(
        "Could not read from contract. Check VITE_CONTRACT_ADDRESS and that you are on Sepolia. " + parseError(e)
      );
    }
  }, [ready, reader, account]);

  useEffect(() => {
    if (!ready) {
      setData(EMPTY);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
    const t = setInterval(refresh, 12000);
    return () => clearInterval(t);
  }, [ready, refresh]);

  const send = useCallback(
    async (label, fn) => {
      setError("");
      setSuccess("");
      try {
        const c = new Contract(CONTRACT_ADDRESS, ABI, signer);
        setTxStatus(`${label}: confirm in MetaMask…`);
        const tx = await fn(c);
        setTxStatus(`${label}: waiting for confirmation…`);
        await tx.wait();
        setSuccess(`${label} confirmed ✔`);
        await refresh();
        return true;
      } catch (e) {
        setError(parseError(e));
        return false;
      } finally {
        setTxStatus("");
      }
    },
    [signer, refresh]
  );

  const claim = () => send("Claim credits", (c) => c.claimCredits());
  const open = (isLong, collateral, leverage) =>
    send("Open position", (c) => c.openPosition(isLong, collateral, leverage));
  const close = (id) => send(`Close position #${id}`, (c) => c.closePosition(id));
  const setPrice = (p) => send("Update price", (c) => c.setPrice(p));

  const isOwner = !!account && !!data.owner && data.owner.toLowerCase() === account.toLowerCase();

  return {
    data,
    loading,
    txStatus,
    error,
    success,
    isOwner,
    ready,
    claim,
    open,
    close,
    setPrice,
    refresh,
    clearMessages: () => {
      setError("");
      setSuccess("");
    },
  };
}
