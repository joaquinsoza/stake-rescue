const { ethers } = require("ethers");
const fs = require("fs").promises;
require("dotenv").config();

// Load environment variables for blockchain interaction and transaction execution
const stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS;
const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
const recipientAddress = process.env.RECIPIENT_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;
const networkRpcUrl = process.env.RPC_URL;
const endTime = 1713618140; // Timestamp to initiate transaction flow, in this case is when the locking period ends

// Initialize blockchain provider and wallet for transactions
const provider = new ethers.JsonRpcProvider(networkRpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

// Function to load contract ABIs from local files
async function loadAbi(file) {
  const path = `${__dirname}/abi/${file}`;
  const abi = await fs.readFile(path, "utf8");
  return JSON.parse(abi);
}

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
async function transferAllNativeToSecureWallet() {
  try {
    const { gasCost, estimatedGasLimit, priorityGasPrice } =
      await getPriorityGasPrice();
    console.log(`Gas Cost for Transfer: ${ethers.formatEther(gasCost)} BNB`);

    // Fetch the current balance
    const bnbBalance = await provider.getBalance(wallet.address);
    console.log(`Wallet Balance: ${ethers.formatEther(bnbBalance)} BNB`);

    // Calculate the amount to transfer, subtracting the cost of gas from the total balance
    const amountToTransfer = bnbBalance - gasCost;
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

// Function to unstake tokens from a staking contract
async function unstakeTokens() {
  const stakingContractAbi = await loadAbi("stakeContractAbi.json");

  const stakingContract = new ethers.Contract(
    stakingContractAddress,
    stakingContractAbi,
    wallet
  );

  // Withdraw tokens
  try {
    console.log("Unstaking tokens...");
    const withdrawTx = await stakingContract.withdraw();
    await withdrawTx.wait();
    console.log(`Unstake successful: Transaction Hash: ${withdrawTx.hash}`);
  } catch (error) {
    console.error(`Unstaking failed: ${error}`);
  }
}

// Function to transfer tokens to a secure wallet
async function transferTokensToSecureWallet() {
  const tokenContractAbi = await loadAbi("tokenAbi.json");

  const tokenContract = new ethers.Contract(
    tokenContractAddress,
    tokenContractAbi,
    wallet
  );

  // Transfer tokens to secure wallet
  const tokenBalance = await tokenContract.balanceOf(wallet.address);
  console.log(`Token Balance: ${tokenBalance.toString()}`);

  if (tokenBalance > 0) {
    console.log("Transferring tokens to secure wallet...");
    try {
      const transferTx = await tokenContract.transfer(
        recipientAddress,
        tokenBalance
      );
      await transferTx.wait();
      console.log(
        `Token transfer successful: Transaction Hash: ${transferTx.hash}`
      );
    } catch (error) {
      console.error(`Token transfer failed: ${error}`);
    }
  }
}

// Orchestrates the execution of unstaking, token transfer, and native currency transfer
async function executeTransactionFlow() {
  try {
    await unstakeTokens();
    console.log(
      "---------------------------------------------------------------"
    );
    await transferTokensToSecureWallet();
    console.log(
      "---------------------------------------------------------------"
    );
    await transferAllNativeToSecureWallet();
  } catch (error) {
    console.error(`Transaction flow error: ${error.message}`);
  }
}

// Main function to monitor blockchain and execute transactions at the specified time
async function main() {
  console.log("Monitoring blockchain for execution trigger...");
  try {
    await notifyAction("Stake rescue service started");
  } catch (error) {
    console.error("Failed to notify service start:", error);
  }

  while (true) {
    let currentBlock;
    try {
      currentBlock = await provider.getBlock("latest");
    } catch (error) {
      console.error("Failed to fetch the latest block:", error);
      console.log("Retrying in 10 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Increased wait time to reduce load and allow for recovery
      continue; // Continue the loop, skipping the rest of this iteration
    }

    try {
      if (currentBlock.timestamp >= endTime) {
        console.log("Trigger condition met, executing transactions...");
        try {
          await notifyAction("Flow initiated");
        } catch (notificationError) {
          console.error(
            "Failed to notify transaction initiation:",
            notificationError
          );
        }
        await executeTransactionFlow();
        break; // Exit the loop after successful execution
      } else {
        // Display remaining time in a human-readable format
        const remainingTime = endTime - currentBlock.timestamp;
        const days = Math.floor(remainingTime / (60 * 60 * 24));
        const hours = Math.floor((remainingTime % (60 * 60 * 24)) / (60 * 60));
        const minutes = Math.floor((remainingTime % (60 * 60)) / 60);
        const seconds = remainingTime % 60;

        console.log("Current block number:", currentBlock.number);
        console.log("Current block timestamp:", currentBlock.timestamp);
        console.log("End time:", endTime);
        console.log(
          `Time until execution: ${days}d ${hours}h ${minutes}m ${seconds}s`
        );
        console.log(
          "---------------------------------------------------------------"
        );
      }
    } catch (executionError) {
      console.error(
        "Error during execution checking or flow initiation:",
        executionError
      );
    }

    // Wait for a bit before checking again to avoid spamming your RPC provider
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Function to send notifications
async function notifyAction(message) {
  try {
    const response = await fetch(process.env.NTFY_URL, {
      method: "POST",
      body: message,
    });
    if (!response.ok) {
      throw new Error(`Failed to send notification: ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(`Notification error: ${error.message}`);
  }
}

main().catch((error) => console.error(`Execution halted: ${error.message}`));
