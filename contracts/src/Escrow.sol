// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;
import { BasicSwap7683 } from "intents-framework/BasicSwap7683.sol";
import {OnchainCrossChainOrder, ResolvedCrossChainOrder} from "intents-framework/ERC7683/IERC7683.sol";
import "./interfaces/IL1ERC20Gateway.sol";
import "./interfaces/IL1MessageQueue.sol";
import { TypeCasts } from "@hyperlane-xyz/libs/TypeCasts.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IT1GatewayCallback} from "./interfaces/IT1GatewayCallback.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { TypeCasts } from "@hyperlane-xyz/libs/TypeCasts.sol";
import { IT1Messenger } from "./interfaces/IT1Messenger.sol";
import { Hyperlane7683Message } from "intents-framework/libs/Hyperlane7683Message.sol";

contract Escrow is BasicSwap7683, Ownable, IT1GatewayCallback {
    using SafeERC20 for IERC20;
    // ============ Constants ============
    uint32 public immutable localDomain;
    IL1ERC20Gateway public immutable l1ERC20Gateway;
    IL1MessageQueue public immutable l1MessageQueue;
    uint256 internal constant gasLimit = 1_000_000;
    address public constant USDT_T1 =
        0xb6E3F86a5CE9ac318F54C9C7Bcd6eff368DF0296;
    IT1Messenger public immutable messenger;
    address public counterpart;

    // ============ Storage variables ============
    mapping(uint256 => address) public chainToAuction;
    address public settlementContract;

    // ============ Errors ============
    error OnlyMessenger();
    error FunctionNotImplemented(string functionName);
    error EthNotAllowed();

    // ============ Modifiers ============

    modifier onlyMessenger() {
        if (_msgSender() != address(messenger)) revert OnlyMessenger();
        _;
    }

    // ============ Constructor ============
    constructor(
        address _l1ERC20Gateway,
        address _l1MessageQueue,
        uint32 localDomain_,
        address _permit2,
        address _messenger,
        address _counterpart
    ) Ownable(msg.sender) BasicSwap7683(_permit2) {
        l1ERC20Gateway = IL1ERC20Gateway(_l1ERC20Gateway);
        l1MessageQueue = IL1MessageQueue(_l1MessageQueue);
        localDomain = localDomain_;
        counterpart = _counterpart;
        messenger = IT1Messenger(_messenger);
    }

    // ============ External Functions ============

    /// @notice Opens an ERC 7683 order and deposits the token to the auction contract.
    /// @param _order The order to open.
    function open(
        OnchainCrossChainOrder calldata _order
    ) external payable override {
        (
            ResolvedCrossChainOrder memory resolvedOrder,
            bytes32 orderId,
            uint256 nonce
        ) = _resolveOrder(_order);
        openOrders[orderId] = abi.encode(
            _order.orderDataType,
            _order.orderData
        );
        orderStatus[orderId] = OPENED;
        _useNonce(msg.sender, nonce);

        uint256 totalValue;
        for (uint256 i = 0; i < resolvedOrder.minReceived.length; i++) {
            address token = TypeCasts.bytes32ToAddress(
                resolvedOrder.minReceived[i].token
            );
            if (token == address(0)) {
                totalValue += resolvedOrder.minReceived[i].amount;
            } else {
                bytes4 selector = getSelector("createAuction(address,uint256,address,uint256,address,bytes32)");
                IERC20(token).approve(address(l1ERC20Gateway), resolvedOrder.minReceived[i].amount);
                IERC20(token).transferFrom(
                    msg.sender,
                    address(this),
                    resolvedOrder.minReceived[i].amount
                );
                uint256 fees = l1MessageQueue.estimateCrossDomainMessageFee(gasLimit);
                // To be replaced with message passing
                // Did not find a function to parse with message and call(since we need to directly call createAuction on destination chain)
                // So fallback to depositERC20AndCall
                // In future this can be replaced with messageAndCall using t1 protocol
                l1ERC20Gateway.depositERC20AndCall{value: fees}(
                    token,
                    counterpart,
                    1,
                    abi.encodePacked(selector,token,resolvedOrder.minReceived[i].amount,USDT_T1,resolvedOrder.maxSpent[i].amount, msg.sender, orderId),
                    gasLimit
                );
            }
        }

        // if (msg.value != totalValue) revert InvalidNativeAmount();

        emit Open(orderId, resolvedOrder);
    }

    /// @notice Sets the settlement contract address.
    /// @param _settlementContract The address of the settlement contract.
    function setSettlementContract(
        address _settlementContract
    ) external onlyOwner {
        settlementContract = _settlementContract;
    }

    /// @notice Sets the counterpart address.
    /// @param _counterpart The address of the counterpart contract.
    function setCounterpart(
        address _counterpart
    ) external onlyOwner {
        counterpart = _counterpart;
    }

    // ============ Internal Functions ============

    /// @notice Dispatches a refund message to the specified domain.
    /// @dev Encodes the refund message using Hyperlane7683Message and dispatches it via the GasRouter.
    /// @param _originDomain The domain to which the refund message is sent.
    /// @param _orderIds The IDs of the orders to refund.
    function _dispatchRefund(
        uint32 _originDomain,
        bytes32[] memory _orderIds
    ) internal override {}

    /// @notice Handles an incoming message
    /// @param _origin The origin domain
    /// @param _sender The sender address
    /// @param _message The message
    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _message
    ) external payable onlyMessenger {
        _handle(_origin, _sender, _message);
    }

    /// @notice Handles incoming messages
    /// @dev Decodes the message and processes settlement or refund operations accordingly
    /// @dev _originDomain The domain from which the message originates (unused in this implementation)
    /// @dev _sender The address of the sender on the origin domain (unused in this implementation)
    /// @param _message The encoded message received via t1
    function _handle(uint32, bytes32, bytes calldata _message) internal {
        (
            bool _settle,
            bytes32[] memory _orderIds,
            bytes[] memory _ordersFillerData
        ) = Hyperlane7683Message.decode(_message);

        for (uint256 i = 0; i < _orderIds.length; i++) {
            if (_settle) {
                _handleSettleOrder(
                    _orderIds[i],
                    abi.decode(_ordersFillerData[i], (bytes32))
                );
            } else {
                _handleRefundOrder(_orderIds[i]);
            }
        }
    }

    /// @notice Dispatches a settlement message to the specified domain.
    /// @dev Encodes the settle message using Hyperlane7683Message and dispatches it via the GasRouter.
    /// @param _originDomain The domain to which the settlement message is sent.
    /// @param _orderIds The IDs of the orders to settle.
    /// @param _ordersFillerData The filler data for the orders.
    function _dispatchSettle(
        uint32 _originDomain,
        bytes32[] memory _orderIds,
        bytes[] memory _ordersFillerData
    ) internal override {
        if (msg.value != 0) revert EthNotAllowed();
        bytes memory innerMessage = Hyperlane7683Message.encodeSettle(
            _orderIds,
            _ordersFillerData
        );
        bytes memory outerMessage = abi.encodeWithSelector(
            Escrow.handle.selector,
            _originDomain,
            TypeCasts.addressToBytes32(address(this)),
            innerMessage
        );
        messenger.sendMessage(
            counterpart,
            0,
            outerMessage,
            gasLimit,
            uint64(_originDomain)
        );
    }

    /// @notice Retrieves the local domain identifier.
    /// @dev This function overrides the `_localDomain` function from the parent contract.
    /// @return The local domain ID.
    function _localDomain() internal view override returns (uint32) {
        return localDomain;
    }

    /// @notice Retrieves the selector for a given function signature.
    /// @param functionSignature The function signature.
    /// @return The selector.
    function getSelector(
        string memory functionSignature
    ) internal pure returns (bytes4) {
        return bytes4(keccak256(bytes(functionSignature)));
    }

   
    function onT1GatewayCallback(bytes memory data) external override {}
}