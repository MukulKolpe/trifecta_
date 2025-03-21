// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/Escrow.sol";

contract DeployEscrow is Script {
    function run() external {
        // Replace these with actual values before deploying
        vm.startBroadcast();
        address l1ERC20Gateway = 0xb1c4A0d657E3dDa7dC4e957C41d49372f69acee2;  // L1 Gateway address
        uint32 localDomain = 11155111;  // Example local domain ID
        address permit2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;  // Permit2 address

        // Deploy Escrow contract
        Escrow escrow = new Escrow(l1ERC20Gateway, localDomain, permit2);

        console.log("Escrow deployed at:", address(escrow));

        vm.stopBroadcast();
    }
}