// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/Escrow.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {OrderData, OrderEncoder} from "intents-framework/libs/OrderEncoder.sol";

contract OpenEscrow is Script {
    address l1ERC20Gateway = 0xb1c4A0d657E3dDa7dC4e957C41d49372f69acee2; // L1 Gateway address
    uint32 localDomain = 11155111; // Example local domain ID
    address permit2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3; // Permit2 address
    Escrow public escrow = Escrow(vm.envAddress("ESCROW_ADDR"));
    uint32 constant ORIGIN_CHAIN = 11155111;
    uint32 constant DESTINATION_CHAIN = 299792;
    address constant USDT_SEPOLIA = 0x30E9b6B0d161cBd5Ff8cf904Ff4FA43Ce66AC346;
    address constant USDT_T1 = 0xb6E3F86a5CE9ac318F54C9C7Bcd6eff368DF0296;
    address constant SETTLER = 0x66E1e28A6E6BD3a4c30a53C964e65ADa11Cf9EB8;

    function run() external {
        // Load Alice's private key from env
        uint256 alicePk = vm.envUint("ALICE_PRIVATE_KEY");
        address alice = vm.addr(alicePk);

        // Start broadcasting as Alice
        vm.startBroadcast(alicePk);

        // Approve tokens
        ERC20 inputToken = ERC20(USDT_SEPOLIA);
        ERC20 outputToken = ERC20(USDT_T1);
        inputToken.approve(address(escrow), type(uint256).max);

        // Prepare order data
        OrderData memory orderData = OrderData({
            sender: TypeCasts.addressToBytes32(alice),
            recipient: TypeCasts.addressToBytes32(alice),
            inputToken: TypeCasts.addressToBytes32(address(inputToken)),
            outputToken: TypeCasts.addressToBytes32(address(outputToken)),
            amountIn: 1e17,
            amountOut: 1e17,
            senderNonce: uint32(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            block.timestamp,
                            block.prevrandao,
                            msg.sender
                        )
                    )
                ) % 10_000
            ), // Random number between 0 and 9999
            originDomain: ORIGIN_CHAIN,
            destinationDomain: DESTINATION_CHAIN,
            destinationSettler: TypeCasts.addressToBytes32(SETTLER),
            fillDeadline: uint32(block.timestamp + 24 hours),
            data: new bytes(0)
        });

        bytes memory encodedOrder = OrderEncoder.encode(orderData);

        OnchainCrossChainOrder memory order = _prepareOnchainOrder(
            encodedOrder,
            orderData.fillDeadline,
            OrderEncoder.orderDataType()
        );

        escrow.open{value: 1e6}(order);

        bytes32 id = OrderEncoder.id(orderData);
        console2.logString("orderId: ");
        console2.logBytes32(id);

        console2.log("encodedOrder: ");
        console2.logBytes(encodedOrder);

        vm.stopBroadcast();
    }

    function _prepareOnchainOrder(
        bytes memory orderData,
        uint32 fillDeadline,
        bytes32 orderDataType
    ) internal pure returns (OnchainCrossChainOrder memory) {
        return
            OnchainCrossChainOrder({
                fillDeadline: fillDeadline,
                orderDataType: orderDataType,
                orderData: orderData
            });
    }
}
