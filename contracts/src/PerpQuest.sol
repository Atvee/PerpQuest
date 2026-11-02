// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PerpQuest
/// @notice Gamified mini perpetual-trading simulator (ETH/USD). Educational only.
/// @dev Virtual USDC uses 6 decimals. ETH price uses 8 decimals (like Chainlink).
///      The price is a SIMULATED oracle controlled by the owner.
contract PerpQuest {
    // ------------------------------------------------------------------
    // Constants
    // ------------------------------------------------------------------
    uint256 public constant CREDIT_AMOUNT = 1_000e6; // 1,000 virtual USDC
    uint256 public constant PRICE_DECIMALS = 1e8;
    uint256 public constant XP_OPEN = 5;
    uint256 public constant XP_CLOSE = 10;
    uint256 public constant XP_PROFIT_BONUS = 15;
    uint256 public constant XP_PER_LEVEL = 100;

    // ------------------------------------------------------------------
    // Types
    // ------------------------------------------------------------------
    struct Position {
        uint256 id;
        address owner;
        bool isLong;
        uint256 collateral; // 6 decimals
        uint256 leverage; // 2, 3 or 5
        uint256 size; // collateral * leverage, 6 decimals
        uint256 entryPrice; // 8 decimals
        uint256 timestamp;
        bool isOpen;
        uint256 exitPrice; // 0 while open
        int256 realizedPnl; // 0 while open
    }

    struct Stats {
        uint256 xp;
        uint256 trades;
        uint256 profitableTrades;
    }

    // ------------------------------------------------------------------
    // Storage
    // ------------------------------------------------------------------
    address public owner;
    uint256 private ethPrice;

    mapping(address => uint256) public balances;
    mapping(address => bool) public hasClaimed;
    mapping(address => Stats) private stats;

    Position[] private positions;
    mapping(address => uint256[]) private userPositionIds;

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------
    event CreditsClaimed(address indexed user, uint256 amount);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event PositionOpened(
        uint256 indexed id,
        address indexed user,
        bool isLong,
        uint256 collateral,
        uint256 leverage,
        uint256 entryPrice
    );
    event PositionClosed(uint256 indexed id, address indexed user, int256 pnl, uint256 payout);

    // ------------------------------------------------------------------
    // Modifiers / constructor
    // ------------------------------------------------------------------
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        ethPrice = 2_000 * PRICE_DECIMALS;
        emit PriceUpdated(0, ethPrice);
    }

    // ------------------------------------------------------------------
    // Virtual credits
    // ------------------------------------------------------------------
    function claimCredits() external {
        require(!hasClaimed[msg.sender], "Already claimed");
        hasClaimed[msg.sender] = true;
        balances[msg.sender] += CREDIT_AMOUNT;
        emit CreditsClaimed(msg.sender, CREDIT_AMOUNT);
    }

    // ------------------------------------------------------------------
    // Price (simulated oracle)
    // ------------------------------------------------------------------
    /// @param newPrice ETH/USD price with 8 decimals (e.g. 2200e8)
    function setPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be > 0");
        uint256 old = ethPrice;
        ethPrice = newPrice;
        emit PriceUpdated(old, newPrice);
    }

    function getPrice() public view returns (uint256) {
        return ethPrice;
    }

    // ------------------------------------------------------------------
    // Trading
    // ------------------------------------------------------------------
    function openPosition(bool isLong, uint256 collateral, uint256 leverage) external returns (uint256 id) {
        require(leverage == 2 || leverage == 3 || leverage == 5, "Leverage must be 2, 3 or 5");
        require(collateral > 0, "Collateral must be > 0");
        require(balances[msg.sender] >= collateral, "Insufficient balance");

        balances[msg.sender] -= collateral;

        id = positions.length;
        positions.push(
            Position({
                id: id,
                owner: msg.sender,
                isLong: isLong,
                collateral: collateral,
                leverage: leverage,
                size: collateral * leverage,
                entryPrice: ethPrice,
                timestamp: block.timestamp,
                isOpen: true,
                exitPrice: 0,
                realizedPnl: 0
            })
        );
        userPositionIds[msg.sender].push(id);

        Stats storage s = stats[msg.sender];
        s.trades += 1;
        s.xp += XP_OPEN;

        emit PositionOpened(id, msg.sender, isLong, collateral, leverage, ethPrice);
    }

    function closePosition(uint256 positionId) external {
        require(positionId < positions.length, "Invalid position");
        Position storage p = positions[positionId];
        require(p.owner == msg.sender, "Not position owner");
        require(p.isOpen, "Position already closed");

        int256 pnl = _calcPnl(p, ethPrice);

        // pnl is floored at -collateral, so payout is never negative
        uint256 payout = uint256(int256(p.collateral) + pnl);

        p.isOpen = false;
        p.exitPrice = ethPrice;
        p.realizedPnl = pnl;
        balances[msg.sender] += payout;

        Stats storage s = stats[msg.sender];
        s.xp += XP_CLOSE;
        if (pnl > 0) {
            s.xp += XP_PROFIT_BONUS;
            s.profitableTrades += 1;
        }

        emit PositionClosed(positionId, msg.sender, pnl, payout);
    }

    // ------------------------------------------------------------------
    // PnL
    // ------------------------------------------------------------------
    /// @notice PnL in virtual USDC (6 decimals). Final value if closed, unrealized if open.
    function getPnL(uint256 positionId) public view returns (int256) {
        require(positionId < positions.length, "Invalid position");
        Position storage p = positions[positionId];
        if (!p.isOpen) return p.realizedPnl;
        return _calcPnl(p, ethPrice);
    }

    function _calcPnl(Position storage p, uint256 price) internal view returns (int256 pnl) {
        int256 diff = int256(price) - int256(p.entryPrice);
        if (!p.isLong) diff = -diff;
        pnl = (int256(p.size) * diff) / int256(p.entryPrice);
        int256 maxLoss = -int256(p.collateral);
        if (pnl < maxLoss) pnl = maxLoss;
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------
    function getPosition(uint256 positionId) external view returns (Position memory) {
        require(positionId < positions.length, "Invalid position");
        return positions[positionId];
    }

    function getUserPositions(address user) external view returns (Position[] memory result) {
        uint256[] storage ids = userPositionIds[user];
        result = new Position[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = positions[ids[i]];
        }
    }

    function totalPositions() external view returns (uint256) {
        return positions.length;
    }

    function getStats(address user) external view returns (uint256 xp, uint256 trades, uint256 profitableTrades) {
        Stats storage s = stats[user];
        return (s.xp, s.trades, s.profitableTrades);
    }

    function getLevel(address user) public view returns (uint256) {
        return stats[user].xp / XP_PER_LEVEL + 1;
    }

    /// @notice [First Trade, Profit Maker, Veteran (10 trades), Level 5]
    function getBadges(address user) external view returns (bool[4] memory b) {
        Stats storage s = stats[user];
        b[0] = s.trades >= 1;
        b[1] = s.profitableTrades >= 1;
        b[2] = s.trades >= 10;
        b[3] = getLevel(user) >= 5;
    }
}
