// @ts-nocheck comment
import { useState } from "react";
import { ethers } from "ethers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Gavel, CheckCircle2, AlertCircle } from "lucide-react";
import DutchAuctionABI from "@/utils/abis/DutchAuctionABI.json";
import ERC20ABI from "@/utils/abis/ERC20.json";

interface FillOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  auctionId: number;
  orderId: string;
  destinationToken: string;
  destinationTokenSymbol: string;
  winningBid: ethers.BigNumber;
  onFilled: () => void;
}

const DUTCH_AUCTION_ADDRESS =
  process.env.NEXT_PUBLIC_DUTCH_AUCTION_ADDRESS ||
  "0x7aF0B379525D80691D9176896da00390cC51F7A6";

export default function FillOrderModal({
  isOpen,
  onClose,
  auctionId,
  orderId,
  destinationToken,
  destinationTokenSymbol,
  winningBid,
  onFilled,
}: FillOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"approve" | "fill" | "success" | "error">(
    "approve"
  );
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const resetState = () => {
    setLoading(false);
    setStep("approve");
    setError(null);
    setTxHash(null);
  };

  const handleClose = () => {
    if (!loading) {
      resetState();
      onClose();
    }
  };

  const handleFillOrder = async () => {
    if (!window.ethereum || !window.ethereum._state?.accounts?.length) {
      setError("Please connect your wallet to continue");
      return;
    }

    setLoading(true);

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      // Step 1: Approve the destination token
      setStep("approve");
      const tokenContract = new ethers.Contract(
        destinationToken,
        ERC20ABI,
        signer
      );

      // Check current allowance
      const currentAllowance = await tokenContract.allowance(
        userAddress,
        DUTCH_AUCTION_ADDRESS
      );

      if (currentAllowance.lt(winningBid)) {
        const approveTx = await tokenContract.approve(
          DUTCH_AUCTION_ADDRESS,
          ethers.constants.MaxUint256,
          { gasLimit: 100000 }
        );
        await approveTx.wait();
      }

      // Step 2: Fill the order
      setStep("fill");
      const contract = new ethers.Contract(
        DUTCH_AUCTION_ADDRESS,
        DutchAuctionABI,
        signer
      );

      // Sample origin data - in real implementation this should come from backend or chain
      // This is a placeholder - you would need the actual encoded order data
      const sampleOriginData =
        "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

      const originData = sampleOriginData;

      // Encode the filler data (destination address)
      const fillerData = ethers.utils.defaultAbiCoder.encode(
        ["bytes32"],
        [ethers.utils.hexZeroPad(userAddress, 32)]
      );

      // Call the fill method with explicit gas limit
      const fillTx = await contract.fill(orderId, originData, fillerData, {
        gasLimit: 500000,
      });

      setTxHash(fillTx.hash);
      await fillTx.wait();

      // Success
      setStep("success");
      onFilled();
    } catch (err: any) {
      console.error("Error filling order:", err);
      setStep("error");
      setError(err.message || "Failed to fill order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Fill Auction Order</DialogTitle>
          <DialogDescription className="text-gray-400">
            Complete the auction by filling the order for Auction #{auctionId}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "approve" && (
            <div className="space-y-4">
              <div className="bg-blue-900/20 border border-blue-900/30 rounded-lg p-4">
                <p className="mb-2 font-medium">
                  You'll need to approve and send:
                </p>
                <div className="text-2xl font-bold text-center my-4">
                  {ethers.utils.formatEther(winningBid)}{" "}
                  {destinationTokenSymbol}
                </div>
                <p className="text-sm text-gray-400">
                  This will fulfill your winning bid for this auction and
                  complete the cross-chain transaction.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="bg-blue-500/20 p-1 rounded-full mt-0.5">
                    <Gavel className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Order ID:</p>
                    <p className="text-xs text-gray-400 break-all">{orderId}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "fill" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <p className="text-lg font-medium mb-1">Processing transaction</p>
              <p className="text-sm text-gray-400">
                Please wait while your order is being filled...
              </p>
              {txHash && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-400">Transaction hash:</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 break-all"
                  >
                    {txHash}
                  </a>
                </div>
              )}
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-green-500/20 p-3 rounded-full mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <p className="text-lg font-medium mb-1">
                Order successfully filled!
              </p>
              <p className="text-sm text-gray-400 text-center">
                You have successfully completed this auction and the cross-chain
                transaction.
              </p>
              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                >
                  View transaction
                  <span className="inline-block align-middle">
                    <CheckCircle2 className="h-3 w-3 ml-1" />
                  </span>
                </a>
              )}
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-red-500/20 p-3 rounded-full mb-4">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <p className="text-lg font-medium mb-1">Transaction failed</p>
              <p className="text-sm text-gray-400 text-center">
                {error ||
                  "There was an error processing your transaction. Please try again."}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "approve" && (
            <Button
              onClick={handleFillOrder}
              disabled={loading}
              className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Fill Order"
              )}
            </Button>
          )}

          {(step === "success" || step === "error") && (
            <Button
              onClick={handleClose}
              className={`w-full py-6 font-medium ${
                step === "success"
                  ? "bg-green-600 hover:bg-green-500 text-white"
                  : "bg-slate-700 hover:bg-slate-600 text-white"
              }`}
            >
              {step === "success" ? "Close" : "Try Again"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
