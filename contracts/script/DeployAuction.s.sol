pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/Auction.sol";

contract DeployAuction is Script {
    function run() external {
        // Replace these with actual values before deploying
        vm.startBroadcast();
        

        // Deploy Escrow contract
        Auction auction = new Auction();

        console.log("Auction deployed at:", address(auction));

        vm.stopBroadcast();
    }
}