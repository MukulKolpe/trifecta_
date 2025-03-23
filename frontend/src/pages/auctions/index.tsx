// @ts-nocheck comment
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ethers } from "ethers";
import {
  RefreshCw,
  Info,
  AlertCircle,
  Sparkles,
  Loader2,
  Clock,
  Gavel,
  XCircle,
  TimerIcon,
  DollarSign,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import DUTCH_AUCTION_ABI from "@/utils/abis/DutchAuctionABI.json";
import ERC20_ABI from "@/utils/abis/ERC20.json";

// Contract address - this should be set from environment variable in production
const DUTCH_AUCTION_ADDRESS =
  process.env.NEXT_PUBLIC_SETTLER_ADDRESS ||
  "0xbF59f5a5931B9013A6d3724d0D3A2a0abafe3Afc";

// Expected chain ID - Sepolia testnet
const EXPECTED_CHAIN_ID = 11155111;

interface TokenInfo {
  sourceToken: string;
  sourceAmount: bigint;
  destToken: string;
  minDestAmount: bigint;
  sourceSymbol?: string;
  sourceDecimals?: number;
  destSymbol?: string;
  destDecimals?: number;
}

interface TimeInfo {
  startTime: bigint;
  endTime: bigint;
  startPrice: bigint;
  endPrice: bigint;
}

interface BidInfo {
  winner: string;
  winningBid: bigint;
  settled: boolean;
}

interface AuctionParties {
  user: string;
  orderId: string;
}

interface Auction {
  id: number;
  tokenInfo: TokenInfo;
  timeInfo: TimeInfo;
  bidInfo: BidInfo;
  parties: AuctionParties;
  currentPrice?: bigint;
  exists: boolean;
}

// Token definitions with icons
const tokenIcons = {
  "0x30E9b6B0d161cBd5Ff8cf904Ff4FA43Ce66AC346": {
    icon: "/assets/usdt-logo.svg",
    color: "#26A17B", // USDT green
    name: "USDT",
    network: "Ethereum Sepolia (L1)",
  },
  "0xb6E3F86a5CE9ac318F54C9C7Bcd6eff368DF0296": {
    icon: "/assets/t1-logo.svg",
    color: "#3B82F6", // Blue for t1
    name: "USDT",
    network: "t1 Devnet",
  },
};

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [placingBid, setPlacingBid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [sortOrder, setSortOrder] = useState<
    "newest" | "endingSoon" | "highestPrice"
  >("endingSoon");
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [contractVerified, setContractVerified] = useState(false);

  // Function to refresh the auctions list
  const refreshAuctions = () => {
    console.log("Refreshing auctions...");
    setAuctions([]); // Clear existing auctions to ensure we get fresh data
    setRefreshTrigger((prev) => prev + 1);
  };

  // Function to connect wallet
  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setWalletConnected(accounts.length > 0);

        // Check if we're on the correct network
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    } else {
      setError(
        "MetaMask is not installed. Please install it to use this application."
      );
    }
  };

  // Function to switch network
  const switchNetwork = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
        });
        setNetworkError(null);
      } catch (error: any) {
        console.error("Error switching network:", error);
        // If the chain is not added to MetaMask
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
                  chainName: "Sepolia Testnet",
                  nativeCurrency: {
                    name: "Sepolia ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["https://rpc.sepolia.org"],
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                },
              ],
            });
            setNetworkError(null);
          } catch (addError) {
            console.error("Error adding network to MetaMask:", addError);
          }
        }
      }
    }
  };

  // Function to verify contract exists
  const verifyContract = async (provider: ethers.providers.Provider) => {
    try {
      const code = await provider.getCode(DUTCH_AUCTION_ADDRESS);
      if (code === "0x") {
        setError(
          `No contract found at address ${DUTCH_AUCTION_ADDRESS}. Please check the contract address.`
        );
        return false;
      }
      setContractVerified(true);
      return true;
    } catch (error) {
      console.error("Error verifying contract:", error);
      setError(
        `Failed to verify contract at ${DUTCH_AUCTION_ADDRESS}. Please check the contract address.`
      );
      return false;
    }
  };

  // Function to place a bid
  const placeBid = async (auctionId: number) => {
    if (!walletConnected) {
      await connectWallet();
      return;
    }

    if (networkError) {
      await switchNetwork();
      return;
    }

    try {
      setPlacingBid(auctionId);
      setError(null);
      setTxHash("");

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Verify contract exists before proceeding
      if (!contractVerified) {
        const verified = await verifyContract(provider);
        if (!verified) {
          setPlacingBid(null);
          return;
        }
      }

      const contract = new ethers.Contract(
        DUTCH_AUCTION_ADDRESS,
        DUTCH_AUCTION_ABI,
        signer
      );

      const tx = await contract.placeBid(auctionId, {
        gasLimit: 500000,
      });

      const receipt = await tx.wait();
      setTxHash(receipt.transactionHash);

      // Refresh auctions after successful bid
      refreshAuctions();
    } catch (err: any) {
      console.error("Error placing bid:", err);
      setError(err.message || "Failed to place bid. Please try again.");
    } finally {
      setPlacingBid(null);
    }
  };

  // Format time remaining in a human-readable format
  const formatTimeRemaining = (endTime: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (endTime <= now) return "Ended";

    // Ensure both values are BigInt and then convert the result to a number
    const secondsRemaining = Number(endTime - now);
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Check if auction is active
  const isAuctionActive = (timeInfo: TimeInfo) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    return now >= timeInfo.startTime && now <= timeInfo.endTime;
  };

  // Format price with token symbol
  const formatPrice = (price: bigint, decimals = 18, symbol = "???") => {
    return `${ethers.utils.formatUnits(price, decimals)} ${symbol}`;
  };

  // Determine auction status
  const getAuctionStatus = (auction: Auction) => {
    const now = BigInt(Math.floor(Date.now() / 1000));

    if (auction.bidInfo.settled) {
      return {
        label: "Settled",
        color: "bg-gray-500 hover:bg-gray-600 text-white",
      };
    }

    if (auction.bidInfo.winner !== ethers.constants.AddressZero) {
      return {
        label: "Bid Placed",
        color: "bg-yellow-500 hover:bg-yellow-600 text-white",
      };
    }

    if (now < auction.timeInfo.startTime) {
      return {
        label: "Upcoming",
        color: "bg-blue-500 hover:bg-blue-600 text-white",
      };
    }

    if (now > auction.timeInfo.endTime) {
      return {
        label: "Ended",
        color: "bg-red-500 hover:bg-red-600 text-white",
      };
    }

    return {
      label: "Active",
      color: "bg-green-500 hover:bg-green-600 text-white",
    };
  };

  // Sort auctions based on selected order
  const sortedAuctions = [...auctions].sort((a, b) => {
    if (sortOrder === "newest") {
      // Convert BigInt to string then to number for comparison
      return Number.parseInt(
        String(b.timeInfo.startTime - a.timeInfo.startTime),
        10
      );
    } else if (sortOrder === "endingSoon") {
      // Convert BigInt to string then to number for comparison
      return Number.parseInt(
        String(a.timeInfo.endTime - b.timeInfo.endTime),
        10
      );
    } else if (sortOrder === "highestPrice") {
      if (!a.currentPrice || !b.currentPrice) return 0;
      // Convert BigInt to string then to number for comparison
      return Number.parseInt(String(b.currentPrice - a.currentPrice), 10);
    }
    return 0;
  });

  // Fetch all auctions
  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if wallet is connected
        if (typeof window.ethereum !== "undefined") {
          try {
            const accounts = await window.ethereum.request({
              method: "eth_accounts",
            });
            setWalletConnected(accounts.length > 0);

            // Check if we're on the correct network
            const chainId = await window.ethereum.request({
              method: "eth_chainId",
            });
          } catch (error) {
            console.error("Error checking wallet connection:", error);
          }
        }

        // Create a provider
        let provider;
        if (typeof window.ethereum !== "undefined") {
          provider = new ethers.providers.Web3Provider(window.ethereum);
        } else {
          // Fallback to a public provider if no wallet is connected
          provider = new ethers.providers.JsonRpcProvider(
            "https://rpc.sepolia.org"
          );
        }

        // Verify contract exists
        const verified = await verifyContract(provider);
        if (!verified) {
          setLoading(false);
          return;
        }

        // Create contract instance
        const contract = new ethers.Contract(
          DUTCH_AUCTION_ADDRESS,
          DUTCH_AUCTION_ABI,
          provider
        );

        // Get the next auction ID (total number of auctions)
        let nextAuctionId;
        try {
          nextAuctionId = await contract.nextAuctionId();
        } catch (error) {
          console.error("Error fetching nextAuctionId:", error);
          setError(
            "Failed to fetch auction data. The contract may not be deployed or you may be connected to the wrong network."
          );
          setLoading(false);
          return;
        }

        // If we got here, the contract is working
        console.log("Next auction ID:", nextAuctionId.toString());

        // Fetch all auctions
        const auctionsPromises = [];

        for (let i = 0; i < nextAuctionId; i++) {
          auctionsPromises.push(
            (async () => {
              try {
                // Check if auction exists - but don't return early if it doesn't
                // This was causing issues with newly created auctions
                let exists = false;
                try {
                  exists = await contract.auctionExists(i);
                } catch (error) {
                  console.error(
                    `Error checking if auction ${i} exists:`,
                    error
                  );
                  // Continue anyway - some contracts might not have auctionExists function
                  exists = true;
                }

                // If auction doesn't exist and we confirmed it, skip
                if (exists === false) {
                  console.log(`Auction ${i} does not exist, skipping`);
                  return null;
                }

                // Get auction data with better error handling
                let tokenInfo, timeInfo, bidInfo, parties;

                try {
                  tokenInfo = await contract.auctionTokens(i);
                } catch (error) {
                  console.error(
                    `Error fetching tokenInfo for auction ${i}:`,
                    error
                  );
                  return null; // Skip this auction if we can't get basic data
                }

                try {
                  timeInfo = await contract.auctionTimes(i);
                } catch (error) {
                  console.error(
                    `Error fetching timeInfo for auction ${i}:`,
                    error
                  );
                  return null;
                }

                try {
                  bidInfo = await contract.auctionBids(i);
                } catch (error) {
                  console.error(
                    `Error fetching bidInfo for auction ${i}:`,
                    error
                  );
                  return null;
                }

                try {
                  parties = await contract.auctionParties(i);
                } catch (error) {
                  console.error(
                    `Error fetching parties for auction ${i}:`,
                    error
                  );
                  return null;
                }

                // Get current price
                let currentPrice;
                try {
                  currentPrice = await contract.getCurrentPrice(i);
                } catch (error) {
                  console.error(
                    `Error getting current price for auction ${i}:`,
                    error
                  );
                  // Don't return null here, just continue without current price
                }

                // Get token symbols and decimals - with better error handling for each token
                const sourceTokenInfo = { symbol: "???", decimals: 18 };
                const destTokenInfo = { symbol: "???", decimals: 18 };

                try {
                  // Try to get token info from our predefined list first
                  const sourceTokenKey = Object.keys(tokenIcons).find(
                    (addr) =>
                      addr.toLowerCase() === tokenInfo.sourceToken.toLowerCase()
                  );
                  const destTokenKey = Object.keys(tokenIcons).find(
                    (addr) =>
                      addr.toLowerCase() === tokenInfo.destToken.toLowerCase()
                  );

                  if (sourceTokenKey) {
                    sourceTokenInfo.symbol = tokenIcons[sourceTokenKey].name;
                  } else {
                    // Only try to fetch from contract if not in our predefined list
                    try {
                      const sourceTokenContract = new ethers.Contract(
                        tokenInfo.sourceToken,
                        ERC20_ABI,
                        provider
                      );
                      try {
                        sourceTokenInfo.symbol =
                          await sourceTokenContract.symbol();
                      } catch (error) {
                        console.error(
                          `Error fetching source token symbol for auction ${i}:`,
                          error
                        );
                      }
                    } catch (error) {
                      console.error(
                        `Error creating source token contract for auction ${i}:`,
                        error
                      );
                    }
                  }

                  if (destTokenKey) {
                    destTokenInfo.symbol = tokenIcons[destTokenKey].name;
                  } else {
                    // Only try to fetch from contract if not in our predefined list
                    try {
                      const destTokenContract = new ethers.Contract(
                        tokenInfo.destToken,
                        ERC20_ABI,
                        provider
                      );
                      try {
                        destTokenInfo.symbol = await destTokenContract.symbol();
                      } catch (error) {
                        console.error(
                          `Error fetching dest token symbol for auction ${i}:`,
                          error
                        );
                      }
                    } catch (error) {
                      console.error(
                        `Error creating dest token contract for auction ${i}:`,
                        error
                      );
                    }
                  }

                  // Try to get decimals with better error handling
                  try {
                    const sourceTokenContract = new ethers.Contract(
                      tokenInfo.sourceToken,
                      ERC20_ABI,
                      provider
                    );
                    try {
                      const decimals = await sourceTokenContract.decimals();
                      sourceTokenInfo.decimals = Number(decimals) || 18;
                    } catch (error) {
                      console.error(
                        `Error fetching source token decimals for auction ${i}:`,
                        error
                      );
                    }
                  } catch (error) {
                    console.error(
                      `Error creating source token contract for decimals for auction ${i}:`,
                      error
                    );
                  }

                  try {
                    const destTokenContract = new ethers.Contract(
                      tokenInfo.destToken,
                      ERC20_ABI,
                      provider
                    );
                    try {
                      const decimals = await destTokenContract.decimals();
                      destTokenInfo.decimals = Number(decimals) || 18;
                    } catch (error) {
                      console.error(
                        `Error fetching dest token decimals for auction ${i}:`,
                        error
                      );
                    }
                  } catch (error) {
                    console.error(
                      `Error creating dest token contract for decimals for auction ${i}:`,
                      error
                    );
                  }
                } catch (error) {
                  console.error(
                    `Error fetching token info for auction ${i}:`,
                    error
                  );
                  // Continue with default values
                }

                // Log successful auction fetch
                console.log(`Successfully fetched auction ${i}`);

                return {
                  id: i,
                  tokenInfo: {
                    ...tokenInfo,
                    sourceSymbol: sourceTokenInfo.symbol,
                    sourceDecimals: sourceTokenInfo.decimals,
                    destSymbol: destTokenInfo.symbol,
                    destDecimals: destTokenInfo.decimals,
                  },
                  timeInfo,
                  bidInfo,
                  parties,
                  currentPrice,
                  exists: true, // Mark as existing since we got data
                };
              } catch (error) {
                console.error(`Error fetching auction ${i}:`, error);
                return null;
              }
            })()
          );
        }

        const fetchedAuctions = await Promise.all(auctionsPromises);
        setAuctions(fetchedAuctions.filter(Boolean) as Auction[]);
      } catch (error) {
        console.error("Error fetching auctions:", error);
        setError("Failed to load auctions. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();

    // Set up an interval to refresh current prices and time remaining
    const intervalId = setInterval(() => {
      setAuctions((prev) => [...prev]);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [refreshTrigger]);

  // Get token icon and color
  const getTokenDisplay = (address: string) => {
    const lowerAddress = address.toLowerCase();
    const tokenInfo = Object.entries(tokenIcons).find(
      ([addr]) => addr.toLowerCase() === lowerAddress
    );

    if (tokenInfo) {
      return tokenInfo[1];
    }

    return {
      icon: "/placeholder.svg",
      color: "#6B7280", // Gray
      name: "Unknown",
      network: "Unknown Network",
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center pt-32 pb-20 px-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-4 text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
            Dutch Auctions
          </h1>
          <p className="text-xl text-gray-300">
            Bid on cross-chain bridge auctions and win by placing the best bids
          </p>
        </div>

        {/* Network Error */}
        {networkError && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-900/30 rounded-xl flex items-center gap-3 text-yellow-400">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-base">{networkError}</span>
            </div>
            <Button
              onClick={switchNetwork}
              className="bg-yellow-600 hover:bg-yellow-500 text-white"
            >
              Switch Network
            </Button>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={refreshAuctions}
              variant="outline"
              className="bg-slate-800/70 border-blue-900/30 text-blue-400 hover:bg-slate-700/70 hover:text-blue-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <div className="bg-slate-800/70 border border-blue-900/30 rounded-lg p-2 flex items-center gap-2">
              <span className="text-gray-400 text-sm ml-2">Sort by:</span>
              <Button
                variant={sortOrder === "endingSoon" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortOrder("endingSoon")}
                className={
                  sortOrder === "endingSoon"
                    ? "bg-blue-600 hover:bg-blue-500"
                    : "text-gray-300 hover:text-white hover:bg-slate-700/70"
                }
              >
                <Clock className="h-4 w-4 mr-1" />
                Ending Soon
              </Button>
              <Button
                variant={sortOrder === "newest" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortOrder("newest")}
                className={
                  sortOrder === "newest"
                    ? "bg-blue-600 hover:bg-blue-500"
                    : "text-gray-300 hover:text-white hover:bg-slate-700/70"
                }
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Newest
              </Button>
              <Button
                variant={sortOrder === "highestPrice" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortOrder("highestPrice")}
                className={
                  sortOrder === "highestPrice"
                    ? "bg-blue-600 hover:bg-blue-500"
                    : "text-gray-300 hover:text-white hover:bg-slate-700/70"
                }
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Highest Price
              </Button>
            </div>
          </div>

          <Button
            onClick={connectWallet}
            className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500"
          >
            Connect Wallet
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-900/30 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-base">{error}</span>
          </div>
        )}

        {/* Transaction Hash */}
        {txHash && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-900/30 rounded-xl">
            <div className="flex items-center gap-3 text-green-400 mb-2">
              <div className="h-3 w-3 bg-green-400 rounded-full"></div>
              <span className="text-base font-medium">
                Bid Placed Successfully
              </span>
            </div>
            <div className="text-gray-300 text-sm break-all">
              <span className="text-gray-400">Tx Hash: </span>
              <a
                href={`https://explorer.v006.t1protocol.com/address/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                {txHash}
              </a>
            </div>
          </div>
        )}

        {/* Contract Address Info */}
        <div className="mb-6 p-4 bg-slate-800/50 border border-blue-900/20 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-base font-medium text-gray-300">
              Contract Address:
            </span>
            <a
              href={`https://sepolia.etherscan.io/address/${DUTCH_AUCTION_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-sm break-all"
            >
              {DUTCH_AUCTION_ADDRESS}
            </a>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <p className="text-xl text-gray-300">Loading auctions...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-blue-900/20">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
              <p className="text-2xl text-gray-300">Error Loading Auctions</p>
              <p className="text-gray-400 max-w-md mx-auto">
                There was a problem connecting to the contract. Please check
                that you're on the correct network and the contract address is
                valid.
              </p>
              <Button
                onClick={refreshAuctions}
                className="mt-4 bg-blue-600 hover:bg-blue-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-blue-900/20">
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-16 w-16 text-gray-500" />
              <p className="text-2xl text-gray-300">No auctions available</p>
              <p className="text-gray-400">Check back later for new auctions</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedAuctions.map((auction) => {
              const status = getAuctionStatus(auction);
              const isActive = isAuctionActive(auction.timeInfo);
              const canBid =
                isActive &&
                auction.bidInfo.winner === ethers.constants.AddressZero &&
                !auction.bidInfo.settled;

              const sourceTokenDisplay = getTokenDisplay(
                auction.tokenInfo.sourceToken
              );
              const destTokenDisplay = getTokenDisplay(
                auction.tokenInfo.destToken
              );

              return (
                <Card
                  key={auction.id}
                  className="bg-slate-900/70 border-blue-900/30 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.1)] overflow-hidden rounded-2xl"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          Auction #{auction.id}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Created by {auction.parties.user.slice(0, 6)}...
                          {auction.parties.user.slice(-4)}
                        </p>
                      </div>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>

                    {/* Network Information */}
                    <div className="flex justify-between text-xs text-gray-400 mb-4">
                      <div>From: {sourceTokenDisplay.network}</div>
                      <div>To: {destTokenDisplay.network}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {/* Source Token */}
                      <div className="bg-slate-800/70 rounded-xl p-4 border border-blue-900/20">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                            style={{
                              backgroundColor: sourceTokenDisplay.color,
                            }}
                          >
                            <Image
                              src={
                                sourceTokenDisplay.icon || "/placeholder.svg"
                              }
                              alt={auction.tokenInfo.sourceSymbol || "Token"}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">
                              Source Token
                            </p>
                            <p className="font-medium text-white">
                              {formatPrice(
                                auction.tokenInfo.sourceAmount,
                                auction.tokenInfo.sourceDecimals,
                                auction.tokenInfo.sourceSymbol
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Destination Token */}
                      <div className="bg-slate-800/70 rounded-xl p-4 border border-blue-900/20">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                            style={{ backgroundColor: destTokenDisplay.color }}
                          >
                            <Image
                              src={destTokenDisplay.icon || "/placeholder.svg"}
                              alt={auction.tokenInfo.destSymbol || "Token"}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">
                              Min. Expected
                            </p>
                            <p className="font-medium text-white">
                              {formatPrice(
                                auction.tokenInfo.minDestAmount,
                                auction.tokenInfo.destDecimals,
                                auction.tokenInfo.destSymbol
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Current Price */}
                    {auction.currentPrice && (
                      <div className="bg-slate-800/70 rounded-xl p-4 border border-blue-900/20 mb-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-400">
                              Current Price
                            </p>
                            <p className="text-2xl font-bold text-white">
                              {formatPrice(
                                auction.currentPrice,
                                auction.tokenInfo.destDecimals,
                                auction.tokenInfo.destSymbol
                              )}
                            </p>
                          </div>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-0 h-auto"
                                >
                                  <Info className="h-5 w-5 text-gray-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-800 border-blue-900/30 text-white text-base p-3">
                                <p>
                                  Dutch auction price decreases over time until
                                  someone places a bid
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    )}

                    {/* Time Remaining */}
                    <div className="flex items-center gap-2 mb-6 text-gray-300">
                      <TimerIcon className="h-5 w-5 text-gray-400" />
                      <span>
                        {isActive
                          ? `Ends in: ${formatTimeRemaining(
                              auction.timeInfo.endTime
                            )}`
                          : auction.timeInfo.endTime <
                            BigInt(Math.floor(Date.now() / 1000))
                          ? "Auction ended"
                          : `Starts in: ${formatTimeRemaining(
                              auction.timeInfo.startTime
                            )}`}
                      </span>
                    </div>

                    {/* Bid Button */}
                    <Button
                      className={cn(
                        "w-full py-4 text-lg rounded-xl",
                        canBid
                          ? "bg-blue-600 hover:bg-blue-500 text-white"
                          : "bg-slate-700 text-gray-300 cursor-not-allowed"
                      )}
                      disabled={
                        !canBid ||
                        placingBid === auction.id ||
                        networkError !== null
                      }
                      onClick={() => placeBid(auction.id)}
                    >
                      <span className="flex items-center gap-2">
                        {placingBid === auction.id ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Processing...
                          </>
                        ) : canBid ? (
                          <>
                            <Gavel className="h-5 w-5" />
                            Place Bid
                          </>
                        ) : auction.bidInfo.winner !==
                          ethers.constants.AddressZero ? (
                          "Bid Placed"
                        ) : (
                          "Cannot Bid"
                        )}
                      </span>
                    </Button>

                    {/* Winner Info */}
                    {auction.bidInfo.winner !==
                      ethers.constants.AddressZero && (
                      <div className="mt-4 text-sm text-gray-400">
                        <p>
                          Winner: {auction.bidInfo.winner.slice(0, 6)}...
                          {auction.bidInfo.winner.slice(-4)}
                        </p>
                        <p>
                          Winning bid:{" "}
                          {formatPrice(
                            auction.bidInfo.winningBid,
                            auction.tokenInfo.destDecimals,
                            auction.tokenInfo.destSymbol
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-12 text-center text-base text-gray-300">
          <p>
            Learn more about how Dutch auctions work for cross-chain bridging
            <a
              href="#"
              className="text-blue-400 hover:text-blue-300 ml-1 underline underline-offset-2"
            >
              here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
