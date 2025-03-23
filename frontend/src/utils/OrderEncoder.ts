// utils/OrderEncoder.ts
import { ethers } from 'ethers';

export interface OrderData {
  sender: string;
  recipient: string;
  inputToken: string;
  outputToken: string;
  amountIn: ethers.BigNumberish;
  amountOut: ethers.BigNumberish;
  senderNonce: number;
  originDomain: number;
  destinationDomain: number;
  destinationSettler: string;
  fillDeadline: number;
  data: string;
}

export class OrderEncoder {
  // Returns the orderDataType used in the contract
  static orderDataType(): string {
    return ethers.utils.formatBytes32String('BasicSwap7683.OrderData');
  }

  // Encodes the OrderData into a byte array matching the contract's expected format
  static encode(orderData: OrderData): string {
    return ethers.utils.defaultAbiCoder.encode(
      [
        'tuple(bytes32 sender, bytes32 recipient, bytes32 inputToken, bytes32 outputToken, ' +
        'uint256 amountIn, uint256 amountOut, uint32 senderNonce, uint32 originDomain, ' +
        'uint32 destinationDomain, bytes32 destinationSettler, uint32 fillDeadline, bytes data)'
      ],
      [orderData]
    );
  }

  // Calculates the order ID matching the contract's calculation
  static id(orderData: OrderData): string {
    const encodedOrder = this.encode(orderData);
    return ethers.utils.keccak256(encodedOrder);
  }
}