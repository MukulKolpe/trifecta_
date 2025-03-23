// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IT1GatewayCallback} from "./interfaces/IT1GatewayCallback.sol";
import { Base7683 } from "intents-framework/BasicSwap7683.sol";
import {BasicSwap7683} from "./BasicSwap7683.sol";
import { OrderData , OrderEncoder } from "intents-framework/libs/OrderEncoder.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { TypeCasts } from "@hyperlane-xyz/libs/TypeCasts.sol";
import { IT1Messenger } from "./interfaces/IT1Messenger.sol";
import { Hyperlane7683Message } from "intents-framework/libs/Hyperlane7683Message.sol";


/**
 * @title DutchAuction
 * @notice Implements a Dutch auction for cross-chain bridging requests
 * @dev This contract facilitates auctions for bridge requests from L1 to t1
 */
contract DutchAuction is IT1GatewayCallback,Base7683,BasicSwap7683,Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint32 public immutable localDomain;
    IT1Messenger public immutable messenger;
    address public counterpart;
    uint32 internal constant DEFAULT_GAS_LIMIT = 1_000_000;

    // ============ Structs ============

    struct TokenInfo {
        address sourceToken; // Token on t1 being auctioned
        uint256 sourceAmount; // Amount of tokens being auctioned
        address destToken; // Token on destination chain
        uint256 minDestAmount; // Minimum amount of tokens on destination
    }

    struct TimeInfo {
        uint256 startTime; // Start time of the auction
        uint256 endTime; // End time of the auction
        uint256 startPrice; // Starting price of the auction
        uint256 endPrice; // Reserve/end price of the auction
    }

    struct BidInfo {
        address winner; // Winner of the auction
        uint256 winningBid; // Amount of tokens bid by the winner
        bool settled; // Whether the auction has been settled
    }

    struct AuctionParties {
        address user; // Original user who initiated the bridge
        bytes32 orderId; // Order ID from the originating bridge transaction
    }

    // ============ State Variables ============

    // Mappings for auction data
    mapping(uint256 => TokenInfo) public auctionTokens;
    mapping(uint256 => TimeInfo) public auctionTimes;
    mapping(uint256 => BidInfo) public auctionBids;
    mapping(uint256 => AuctionParties) public auctionParties;
    mapping(bytes32 => uint256) public orderIdToAuctionId;

    // Counter for auction IDs
    uint256 public nextAuctionId;

    // Settlement contract on the destination chain
    address public settlementContract;

    // Default auction duration in seconds
    uint256 public defaultAuctionDuration = 10 minutes;

    // Default price drop percentage (95% = 0.95 * 1e18)
    uint256 public defaultPriceDropPercent = 95 * 1e16;

    // ============ Events ============

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed user,
        address sourceToken,
        uint256 sourceAmount,
        address destToken,
        uint256 minDestAmount,
        uint256 startTime,
        uint256 endTime,
        bytes32 orderId
    );

    event AuctionBid(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 bidAmount
    );

    event AuctionSettled(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 winningBid
    );

    event FundsWithdrawn(
        uint256 indexed auctionId,
        address indexed recipient,
        address token,
        uint256 amount
    );
    
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

    constructor(address _permit2,uint32 localDomain_,address _messenger,address _counterpart) Ownable(msg.sender) BasicSwap7683(_permit2) {
        localDomain = localDomain_;
        counterpart = _counterpart;
        messenger = IT1Messenger(_messenger);
    }

    // ============ External Functions ============

   
    /**
     * @notice Process callback from the bridge gateway
     * @dev Creates an auction for the received tokens
     * @param data The callback data containing token info and recipient
     */
    function onT1GatewayCallback(bytes memory data) external override {
        (
            address inputToken,
            uint256 amount,
            address outputToken,
            uint256 maxSpentAmount,
            address user,
            bytes32 orderId
        ) = decodeCallbackData(data);

        // Create a new auction
        _createAuction(inputToken, amount,outputToken,maxSpentAmount,user,orderId);
    }

    /**
     * @notice Place a bid for an auction
     * @dev Bids can only be placed during the auction period
     * @dev The first bid to accept the current price wins
     * @param auctionId The ID of the auction to bid on
     */
    function placeBid(uint256 auctionId) external nonReentrant {
        require(_auctionExists(auctionId), "Auction does not exist");

        TimeInfo storage times = auctionTimes[auctionId];
        BidInfo storage bid = auctionBids[auctionId];

        require(block.timestamp >= times.startTime, "Auction has not started");
        require(block.timestamp <= times.endTime, "Auction has ended");
        require(bid.winner == address(0), "Auction already has a winner");

        // Calculate current price based on Dutch auction formula
        uint256 currentPrice = _getCurrentPrice(auctionId);

        // The bidder is the first to accept the current price
        bid.winner = msg.sender;
        bid.winningBid = currentPrice;

        emit AuctionBid(auctionId, msg.sender, currentPrice);
    }

    /**
     * @notice Settle an auction after it has a winner
     * @dev Only the winner can call this function
     * @param auctionId The ID of the auction to settle
     */
    // function settleAuction(uint256 auctionId,bytes32 _orderId, bytes calldata _originData, bytes calldata _fillerData) external nonReentrant {
    //     require(_auctionExists(auctionId), "Auction does not exist");

    //     TokenInfo storage tokens = auctionTokens[auctionId];
    //     BidInfo storage bid = auctionBids[auctionId];

    //     require(bid.winner == msg.sender, "Only the winner can settle");
    //     require(!bid.settled, "Auction already settled");

    //     // // Mark auction as settled
    //     // bid.settled = true;

    //     // // Transfer the source tokens to the winner
    //     // IERC20(tokens.sourceToken).safeTransfer(
    //     //     bid.winner,
    //     //     tokens.sourceAmount
    //     // );

    //     emit AuctionSettled(auctionId, bid.winner, bid.winningBid);
    // }

    /**
     * @notice Fills a single leg of a particular order on the destination chain
     * @param _orderId Unique order identifier for this order
     * @param _originData Data emitted on the origin to parameterize the fill
     * @param _fillerData Data provided by the filler to inform the fill or express their preferences. It should
     * contain the bytes32 encoded address of the receiver which is used at settlement time
     */
    function fill(bytes32 _orderId, bytes calldata _originData, bytes calldata _fillerData) external payable override {
        uint256 auctionId = orderIdToAuctionId[_orderId];
        require(_auctionExists(auctionId), "Auction does not exist");
        TokenInfo storage tokens = auctionTokens[auctionId];
        BidInfo storage bid = auctionBids[auctionId];

        require(bid.winner == msg.sender, "Only the winner can settle");
        require(!bid.settled, "Auction already settled");
        if (orderStatus[_orderId] != UNKNOWN) revert InvalidOrderStatus();

        // Fill intent order
        _fillOrder(_orderId, _originData, _fillerData);

        orderStatus[_orderId] = FILLED;
        filledOrders[_orderId] = FilledOrder(_originData, _fillerData);
        // Mark auction as settled
        bid.settled = true;

        emit Filled(_orderId, _originData, _fillerData);
    }

    /**
     * @notice Create an auction manually
     * @dev Only owner can call this function
     */
    function createAuction(
        address sourceToken,
        uint256 sourceAmount,
        address destToken,
        uint256 minDestAmount,
        address user,
        bytes32 orderId
    ) external onlyOwner returns (uint256) {
        return
            _createAuction(
                sourceToken,
                sourceAmount,
                destToken,
                minDestAmount,
                user,
                orderId
            );
    }

    /**
     * @notice Set the settlement contract address
     * @param _settlementContract The address of the settlement contract
     */
    function setSettlementContract(
        address _settlementContract
    ) external onlyOwner {
        settlementContract = _settlementContract;
    }

    /**
     * @notice Set the default auction duration
     * @param _defaultAuctionDuration Duration in seconds
     */
    function setDefaultAuctionDuration(
        uint256 _defaultAuctionDuration
    ) external onlyOwner {
        defaultAuctionDuration = _defaultAuctionDuration;
    }

    /**
     * @notice Set the default price drop percentage
     * @param _defaultPriceDropPercent Percentage as 1e18 based value (100% = 1e18)
     */
    function setDefaultPriceDropPercent(
        uint256 _defaultPriceDropPercent
    ) external onlyOwner {
        require(
            _defaultPriceDropPercent < 1e18,
            "Price drop must be less than 100%"
        );
        defaultPriceDropPercent = _defaultPriceDropPercent;
    }

    /**
     * @notice End an auction that has no winner after the end time
     * @dev This allows recycling failed auctions
     * @param auctionId The ID of the auction to end
     */
    function endFailedAuction(uint256 auctionId) external {
        require(_auctionExists(auctionId), "Auction does not exist");

        TokenInfo storage tokens = auctionTokens[auctionId];
        TimeInfo storage times = auctionTimes[auctionId];
        BidInfo storage bid = auctionBids[auctionId];
        AuctionParties storage parties = auctionParties[auctionId];

        require(block.timestamp > times.endTime, "Auction not ended yet");
        require(bid.winner == address(0), "Auction has a winner");

        // Return tokens to the user
        IERC20(tokens.sourceToken).safeTransfer(
            parties.user,
            tokens.sourceAmount
        );

        // Mark as settled to prevent reuse
        bid.settled = true;
    }

    // ============ View Functions ============

    /**
     * @notice Check if an auction exists
     * @param auctionId The ID of the auction to check
     * @return true if auction exists, false otherwise
     */
    function auctionExists(uint256 auctionId) external view returns (bool) {
        return _auctionExists(auctionId);
    }

    /**
     * @notice Get current auction price
     * @param auctionId The ID of the auction
     * @return price The current price of the auction
     */
    function getCurrentPrice(
        uint256 auctionId
    ) external view returns (uint256) {
        require(_auctionExists(auctionId), "Auction does not exist");
        return _getCurrentPrice(auctionId);
    }

   /**
 * @notice Parse callback data from bridge with additional parameters
 */
