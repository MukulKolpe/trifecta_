// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/Escrow.sol";

contract DeployEscrow is Script {
    function run() external {
        // Replace these with actual values before deploying
        vm.startBroadcast();
        address l1ERC20Gateway = 0x081eca2C5143e499d231997DFd019216A17586eA;  // L1 Gateway address
        address l1MessageQueue = 0xf8441821eF3982F1314DD242D668264Dc4783434;  // L1 Message Queue address
        uint32 localDomain = 11155111;  // Example local domain ID
        address permit2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;  // Permit2 address
        address settler = vm.envAddress("DUTCH_AUCTION_ADDR");  // Settler address

        // Deploy Escrow contract
        Escrow escrow = new Escrow(l1ERC20Gateway,l1MessageQueue, localDomain, permit2);

        console.log("Escrow deployed at:", address(escrow));

        escrow.setSettlementContract(settler);

        vm.stopBroadcast();
    }
}