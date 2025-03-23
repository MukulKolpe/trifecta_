// @ts-nocheck comment
"use client";

import type React from "react";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import {
  ChevronDown,
  RefreshCw,
  Info,
  AlertCircle,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
// import { toast } from "@/components/ui/use-toast";
import EscrowABI from "@/utils/abis/EscrowABI.json";
import ERC20ABI from "@/utils/abis/ERC20.json";
import { OrderEncoder } from "@/utils/OrderEncoder";

// Token definitions
const tokens = [
  {
    id: "usdt-l1",
    name: "USDT",
    network: "Ethereum Sepolia (L1)",
    address: "0x30E9b6B0d161cBd5Ff8cf904Ff4FA43Ce66AC346",
    icon: "/assets/usdt-logo.svg",
    color: "#26A17B", // USDT green
    chainId: 11155111, // Sepolia chain ID
  },
  {
    id: "usdt-t1",
    name: "USDT",
    network: "t1 Devnet",
    address: "0xb6E3F86a5CE9ac318F54C9C7Bcd6eff368DF0296",
    icon: "/assets/t1-logo.svg",
    color: "#3B82F6", // Blue for t1
    chainId: 299792, // t1 chain ID
  },
];

// Constants
const SETTLER =
  process.env.NEXT_PUBLIC_SETTLER_ADDRESS ||
  "0xbF59f5a5931B9013A6d3724d0D3A2a0abafe3Afc";
const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS || "";

export default function DepositPage() {
  // State for selected tokens - initially null
  const [sourceToken, setSourceToken] = useState<(typeof tokens)[0] | null>(
    null
  );
  const [destinationToken, setDestinationToken] = useState<
    (typeof tokens)[0] | null
  >(null);

  // State for input amounts
  const [depositAmount, setDepositAmount] = useState("");
  const [minExpectedAmount, setMinExpectedAmount] = useState("");

  // State for validation
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Animation state
  const [isSwapping, setIsSwapping] = useState(false);

  // Transaction state
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [balance, setBalance] = useState("0.00");

  // Check balance when source token changes
  useEffect(() => {
    const checkBalance = async () => {
      if (
        !sourceToken ||
        !window.ethereum ||
        !window.ethereum._state?.accounts?.length
      )
        return;

      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length === 0) return;

        const tokenContract = new ethers.Contract(
          sourceToken.address,
          ["function balanceOf(address) view returns (uint256)"],
          provider
        );

        const rawBalance = await tokenContract.balanceOf(accounts[0]);
        const formattedBalance = ethers.utils.formatUnits(rawBalance, 18); // Assuming 18 decimals
        setBalance(parseFloat(formattedBalance).toFixed(2));
      } catch (error) {
        console.error("Error fetching balance:", error);
        setBalance("0.00");
      }
    };

    checkBalance();
  }, [sourceToken]);

  // Validate input amounts
  useEffect(() => {
    if (depositAmount && minExpectedAmount) {
      const depositValue = Number.parseFloat(depositAmount);
      const minExpectedValue = Number.parseFloat(minExpectedAmount);

      if (minExpectedValue >= depositValue) {
        setIsValid(false);
        setErrorMessage(
          "Minimum expected amount must be less than deposit amount"
        );
      } else {
        setIsValid(true);
        setErrorMessage("");
      }
    } else {
      setIsValid(true);
      setErrorMessage("");
    }
  }, [depositAmount, minExpectedAmount]);

  // Handle token selection
  const handleSourceTokenSelect = (token: (typeof tokens)[0]) => {
    setSourceToken(token);
    // If the same token is selected as destination, clear destination
    if (destinationToken && token.id === destinationToken.id) {
      setDestinationToken(null);
    } else if (!destinationToken) {
      // If no destination token is selected, select the other token
      setDestinationToken(tokens.find((t) => t.id !== token.id) || null);
    }
  };

  const handleDestinationTokenSelect = (token: (typeof tokens)[0]) => {
    setDestinationToken(token);
    // If the same token is selected as source, clear source
    if (sourceToken && token.id === sourceToken.id) {
      setSourceToken(null);
    } else if (!sourceToken) {
      // If no source token is selected, select the other token
      setSourceToken(tokens.find((t) => t.id !== token.id) || null);
    }
  };

  // Handle token swap
  const handleSwapTokens = () => {
    if (!sourceToken || !destinationToken) return;

    setIsSwapping(true);
    setTimeout(() => {
      setSourceToken(destinationToken);
      setDestinationToken(sourceToken);
      setIsSwapping(false);
    }, 500);
  };

  // Handle max button click
  const handleMaxClick = async () => {
    if (!sourceToken || !window.ethereum) return;

    try {
      // Get the latest balance
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) return;

      const tokenContract = new ethers.Contract(
        sourceToken.address,
        ["function balanceOf(address) view returns (uint256)"],
        provider
      );

      const rawBalance = await tokenContract.balanceOf(accounts[0]);
      const formattedBalance = ethers.utils.formatUnits(rawBalance, 18); // Assuming 18 decimals
      const currentBalance = parseFloat(formattedBalance).toFixed(2);

      // Set the deposit amount to the current balance
      setDepositAmount(currentBalance);

      // Set min expected as 90% of deposit amount as a default suggestion
      const minAmount = (parseFloat(currentBalance) * 0.9).toFixed(2);
      setMinExpectedAmount(minAmount);

      // Update the displayed balance
      setBalance(currentBalance);
    } catch (error) {
      console.error("Error getting max balance:", error);
    }
  };

  // Handle deposit submission
  const handleDeposit = async () => {
    if (!sourceToken || !destinationToken) {
      setIsValid(false);
      setErrorMessage("Please select both tokens");
      return;
    }

    if (!depositAmount || !minExpectedAmount) {
      setIsValid(false);
      setErrorMessage("Please enter both deposit and minimum expected amounts");
      return;
    }

    if (!isValid) return;

    try {
      setIsLoading(true);
      setTxHash("");

      // Check if wallet is connected
      if (!window.ethereum) {
        // toast({
        //   title: "No wallet detected",
        //   description: "Please install MetaMask to use this application",
        //   variant: "destructive",
        // });
        return;
      }

      if (
        !window.ethereum._state?.accounts ||
        window.ethereum._state.accounts.length === 0
      ) {
        await window.ethereum.request({ method: "eth_requestAccounts" });
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const accounts = await provider.listAccounts();
      const userAddress = accounts[0];

      // Convert amounts to wei
      const amountInWei = ethers.utils.parseEther(depositAmount);
      const minAmountWei = ethers.utils.parseEther(minExpectedAmount);

      // Approve token first
      const tokenContract = new ethers.Contract(
        sourceToken.address,
        ERC20ABI,
        signer
      );

      try {
        const approvalTx = await tokenContract.approve(
          ESCROW_ADDRESS,
          ethers.constants.MaxUint256
        );

        // toast({
        //   title: "Approving tokens",
        //   description:
        //     "Please wait for the approval transaction to complete...",
        // });

        await approvalTx.wait();
      } catch (approvalError) {
        console.error("Token approval failed:", approvalError);
        // toast({
        //   title: "Approval Failed",
        //   description: "Failed to approve tokens for transfer",
        //   variant: "destructive",
        // });
        setIsLoading(false);
        return;
      }

      // Generate random nonce
      const randomBytes = ethers.utils.randomBytes(4);
      const randomNonce = ethers.utils.hexDataSlice(
        ethers.utils.keccak256(randomBytes),
        0,
        4
      );
      const senderNonce = ethers.BigNumber.from(randomNonce).toNumber() % 10000;

      // Fill deadline - 24 hours from now
      const fillDeadline = Math.floor(Date.now() / 1000) + 86400;

      // Create and encode the order data manually to match exact contract expectations
      const orderData = {
        sender: ethers.utils.hexZeroPad(userAddress, 32),
        recipient: ethers.utils.hexZeroPad(userAddress, 32), // Same as sender
        inputToken: ethers.utils.hexZeroPad(sourceToken.address, 32),
        outputToken: ethers.utils.hexZeroPad(destinationToken.address, 32),
        amountIn: amountInWei,
        amountOut: minAmountWei,
        senderNonce: senderNonce,
        originDomain: 11155111,
        destinationDomain: 299792,
        destinationSettler: ethers.utils.hexZeroPad(SETTLER, 32),
        fillDeadline: fillDeadline,
        data: "0x",
      };

      // Encode the order data - manual fallback if using OrderEncoder fails
      let encodedOrder;
      try {
        // Try using our OrderEncoder
        encodedOrder = OrderEncoder.encode(orderData);
        console.log("Order encoded using utility:", encodedOrder);
      } catch (encodeError) {
        console.error("Order encoding error, trying fallback:", encodeError);
        // Fallback to manual encoding if the utility fails
        encodedOrder = ethers.utils.defaultAbiCoder.encode(
          [
            "tuple(bytes32 sender, bytes32 recipient, bytes32 inputToken, bytes32 outputToken, " +
              "uint256 amountIn, uint256 amountOut, uint32 senderNonce, uint32 originDomain, " +
              "uint32 destinationDomain, bytes32 destinationSettler, uint32 fillDeadline, bytes data)",
          ],
          [orderData]
        );
      }

      // Use a hardcoded orderDataType that matches the contract's expectation exactly

      //   const senderNonce = Math.floor(Math.random() * 10000);
      //   const fillDeadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

      //   const orderData = ethers.utils.defaultAbiCoder.encode(
      //     [
      //       "bytes32",
      //       "bytes32",
      //       "bytes32",
      //       "bytes32",
      //       "uint256",
      //       "uint256",
      //       "uint32",
      //       "uint32",
      //       "uint32",
      //       "bytes32",
      //       "uint32",
      //       "bytes",
      //     ],
      //     [
      //       ethers.utils.hexZeroPad(userAddress, 32),
      //       ethers.utils.hexZeroPad(userAddress, 32),
      //       ethers.utils.hexZeroPad(
      //         "0x30E9b6B0d161cBd5Ff8cf904Ff4FA43Ce66AC346",
      //         32
      //       ),
      //       ethers.utils.hexZeroPad(
      //         "0xb6E3F86a5CE9ac318F54C9C7Bcd6eff368DF0296",
      //         32
      //       ),
      //       ethers.utils.parseUnits("0.1", 18), // 0.1 USDT
      //       ethers.utils.parseUnits("0.1", 18),
      //       senderNonce,
      //       11155111,
      //       299792,
      //       ethers.utils.hexZeroPad(SETTLER, 32),
      //       fillDeadline,
      //       "0x",
      //     ]
      //   );

      //   const orderDataType = ethers.utils.keccak256(
      //     ethers.utils.toUtf8Bytes(
      //       "OrderData(bytes32 sender,bytes32 recipient,bytes32 inputToken,bytes32 outputToken,uint256 amountIn,uint256 amountOut,uint32 senderNonce,uint32 originDomain,uint32 destinationDomain,bytes32 destinationSettler,uint32 fillDeadline,bytes data)"
      //     )
      //   );

      //   const orderDataType =
      //     "0x08d75650babf4de09c9273d48ef647876057ed91d4323f8a2e3ebc2cd8a63b5e";

      //   const onchainOrder = {
      //     fillDeadline,
      //     orderDataType,
      //     orderData,
      //   };

      //   console.log("fillDeadline:", fillDeadline);
      //   console.log("order data type:", orderDataType);
      //   console.log("Order data:", orderData);

      // Execute open transaction

      //   const orderDataType = ethers.utils.formatBytes32String(
      //     "BasicSwap7683.OrderData"
      //   );

      const ORDER_DATA_TYPE =
        "OrderData(" +
        "bytes32 sender," +
        "bytes32 recipient," +
        "bytes32 inputToken," +
        "bytes32 outputToken," +
        "uint256 amountIn," +
        "uint256 amountOut," +
        "uint256 senderNonce," +
        "uint32 originDomain," +
        "uint32 destinationDomain," +
        "bytes32 destinationSettler," +
        "uint32 fillDeadline," +
        "bytes data)";

      const ORDER_DATA_TYPE_HASH =
        "0x08d75650babf4de09c9273d48ef647876057ed91d4323f8a2e3ebc2cd8a63b5e";

      // Create OnchainCrossChainOrder
      const order = {
        fillDeadline: orderData.fillDeadline,
        orderDataType: ORDER_DATA_TYPE_HASH,
        orderData: encodedOrder,
      };

      console.log("Order being sent to contract:", order);

      // Create contract instance and call open function
      const escrowContract = new ethers.Contract(
        ESCROW_ADDRESS,
        EscrowABI,
        signer
      );

      //   const tx = await escrowContract.open(onchainOrder, {
      //     value: ethers.utils.parseUnits("0.000001", "ether"),
      //     gasLimit: 500000,
      //   });
      //  await tx.wait();

      // Set explicit gas limit to avoid estimation problems
      const tx = await escrowContract.open(order, {
        value: ethers.utils.parseEther("0.001"),
        gasLimit: 1000000, // Set an explicit gas limit
      });

      //   toast({
      //     title: "Transaction submitted",
      //     description: "Please wait for confirmation...",
      //   });

      const receipt = await tx.wait();
      setTxHash(receipt.transactionHash);

      //   toast({
      //     title: "Success!",
      //     description: "Tokens have been deposited to the escrow contract",
      //     variant: "default",
      //   });

      // Clear form after successful deposit
      setDepositAmount("");
      setMinExpectedAmount("");

      // Log the order ID
      try {
        const orderId = OrderEncoder.id(orderData);
        console.log("Order ID:", orderId);
      } catch (error) {
        console.log("Could not calculate order ID:", error);
      }
      console.log("Transaction hash:", tx.hash);
    } catch (error) {
      console.error("Deposit error:", error);

      // Parse the error message for more helpful feedback
      let errorMessage = "Failed to deposit tokens";
      if (error.message) {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected";
        } else if (error.message.includes("execution reverted")) {
          errorMessage =
            "Contract execution failed - Check contract compatibility";
        }
      }

      //   toast({
      //     title: "Transaction Failed",
      //     description: errorMessage,
      //     variant: "destructive",
      //   });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center pt-32 pb-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-4 text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
            Bridge Tokens
          </h1>
          <p className="text-xl text-gray-300">
            Transfer tokens between Ethereum Sepolia and t1 Devnet using our
            Dutch auction mechanism
          </p>
        </div>

        <Card className="bg-slate-900/70 border-blue-900/30 backdrop-blur-md shadow-[0_0_40px_rgba(59,130,246,0.2)] p-8 rounded-2xl">
          {/* Wallet Connection Status */}

          {/* Source Token Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-gray-200 text-xl font-medium">
                Deposit Token
              </Label>
              <div className="text-base text-gray-400">
                Balance: <span className="text-gray-200">{balance}</span>
              </div>
            </div>

            <div className="bg-slate-800/70 rounded-xl p-5 border border-blue-900/20">
              <div className="flex items-center justify-between mb-4">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => {
                    // Allow only numbers and decimals
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setDepositAmount(value);
                    }
                  }}
                  className="bg-transparent border-none text-m md:text-xl sm:text-sm font-medium text-white placeholder:text-gray-500 placeholder:text-xl md:placeholder:text-xl sm:placeholder:text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0 w-1/2"
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="rounded-xl bg-slate-700/70 hover:bg-slate-600/70 px-4 py-3 h-auto w-[200px]"
                    >
                      {sourceToken ? (
                        <div className="flex items-center gap-2 w-full">
                          <div
                            className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                            style={{ backgroundColor: sourceToken.color }}
                          >
                            <Image
                              src={sourceToken.icon || "/placeholder.svg"}
                              alt={sourceToken.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <div className="font-medium text-white text-lg truncate">
                              {sourceToken.name}
                            </div>
                            <div className="text-sm text-gray-400 truncate">
                              {sourceToken.network}
                            </div>
                          </div>
                          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-gray-300 text-lg">
                            Select Token
                          </span>
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="bg-slate-800 border-blue-900/30 text-white w-[200px]"
                    style={
                      {
                        "--accent": "hsl(215 25% 27% / 0.8)",
                      } as React.CSSProperties
                    }
                  >
                    {tokens.map((token) => (
                      <DropdownMenuItem
                        key={token.id}
                        onClick={() => handleSourceTokenSelect(token)}
                        disabled={destinationToken?.id === token.id}
                        className={cn(
                          "flex items-center gap-3 py-3 px-4 cursor-pointer text-base data-[highlighted]:bg-slate-700/80 data-[highlighted]:text-white",
                          destinationToken?.id === token.id &&
                            "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div
                          className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                          style={{ backgroundColor: token.color }}
                        >
                          <Image
                            src={token.icon || "/placeholder.svg"}
                            alt={token.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-lg truncate">
                            {token.name}
                          </div>
                          <div className="text-sm text-gray-400 truncate">
                            {token.network}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex justify-between items-center text-base">
                <span className="text-gray-400">
                  ≈ $
                  {depositAmount
                    ? (parseFloat(depositAmount) * 1).toFixed(2)
                    : "0.00"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-400 hover:text-blue-500 transition-colors duration-200 p-0 h-auto text-base hover:bg-transparent"
                  onClick={handleMaxClick}
                >
                  MAX
                </Button>
              </div>
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="relative flex justify-center my-4">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full border-t border-blue-900/30"></div>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="relative rounded-full h-12 w-12 bg-slate-800 border-blue-900/30 hover:bg-blue-900/30 z-10"
              onClick={handleSwapTokens}
              disabled={!sourceToken || !destinationToken}
            >
              <RefreshCw
                className={cn(
                  "h-5 w-5 text-blue-400",
                  isSwapping && "animate-spin"
                )}
              />
            </Button>
          </div>

          {/* Bridge Animation */}
          <div className="relative h-28 my-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <BridgeAnimation />
            </div>
          </div>

          {/* Destination Token Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-gray-200 text-xl font-medium">
                Get Token
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      <Info className="h-5 w-5 text-gray-400" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-800 border-blue-900/30 text-white text-base p-3">
                    <p>
                      The minimum amount you expect to receive after the Dutch
                      auction
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="bg-slate-800/70 rounded-xl p-5 border border-blue-900/20">
              <div className="flex items-center justify-between mb-4">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={minExpectedAmount}
                  onChange={(e) => {
                    // Allow only numbers and decimals
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setMinExpectedAmount(value);
                    }
                  }}
                  className="bg-transparent border-none text-m md:text-xl sm:text-sm font-medium text-white placeholder:text-gray-500 placeholder:text-xl md:placeholder:text-xl sm:placeholder:text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0 w-1/2"
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="rounded-xl bg-slate-700/70 hover:bg-slate-600/70 px-4 py-3 h-auto w-[200px]"
                    >
                      {destinationToken ? (
                        <div className="flex items-center gap-2 w-full">
                          <div
                            className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                            style={{ backgroundColor: destinationToken.color }}
                          >
                            <Image
                              src={destinationToken.icon || "/placeholder.svg"}
                              alt={destinationToken.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <div className="font-medium text-white text-lg truncate">
                              {destinationToken.name}
                            </div>
                            <div className="text-sm text-gray-400 truncate">
                              {destinationToken.network}
                            </div>
                          </div>
                          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-gray-300 text-lg">
                            Select Token
                          </span>
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="bg-slate-800 border-blue-900/30 text-white w-[200px]"
                    style={
                      {
                        "--accent": "hsl(215 25% 27% / 0.8)",
                      } as React.CSSProperties
                    }
                  >
                    {tokens.map((token) => (
                      <DropdownMenuItem
                        key={token.id}
                        onClick={() => handleDestinationTokenSelect(token)}
                        disabled={sourceToken?.id === token.id}
                        className={cn(
                          "flex items-center gap-3 py-3 px-4 cursor-pointer text-base data-[highlighted]:bg-slate-700/80 data-[highlighted]:text-white",
                          sourceToken?.id === token.id &&
                            "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div
                          className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                          style={{ backgroundColor: token.color }}
                        >
                          <Image
                            src={token.icon || "/placeholder.svg"}
                            alt={token.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-lg truncate">
                            {token.name}
                          </div>
                          <div className="text-sm text-gray-400 truncate">
                            {token.network}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex justify-between items-center text-base">
                <span className="text-gray-400">
                  ≈ $
                  {minExpectedAmount
                    ? (parseFloat(minExpectedAmount) * 1).toFixed(2)
                    : "0.00"}
                </span>
                <span className="text-gray-400">Min. expected amount</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {!isValid && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-900/30 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-base">{errorMessage}</span>
            </div>
          )}

          {/* Transaction Hash */}
          {txHash && (
            <div className="mb-6 p-4 bg-green-900/20 border border-green-900/30 rounded-xl">
              <div className="flex items-center gap-3 text-green-400 mb-2">
                <div className="h-3 w-3 bg-green-400 rounded-full"></div>
                <span className="text-base font-medium">
                  Transaction Successful
                </span>
              </div>
              <div className="text-gray-300 text-sm break-all">
                <span className="text-gray-400">Tx Hash: </span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {txHash}
                </a>
              </div>
            </div>
          )}

          {/* Deposit Button */}
          <Button
            className="w-full py-7 text-xl bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl group relative overflow-hidden"
            disabled={
              isLoading ||
              !isValid ||
              !depositAmount ||
              !minExpectedAmount ||
              !sourceToken ||
              !destinationToken
            }
            onClick={handleDeposit}
          >
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Deposit Tokens
                </>
              )}
            </span>
            <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 group-hover:opacity-0 transition-opacity duration-300"></span>
            <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </Button>
        </Card>

        {/* Additional Info */}
        <div className="mt-8 text-center text-base text-gray-300">
          <p>
            Tokens will be bridged via our Dutch auction mechanism.
            <a
              href="#"
              className="text-blue-400 hover:text-blue-300 ml-1 underline underline-offset-2"
            >
              Learn more
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// Bridge Animation Component
function BridgeAnimation() {
  return (
    <div className="relative w-full h-full">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-3xl"></div>

      {/* Bridge Path */}
      <svg
        className="absolute inset-0"
        width="100%"
        height="100%"
        viewBox="0 0 300 80"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="bridgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Bridge Arc */}
        <path
          d="M 10,60 C 50,10 250,10 290,60"
          fill="none"
          stroke="url(#bridgeGradient)"
          strokeWidth="2"
          strokeDasharray="5,3"
        />

        {/* Animated Particles */}
        <circle
          className="animate-pulse"
          r="4"
          fill="#60A5FA"
          filter="url(#glow)"
        >
          <animateMotion
            path="M 10,60 C 50,10 250,10 290,60"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>

        <circle r="3" fill="#93C5FD" opacity="0.7" filter="url(#glow)">
          <animateMotion
            path="M 10,60 C 50,10 250,10 290,60"
            dur="4s"
            repeatCount="indefinite"
            begin="1s"
          />
        </circle>
      </svg>

      {/* Network Labels */}
      <div className="absolute bottom-2 left-2 text-sm text-gray-300 font-medium">
        Ethereum Sepolia
      </div>
      <div className="absolute bottom-2 right-2 text-sm text-gray-300 font-medium">
        t1 Devnet
      </div>

      {/* Dutch Auction Label - Moved higher to avoid path overlap */}
      <div className="absolute left-1/2 -translate-x-1/2 text-sm text-blue-400 font-medium bg-blue-900/30 px-3 py-1 rounded-full border border-blue-900/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
        Dutch Auction
      </div>
    </div>
  );
}
