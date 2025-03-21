// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Auction {
    using SafeERC20 for IERC20;

    constructor() {
    }

    function sendERC20(address token,uint256 amount, address recipient) external {
        IERC20(token).safeTransfer(recipient, amount);
    }
}