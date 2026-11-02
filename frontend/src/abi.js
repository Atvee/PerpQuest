// Human-readable ABI (ethers v6)
export const ABI = [
  "function owner() view returns (address)",
  "function hasClaimed(address) view returns (bool)",
  "function balances(address) view returns (uint256)",
  "function getPrice() view returns (uint256)",
  "function getStats(address) view returns (uint256 xp, uint256 trades, uint256 profitableTrades)",
  "function getLevel(address) view returns (uint256)",
  "function getBadges(address) view returns (bool[4])",
  "function getPnL(uint256 positionId) view returns (int256)",
  "function getUserPositions(address) view returns (tuple(uint256 id, address owner, bool isLong, uint256 collateral, uint256 leverage, uint256 size, uint256 entryPrice, uint256 timestamp, bool isOpen, uint256 exitPrice, int256 realizedPnl)[])",
  "function claimCredits()",
  "function openPosition(bool isLong, uint256 collateral, uint256 leverage) returns (uint256)",
  "function closePosition(uint256 positionId)",
  "function setPrice(uint256 newPrice)",
  "event PriceUpdated(uint256 oldPrice, uint256 newPrice)",
];