/**
     * @notice Parse callback data from bridge
     */
    function decodeCallbackData(
        bytes memory data
    )
        public
        pure
        returns (address inputToken, uint256 amount, address outputToken,
            uint256 maxSpentAmount, address user, bytes32 orderId)
    {
        // Extract function selector
        bytes4 selector;
        assembly {
            selector := mload(add(data, 32))
        }

        // Parse the data fields
        assembly {
            // Pointer to the start of data (skipping length prefix)
            let dataPtr := add(data, 32)

            // Token address is at position 4 (after selector)
            let tokenData := mload(add(dataPtr, 4))
            inputToken := and(
                tokenData,
                0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000000
            )
            inputToken := shr(96, inputToken)

            // Amount is at position 24 (after selector + token address)
            amount := mload(add(dataPtr, 24))

            // Token address is at position 56
            let tokenData2 := mload(add(dataPtr, 56))
            outputToken := and(
                tokenData2,
                0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000000
            )
            outputToken := shr(96, outputToken)

            // Max spent amount is at position 76
            maxSpentAmount := mload(add(dataPtr, 76))


            // User address is at position 108
            let userData := mload(add(dataPtr, 108))
            user := and(
                userData,
                0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000000
            )
            user := shr(96, user)

            // Order ID is at position 128
            orderId := mload(add(dataPtr, 128))
        }

        return (inputToken, amount,outputToken,maxSpentAmount, user, orderId);
    }

    /**
     * @notice Get source token for an auction
     * @param auctionId The ID of the auction
     * @return The address of the source token
     */
    function getSourceToken(uint256 auctionId) external view returns (address) {
        return auctionTokens[auctionId].sourceToken;
    }

    /**
     * @notice Get source amount for an auction
     * @param auctionId The ID of the auction
     * @return The amount of source tokens
     */
    function getSourceAmount(
        uint256 auctionId
    ) external view returns (uint256) {
        return auctionTokens[auctionId].sourceAmount;
    }

    /**
     * @notice Get destination token for an auction
     * @param auctionId The ID of the auction
     * @return The address of the destination token
     */
    function getDestToken(uint256 auctionId) external view returns (address) {
        return auctionTokens[auctionId].destToken;
    }

    /**
     * @notice Get minimum destination amount for an auction
     * @param auctionId The ID of the auction
     * @return The minimum amount of destination tokens
     */
    function getMinDestAmount(
        uint256 auctionId
    ) external view returns (uint256) {
        return auctionTokens[auctionId].minDestAmount;
    }

    /**
     * @notice Get user who initiated the auction
     * @param auctionId The ID of the auction
     * @return The address of the user
     */
    function getUser(uint256 auctionId) external view returns (address) {
        return auctionParties[auctionId].user;
    }

    /**
     * @notice Get order ID for an auction
     * @param auctionId The ID of the auction
     * @return The order ID
     */
    function getOrderId(uint256 auctionId) external view returns (bytes32) {
        return auctionParties[auctionId].orderId;
    }

    /**
     * @notice Get winner of an auction
     * @param auctionId The ID of the auction
     * @return The address of the winner (zero address if no winner)
     */
    function getWinner(uint256 auctionId) external view returns (address) {
        return auctionBids[auctionId].winner;
    }

    /**
     * @notice Get winning bid for an auction
     * @param auctionId The ID of the auction
     * @return The amount of the winning bid
     */
    function getWinningBid(uint256 auctionId) external view returns (uint256) {
        return auctionBids[auctionId].winningBid;
    }

    /**
     * @notice Check if an auction is settled
     * @param auctionId The ID of the auction
     * @return true if settled, false otherwise
     */
    function isSettled(uint256 auctionId) external view returns (bool) {
        return auctionBids[auctionId].settled;
    }

    // ============ Internal Functions ============

    /**
     * @notice Check if an auction exists
     * @param auctionId The ID of the auction to check
     * @return true if auction exists, false otherwise
     */
    function _auctionExists(uint256 auctionId) internal view returns (bool) {
        return auctionParties[auctionId].user != address(0);
    }

    /**
     * @notice Get current price of an auction
     * @param auctionId The ID of the auction
     * @return The current price
     */
    function _getCurrentPrice(
        uint256 auctionId
    ) internal view returns (uint256) {
        TimeInfo storage times = auctionTimes[auctionId];

        if (block.timestamp >= times.endTime) return times.endPrice;
        if (block.timestamp <= times.startTime) return times.startPrice;

        uint256 totalDuration = times.endTime - times.startTime;
        uint256 elapsed = block.timestamp - times.startTime;
        uint256 priceDrop = times.startPrice - times.endPrice;

        return times.startPrice - (priceDrop * elapsed) / totalDuration;
    }

    /**
     * @notice Internal function to create an auction
     * @return auctionId The ID of the created auction
     */
    function _createAuction(
        address sourceToken,
        uint256 sourceAmount,
        address destToken,
        uint256 minDestAmount,
        address user,
        bytes32 orderId
    ) internal returns (uint256) {
        uint256 auctionId = nextAuctionId++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + defaultAuctionDuration;

        // Set start price higher than minimum destination amount to incentivize bidding
        uint256 startPrice = (minDestAmount * 120) / 100; // 120% of minDestAmount
        uint256 endPrice = (minDestAmount * defaultPriceDropPercent) / 1e18; // Apply price drop

        // Store token info
        auctionTokens[auctionId] = TokenInfo({
            sourceToken: sourceToken,
            sourceAmount: sourceAmount,
            destToken: destToken,
            minDestAmount: minDestAmount
        });

        // Store time and price info
        auctionTimes[auctionId] = TimeInfo({
            startTime: startTime,
            endTime: endTime,
            startPrice: startPrice,
            endPrice: endPrice
        });

        // Initialize bid info
        auctionBids[auctionId] = BidInfo({
            winner: address(0),
            winningBid: 0,
            settled: false
        });

        // Store parties info
        auctionParties[auctionId] = AuctionParties({
            user: user,
            orderId: orderId
        });


        // Store order ID mapping
        orderIdToAuctionId[orderId] = auctionId;

        emit AuctionCreated(
            auctionId,
            user,
            sourceToken,
            sourceAmount,
            destToken,
            minDestAmount,
            startTime,
            endTime,
            orderId
        );

        return auctionId;
    }

    /// @notice Handles an incoming message
    /// @param _origin The origin domain
    /// @param _sender The sender address
    /// @param _message The message
    function handle(uint32 _origin, bytes32 _sender, bytes calldata _message) external payable onlyMessenger {
        _handle(_origin, _sender, _message);
    }

    /// @notice Handles incoming messages
    /// @dev Decodes the message and processes settlement or refund operations accordingly
    /// @dev _originDomain The domain from which the message originates (unused in this implementation)
    /// @dev _sender The address of the sender on the origin domain (unused in this implementation)
    /// @param _message The encoded message received via t1
     function _handle(uint32, bytes32, bytes calldata _message) internal {
        (bool _settle, bytes32[] memory _orderIds, bytes[] memory _ordersFillerData) =
            Hyperlane7683Message.decode(_message);

        for (uint256 i = 0; i < _orderIds.length; i++) {
            if (_settle) {
                _handleSettleOrder(_orderIds[i], abi.decode(_ordersFillerData[i], (bytes32)));
            } else {
                _handleRefundOrder(_orderIds[i]);
            }
        }
    }


    /**
     * @dev Fills an order on the current domain.
     * @param _orderId The ID of the order to fill.
     * @param _originData The origin data of the order.
     * Additional data related to the order (unused).
     */
    function _fillOrder(bytes32 _orderId, bytes calldata _originData, bytes calldata) internal override(BasicSwap7683, Base7683) {
        OrderData memory orderData = OrderEncoder.decode(_originData);
        uint256 auctionId = orderIdToAuctionId[_orderId];
        require(_auctionExists(auctionId), "Auction does not exist");
        if (_orderId != OrderEncoder.id(orderData)) revert InvalidOrderId();
        if (block.timestamp > orderData.fillDeadline) revert OrderFillExpired();
        if (orderData.destinationDomain != _localDomain()) revert InvalidOrderDomain();

        address outputToken = TypeCasts.bytes32ToAddress(orderData.outputToken);
        address recipient = TypeCasts.bytes32ToAddress(orderData.recipient);

        BidInfo storage bid = auctionBids[auctionId];
        if (outputToken == address(0)) {
            if (orderData.amountOut != msg.value) revert InvalidNativeAmount();
            Address.sendValue(payable(recipient), bid.winningBid);
        } else {
            IERC20(outputToken).safeTransferFrom(msg.sender, recipient, bid.winningBid);
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
    )
        internal
        override
    {
        if (msg.value != 0) revert EthNotAllowed();
        bytes memory innerMessage = Hyperlane7683Message.encodeSettle(_orderIds, _ordersFillerData);
        bytes memory outerMessage = abi.encodeWithSelector(
            DutchAuction.handle.selector, _originDomain, TypeCasts.addressToBytes32(address(this)), innerMessage
        );
        messenger.sendMessage(counterpart, 0, outerMessage, DEFAULT_GAS_LIMIT, uint64(_originDomain));
    }


    /// @notice Dispatches a refund message to the specified domain.
    /// @dev Encodes the refund message using Hyperlane7683Message and dispatches it via the GasRouter.
    /// @param _originDomain The domain to which the refund message is sent.
    /// @param _orderIds The IDs of the orders to refund.
    function _dispatchRefund(uint32 _originDomain, bytes32[] memory _orderIds) internal override {
      
    }

    /// @notice Retrieves the local domain identifier.
    /// @dev This function overrides the `_localDomain` function from the parent contract.
    /// @return The local domain ID.
    function _localDomain() internal view override returns (uint32) {
        return localDomain;
    }
}
