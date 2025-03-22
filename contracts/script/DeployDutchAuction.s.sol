// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/DutchAuction.sol";

contract DeployDutchAuction is Script {
    function run() external {
        // Replace these with actual values before deploying
        uint32 ORIGIN_CHAIN = 299792;
        vm.startBroadcast();

        // Deploy Dutch Auction contract
        DutchAuction auction = new DutchAuction(address(0), ORIGIN_CHAIN);

        console.log("Dutch Auction deployed at:", address(auction));

        vm.stopBroadcast();
    }
}