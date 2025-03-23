// SPDX-License-Identifier: MIT
import "forge-std/Script.sol";
import "../src/DutchAuction.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { TypeCasts } from "@hyperlane-xyz/libs/TypeCasts.sol";

contract SettleOrder is Script {
     function run() external {
        uint256 solverPk = vm.envUint("TEST_PRIVATE_KEY");
        vm.startBroadcast(solverPk);
        // Get order details
        DutchAuction dutchAuction = DutchAuction(vm.envAddress("DUTCH_AUCTION_ADDR"));
        // Prepare order IDs and filler data for batch settlement
        bytes32[] memory orderIds = new bytes32[](1);
        // NOTE - orderId logged from the first step goes here (remove 0x first)
        orderIds[0] = hex"4e5a824436f8dc396a89d81dda5f3408fc1fa0edbb322e3f9b9b7328fd22fcb0";
        
        dutchAuction.settle{ value: 0 }(orderIds);

        vm.stopBroadcast();
    }
}