import { useCallback, useEffect, useState } from "react";
import { BrowserProvider } from "ethers";
import { SEPOLIA_CHAIN_ID, SEPOLIA_CHAIN_HEX } from "../config";

export function useWallet() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState("");

  const hasMetaMask = typeof window !== "undefined" && !!window.ethereum;
  const isSepolia = chainId === SEPOLIA_CHAIN_ID;

  const setup = useCallback(async () => {
    if (!window.ethereum) return;
    const p = new BrowserProvider(window.ethereum);
    const accounts = await p.send("eth_accounts", []);
    const net = await p.getNetwork();
    setProvider(p);
    setChainId(net.chainId);
    if (accounts.length) {
      setSigner(await p.getSigner());
      setAccount(accounts[0]);
    } else {
      setSigner(null);
      setAccount("");
    }
  }, []);

  const connect = useCallback(async () => {
    setError("");
    if (!window.ethereum) {
      setError("MetaMask not found. Please install it.");
      return;
    }
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await setup();
    } catch (e) {
      setError(e?.code === 4001 ? "Connection rejected." : e.message);
    }
  }, [setup]);

  const switchToSepolia = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_HEX }],
      });
    } catch (e) {
      if (e?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_HEX,
              chainName: "Sepolia",
              nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      } else {
        setError(e.message);
      }
    }
  }, []);

  useEffect(() => {
    setup();
    if (!window.ethereum) return;
    const reload = () => setup();
    window.ethereum.on("accountsChanged", reload);
    window.ethereum.on("chainChanged", reload);
    return () => {
      window.ethereum.removeListener("accountsChanged", reload);
      window.ethereum.removeListener("chainChanged", reload);
    };
  }, [setup]);

  return { provider, signer, account, chainId, isSepolia, hasMetaMask, error, connect, switchToSepolia };
}
