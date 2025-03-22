// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IT1GatewayCallback} from "./interfaces/IT1GatewayCallback.sol";

contract Auction is IT1GatewayCallback {
    using SafeERC20 for IERC20;

    constructor() {}

    function sendERC20(address token,uint256 amount, address recipient) internal {
        IERC20(token).safeTransfer(recipient, amount);

    }

    function decodeTransferCalldata(bytes memory data) public pure returns (
        address token,
        uint256 amount,
        address wallet
    ) {
        // Require the function selector to match
        bytes4 selector;
        assembly {
            selector := mload(add(data, 32))  // Load first 32 bytes (includes selector)
        }
                
        // Extract each field using assembly since slicing isn't supported for memory
        assembly {
            // Pointer to the start of data (skipping length prefix)
            let dataPtr := add(data, 32)
            
            // Token address is at position 4 (after selector), load 32 bytes and mask to get address
            let tokenData := mload(add(dataPtr, 4))
            // Mask to get only 20 bytes (address size)
            token := and(tokenData, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000000)
            // Shift right to get address in correct position
            token := shr(96, token)
            
            // Amount is at position 24 (after selector + token address)
            amount := mload(add(dataPtr, 24))
            
            // Wallet address is at position 56 (after selector + token address + amount)
            let walletData := mload(add(dataPtr, 56))
            // Mask and shift to get wallet address
            wallet := and(walletData, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000000)
            wallet := shr(96, wallet)
        }
        
        return (token, amount, wallet);
    }

    function onT1GatewayCallback(bytes memory data) external override {
        (address token, uint256 amount, address wallet) = decodeTransferCalldata(data);
        sendERC20(token, amount, wallet);
    }

}