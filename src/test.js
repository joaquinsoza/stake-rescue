const { ethers } = require("ethers");
require("dotenv").config();

// Load environment variables for blockchain interaction and transaction execution
const recipientAddress = process.env.RECIPIENT_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;
const networkRpcUrl = process.env.RPC_URL;

// Initialize blockchain provider and wallet for transactions
const provider = new ethers.JsonRpcProvider(networkRpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

// Function to calculate priority gas price for faster transaction confirmations
async function getPriorityGasPrice() {
  // Get the current gas price from the network
  let currentGasPrice = (await provider.getFeeData()).gasPrice;

  // Increase the gas price by a certain percentage to ensure faster transaction confirmation
  // For example, adding 20% more to the current gas price for priority
  let priorityGasPrice =
    currentGasPrice + (currentGasPrice * BigInt(20)) / BigInt(100); // Adds 20%

  // Estimate gas limit for the transaction - you might want to adjust this based on your needs
  const estimatedGasLimit = BigInt(21000); // Standard gas limit for BNB transfer

  console.log(
    `Calculated Priority Gas Price: ${ethers.formatUnits(
      priorityGasPrice,
      "gwei"
    )} Gwei`
  );
  return {
    gasCost: priorityGasPrice * estimatedGasLimit,
    estimatedGasLimit,
    priorityGasPrice,
  };
}

// Function to transfer all native currency (ETH/BNB) to a secure wallet, accounting for gas costs
async function transferAllNativeToSecureWallet(nativeBalance) {
  try {
    const { gasCost, estimatedGasLimit, priorityGasPrice } =
      await getPriorityGasPrice();
    console.log(`Gas Cost for Transfer: ${ethers.formatEther(gasCost)} BNB`);

    // Calculate the amount to transfer, subtracting the cost of gas from the total balance
    const amountToTransfer = nativeBalance - gasCost;
    console.log(
      `Amount to Transfer: ${ethers.formatEther(amountToTransfer)} BNB`
    );

    // Ensure the calculated amount to transfer is positive
    if (amountToTransfer > 0) {
      console.log("Initiating transfer to secure wallet...");
      const bnbTransferTx = await wallet.sendTransaction({
        to: recipientAddress,
        value: amountToTransfer,
        gasPrice: priorityGasPrice, // Use the calculated priority gas price
        gasLimit: estimatedGasLimit,
      });
      await bnbTransferTx.wait();
      console.log(
        `Transfer successful: Transaction Hash: ${bnbTransferTx.hash}`
      );
    } else {
      console.log("Insufficient balance to cover gas fees for transfer.");
    }
  } catch (error) {
    console.error(`Transfer failed: ${error.message}`);
  }
}

// Main function to monitor blockchain and execute transactions at the specified time
async function main() {
  console.log("Monitoring blockchain for execution trigger...");
  while (true) {
    // Fetch the current balance
    const nativeBalance = await provider.getBalance(wallet.address);
    console.log(`Wallet Balance: ${ethers.formatEther(nativeBalance)} BNB`);

    if (nativeBalance > 0) {
      console.log("Received balance, executing transactions...");
      await transferAllNativeToSecureWallet(nativeBalance);
    } else {
      console.log("No balance received yet, checking again in 1 minute...");
    }
    // Wait for a bit before checking again to avoid spamming your RPC provider
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

main().catch((error) => console.error(`Execution halted: ${error.message}`));
