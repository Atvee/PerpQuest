// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {PerpQuest} from "../src/PerpQuest.sol";

contract PerpQuestTest is Test {
    PerpQuest pq;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    uint256 constant P = 1e8; // price unit
    uint256 constant U = 1e6; // USDC unit

    function setUp() public {
        pq = new PerpQuest(); // this test contract is the owner
        vm.prank(alice);
        pq.claimCredits();
    }

    // ---------- credits ----------
    function test_ClaimCredits() public view {
        assertEq(pq.balances(alice), 1000 * U);
        assertTrue(pq.hasClaimed(alice));
    }

    function test_RevertWhen_ClaimTwice() public {
        vm.prank(alice);
        vm.expectRevert("Already claimed");
        pq.claimCredits();
    }

    // ---------- price ----------
    function test_InitialPrice() public view {
        assertEq(pq.getPrice(), 2000 * P);
    }

    function test_SetPriceEmitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit PerpQuest.PriceUpdated(2000 * P, 2200 * P);
        pq.setPrice(2200 * P);
        assertEq(pq.getPrice(), 2200 * P);
    }

    function test_RevertWhen_NonOwnerSetsPrice() public {
        vm.prank(alice);
        vm.expectRevert("Not owner");
        pq.setPrice(3000 * P);
    }

    function test_RevertWhen_ZeroPrice() public {
        vm.expectRevert("Price must be > 0");
        pq.setPrice(0);
    }

    // ---------- open ----------
    function test_OpenLong() public {
        vm.prank(alice);
        uint256 id = pq.openPosition(true, 100 * U, 5);
        PerpQuest.Position memory p = pq.getPosition(id);
        assertEq(p.id, 0);
        assertEq(p.owner, alice);
        assertTrue(p.isLong);
        assertEq(p.collateral, 100 * U);
        assertEq(p.leverage, 5);
        assertEq(p.size, 500 * U);
        assertEq(p.entryPrice, 2000 * P);
        assertTrue(p.isOpen);
        assertEq(pq.balances(alice), 900 * U);
    }

    function test_OpenShort() public {
        vm.prank(alice);
        uint256 id = pq.openPosition(false, 200 * U, 3);
        PerpQuest.Position memory p = pq.getPosition(id);
        assertFalse(p.isLong);
        assertEq(p.size, 600 * U);
    }

    function test_UniquePositionIds() public {
        vm.startPrank(alice);
        uint256 a = pq.openPosition(true, 10 * U, 2);
        uint256 b = pq.openPosition(false, 10 * U, 2);
        vm.stopPrank();
        assertEq(a, 0);
        assertEq(b, 1);
        assertEq(pq.getUserPositions(alice).length, 2);
    }

    function test_RevertWhen_InvalidLeverage() public {
        vm.startPrank(alice);
        vm.expectRevert("Leverage must be 2, 3 or 5");
        pq.openPosition(true, 100 * U, 4);
        vm.expectRevert("Leverage must be 2, 3 or 5");
        pq.openPosition(true, 100 * U, 1);
        vm.stopPrank();
    }

    function test_RevertWhen_InsufficientBalance() public {
        vm.prank(alice);
        vm.expectRevert("Insufficient balance");
        pq.openPosition(true, 1001 * U, 2);
    }

    function test_RevertWhen_NoCredits() public {
        vm.prank(bob);
        vm.expectRevert("Insufficient balance");
        pq.openPosition(true, 1 * U, 2);
    }

    function test_RevertWhen_ZeroCollateral() public {
        vm.prank(alice);
        vm.expectRevert("Collateral must be > 0");
        pq.openPosition(true, 0, 2);
    }

    // ---------- PnL ----------
    function test_PnL_Long_Profit() public {
        vm.prank(alice);
        uint256 id = pq.openPosition(true, 100 * U, 5); // size 500
        pq.setPrice(2200 * P); // +10%
        assertEq(pq.getPnL(id), int256(50 * U));
    }

    function test_PnL_Long_Loss() public {
        vm.prank(alice);
        uint256 id = pq.openPosition(true, 100 * U, 5);
        pq.setPrice(1800 * P); // -10%
        assertEq(pq.getPnL(id), -int256(50 * U));
    }

    function test_PnL_Short_Profit() public {
        vm.prank(alice);
        uint256 id = pq.openPosition(false, 100 * U, 5);
        pq.setPrice(1800 * P);
        assertEq(pq.getPnL(id), int256(50 * U));
    }

    function test_PnL_Short_Loss() public {
        vm.prank(alice);
        uint256 id = pq.openPosition(false, 100 * U, 5);
        pq.setPrice(2200 * P);
        assertEq(pq.getPnL(id), -int256(50 * U));
    }

    function test_PnL_CappedAtCollateral() public {
        vm.prank(alice);
        uint256 id = pq.openPosition(true, 100 * U, 5);
        pq.setPrice(1000 * P); // -50% * 5x = -250% -> capped at -100%
        assertEq(pq.getPnL(id), -int256(100 * U));
    }

    // ---------- close ----------
    function test_ClosePosition_Profit() public {
        vm.startPrank(alice);
        uint256 id = pq.openPosition(true, 100 * U, 5);
        vm.stopPrank();
        pq.setPrice(2200 * P);

        vm.prank(alice);
        pq.closePosition(id);

        assertEq(pq.balances(alice), 1050 * U); // 900 + 100 + 50
        PerpQuest.Position memory p = pq.getPosition(id);
        assertFalse(p.isOpen);
        assertEq(p.exitPrice, 2200 * P);
        assertEq(p.realizedPnl, int256(50 * U));
    }

    function test_ClosePosition_Loss() public {
        vm.prank(alice);
        uint256 id = pq.openPosition(true, 100 * U, 5);
        pq.setPrice(1800 * P);

        vm.prank(alice);
        pq.closePosition(id);

        assertEq(pq.balances(alice), 950 * U); // 900 + 100 - 50
    }

    function test_ClosePosition_MaxLossIsCollateral() public {
        vm.prank(alice);
        uint256 id = pq.openPosition(true, 100 * U, 5);
        pq.setPrice(500 * P);

        vm.prank(alice);
        pq.closePosition(id);

        assertEq(pq.balances(alice), 900 * U); // lost exactly the collateral
    }

    function test_RealizedPnlFrozenAfterClose() public {
        vm.prank(alice);
        uint256 id = pq.openPosition(true, 100 * U, 5);
        pq.setPrice(2200 * P);
        vm.prank(alice);
        pq.closePosition(id);
        pq.setPrice(3000 * P);
        assertEq(pq.getPnL(id), int256(50 * U));
    }

    function test_RevertWhen_CloseByNonOwner() public {
        vm.prank(alice);
        uint256 id = pq.openPosition(true, 100 * U, 2);
        vm.prank(bob);
        vm.expectRevert("Not position owner");
        pq.closePosition(id);
    }

    function test_RevertWhen_DoubleClose() public {
        vm.startPrank(alice);
        uint256 id = pq.openPosition(true, 100 * U, 2);
        pq.closePosition(id);
        vm.expectRevert("Position already closed");
        pq.closePosition(id);
        vm.stopPrank();
    }

    function test_RevertWhen_InvalidPosition() public {
        vm.prank(alice);
        vm.expectRevert("Invalid position");
        pq.closePosition(99);
    }

    // ---------- XP ----------
    function test_XP_OpenAndCloseBreakeven() public {
        vm.startPrank(alice);
        uint256 id = pq.openPosition(true, 100 * U, 2);
        (uint256 xp,,) = pq.getStats(alice);
        assertEq(xp, 5);
        pq.closePosition(id); // price unchanged -> pnl 0 -> no bonus
        vm.stopPrank();
        (xp,,) = pq.getStats(alice);
        assertEq(xp, 15);
    }

    function test_XP_ProfitableClose() public {
        vm.prank(alice);
        uint256 id = pq.openPosition(true, 100 * U, 2);
        pq.setPrice(2100 * P);
        vm.prank(alice);
        pq.closePosition(id);
        (uint256 xp, uint256 trades, uint256 wins) = pq.getStats(alice);
        assertEq(xp, 5 + 10 + 15);
        assertEq(trades, 1);
        assertEq(wins, 1);
    }

    function test_XP_LosingCloseNoBonus() public {
        vm.prank(alice);
        uint256 id = pq.openPosition(true, 100 * U, 2);
        pq.setPrice(1900 * P);
        vm.prank(alice);
        pq.closePosition(id);
        (uint256 xp,, uint256 wins) = pq.getStats(alice);
        assertEq(xp, 15);
        assertEq(wins, 0);
    }

    // ---------- level & badges ----------
    function test_LevelAndBadges() public {
        assertEq(pq.getLevel(alice), 1);
        bool[4] memory b = pq.getBadges(alice);
        assertFalse(b[0]);

        vm.prank(alice);
        uint256 id = pq.openPosition(true, 10 * U, 2);
        pq.setPrice(2100 * P);
        vm.prank(alice);
        pq.closePosition(id);

        b = pq.getBadges(alice);
        assertTrue(b[0]); // First Trade
        assertTrue(b[1]); // Profit Maker
        assertFalse(b[2]);
        assertFalse(b[3]);
    }

    function test_LevelUp() public {
        // each profitable round trip = 30 XP; 4 trips = 120 XP -> level 2
        for (uint256 i = 0; i < 4; i++) {
            pq.setPrice(2000 * P);
            vm.prank(alice);
            uint256 id = pq.openPosition(true, 10 * U, 2);
            pq.setPrice(2100 * P);
            vm.prank(alice);
            pq.closePosition(id);
        }
        assertEq(pq.getLevel(alice), 2);
    }
}
