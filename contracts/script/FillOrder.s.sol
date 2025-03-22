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
        
        bytes32 orderId = hex"3c220b509d1881f335458b7518142af486c00f28e0872f57876e184e61b63852";

        uint256 auctionId = dutchAuction.orderIdToAuctionId(orderId);

        //Bid on the auction
        dutchAuction.placeBid(auctionId);

        // NOTE - encodedOrder logged from the first step goes here
        bytes memory originData = hex"000000000000000000000000000000000000000000000000000000000000002000000000000000000000000019661d036d4e590948b9c00eef3807b88fbfa8e100000000000000000000000019661d036d4e590948b9c00eef3807b88fbfa8e100000000000000000000000030e9b6b0d161cbd5ff8cf904ff4fa43ce66ac346000000000000000000000000b6e3f86a5ce9ac318f54c9c7bcd6eff368df0296000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000000000000000000000000016f90000000000000000000000000000000000000000000000000000000000aa36a70000000000000000000000000000000000000000000000000000000000049310000000000000000000000000225abc7297a686bd4092187b00db81462666e1f20000000000000000000000000000000000000000000000000000000067e081a800000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000000";

        // Approve output tokens
        ERC20(USDT_T1).approve(
            address(dutchAuction),
            1e17 // match amount from order
        );

        // Fill the order
        bytes memory fillerData = abi.encode(TypeCasts.addressToBytes32(solver));
        dutchAuction.fill(orderId, originData, fillerData);

        vm.stopBroadcast();
    }
}