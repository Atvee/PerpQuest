// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PerpQuest} from "../src/PerpQuest.sol";

contract Deploy is Script {
    function run() external returns (PerpQuest pq) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        pq = new PerpQuest();
        vm.stopBroadcast();
        console.log("PerpQuest deployed at:", address(pq));
        console.log("Owner:", pq.owner());
    }
}
