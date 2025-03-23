// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/DutchAuction.sol";

contract DeployDutchAuction is Script {
    function run() external {
        // Replace these with actual values before deploying
        uint32 ORIGIN_CHAIN = 299792;
        address messenger = 0x627B3692969b7330b8Faed2A8836A41EB4aC1918;
        address counterpart = vm.envAddress("ESCROW_ADDR"); // Escrow contract address
        vm.startBroadcast();

        // Deploy Dutch Auction contract
        DutchAuction auction = new DutchAuction(address(0), ORIGIN_CHAIN,messenger, counterpart);

        console.log("Dutch Auction deployed at:", address(auction));

        vm.stopBroadcast();
    }
}