// SPDX-License-Identifier: MIT
import "forge-std/Script.sol";
import "../src/DutchAuction.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { TypeCasts } from "@hyperlane-xyz/libs/TypeCasts.sol";
contract FillOrder is Script {
     function run() external {
        uint256 solverPk = vm.envUint("TEST_PRIVATE_KEY");
        address solver = vm.addr(solverPk);
        address USDT_T1 = 0xb6E3F86a5CE9ac318F54C9C7Bcd6eff368DF0296;
        vm.startBroadcast(solverPk);

        // Get order details
        DutchAuction dutchAuction = DutchAuction(vm.envAddress("DUTCH_AUCTION_ADDR"));
        
        bytes32 orderId = hex"4e5a824436f8dc396a89d81dda5f3408fc1fa0edbb322e3f9b9b7328fd22fcb0";

        uint256 auctionId = dutchAuction.orderIdToAuctionId(orderId);

        //Bid on the auction
        dutchAuction.placeBid(auctionId);

        // NOTE - encodedOrder logged from the first step goes here
        bytes memory originData = hex"000000000000000000000000000000000000000000000000000000000000002000000000000000000000000019661d036d4e590948b9c00eef3807b88fbfa8e100000000000000000000000019661d036d4e590948b9c00eef3807b88fbfa8e100000000000000000000000030e9b6b0d161cbd5ff8cf904ff4fa43ce66ac346000000000000000000000000b6e3f86a5ce9ac318f54c9c7bcd6eff368df0296000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000000000000000000000000015220000000000000000000000000000000000000000000000000000000000aa36a70000000000000000000000000000000000000000000000000000000000049310000000000000000000000000bf59f5a5931b9013a6d3724d0d3a2a0abafe3afc0000000000000000000000000000000000000000000000000000000067e1307400000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000000";

        // Approve output tokens
        ERC20(USDT_T1).approve(
            address(dutchAuction),
            10e17 // match amount from order
        );

        // Fill the order
        bytes memory fillerData = abi.encode(TypeCasts.addressToBytes32(solver));
        dutchAuction.fill(orderId, originData, fillerData);

        vm.stopBroadcast();
    }
}