const { ethers } = require("ethers");
const fs = require("fs").promises;
require("dotenv").config();

// Configuration
const stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS;
const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
const recipientAddress = process.env.RECIPIENT_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;
const ankrRpcUrl = process.env.ANKR_RPC_URL;
const endTime = 1713618140;

// Providers
const provider = new ethers.JsonRpcProvider(ankrRpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

// Load ABIs
async function loadAbi(file) {
  const path = `${__dirname}/abi/${file}`;
  const abi = await fs.readFile(path, "utf8");
  return JSON.parse(abi);
}

async function getPriorityGasPrice() {
  // Get the current gas price from the network
  let currentGasPrice = (await provider.getFeeData()).gasPrice;

  // Increase the gas price by a certain percentage to ensure faster transaction confirmation
  // For example, adding 20% more to the current gas price for priority
  let priorityGasPrice =
    currentGasPrice + (currentGasPrice * BigInt(20)) / BigInt(100); // Adds 20%

  // Estimate gas limit for the transaction - you might want to adjust this based on your needs
  const estimatedGasLimit = BigInt(55000); // Standard gas limit for BNB transfer

  // Calculate the cost of gas for the transaction
  return {
    gasCost: priorityGasPrice * estimatedGasLimit,
    estimatedGasLimit,
    priorityGasPrice,
  };
}

async function transferAllNativeToSecureWallet() {
  try {
    const { gasCost, estimatedGasLimit, priorityGasPrice } =
      await getPriorityGasPrice();
    console.log("🚀 « gasCost:", ethers.formatEther(gasCost));

    // Fetch the current balance
    const bnbBalance = await provider.getBalance(wallet.address);
    console.log("🚀 ~ bnbBalance:", ethers.formatEther(bnbBalance));

    // Calculate the amount to transfer, subtracting the cost of gas from the total balance
    const amountToTransfer = bnbBalance - gasCost;
    console.log("🚀 « amountToTransfer:", ethers.formatEther(amountToTransfer));

    // Ensure the calculated amount to transfer is positive
    if (amountToTransfer > 0) {
      console.log("Transferring all BNB to secure wallet...");
      // const bnbTransferTx = await wallet.sendTransaction({
      //   to: recipientAddress,
      //   value: amountToTransfer,
      //   gasPrice: priorityGasPrice, // Use the calculated priority gas price
      //   gasLimit: estimatedGasLimit,
      // });
      // await bnbTransferTx.wait();
      // console.log(`BNB transfer successful: ${bnbTransferTx.hash}`);
    } else {
      console.log("Not enough BNB balance to cover the gas fees for transfer.");
    }
  } catch (error) {
    console.error(`Failed to transfer BNB: ${error.message}`);
  }
}

async function unstakeTokens() {
  const stakingContractAbi = await loadAbi("stakeContractAbi.json");

  const stakingContract = new ethers.Contract(
    stakingContractAddress,
    stakingContractAbi,
    wallet
  );

  // Withdraw tokens
  console.log("Attempting to withdraw tokens...");
  const withdrawTx = await stakingContract.withdraw();
  await withdrawTx.wait();
  console.log(`Withdraw transaction successful: ${withdrawTx.hash}`);
}

async function transferTokensToSecureWallet() {
  const tokenContractAbi = await loadAbi("tokenAbi.json");

  const tokenContract = new ethers.Contract(
    tokenContractAddress,
    tokenContractAbi,
    wallet
  );

  // Transfer tokens to secure wallet
  const tokenBalance = await tokenContract.balanceOf(wallet.address);
  console.log("🚀 « tokenBalance:", tokenBalance);
  console.log("Transferring tokens to secure wallet...");
  if (tokenBalance > 0) {
    const transferTx = await tokenContract.transfer(
      recipientAddress,
      tokenBalance
    );
    await transferTx.wait();
    console.log(`Token transfer successful: ${transferTx.hash}`);
  }
}

// Transaction Flow Function
async function executeTransactionFlow() {
  try {
    // Unstake tokens
    await unstakeTokens();

    // Transfer tokens to secure wallet
    await transferTokensToSecureWallet();

    // Transfer BNB to secure wallet
    await transferAllNativeToSecureWallet();
  } catch (error) {
    console.error(
      `An error occurred during the transaction flow: ${error.message}`
    );
  }
}

// Main Function
async function main() {
  console.log(
    "Starting to monitor the blockchain for the right block timestamp..."
  );
  while (true) {
    const currentBlock = await provider.getBlock("latest");
    if (currentBlock.timestamp >= endTime) {
      console.log(
        "Detected block timestamp >= endTime, executing transaction flow..."
      );
      await executeTransactionFlow();
      break;
    } else {
      const remainingTime = endTime - currentBlock.timestamp;
      const days = Math.floor(remainingTime / (60 * 60 * 24));
      const hours = Math.floor((remainingTime % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((remainingTime % (60 * 60)) / 60);
      const seconds = remainingTime % 60;

      console.log(
        "---------------------------------------------------------------"
      );
      console.log(currentBlock.timestamp, "Current block timestamp");
      console.log(endTime, "End time");
      console.log(
        `${days} day(s), ${hours} hour(s), ${minutes} minute(s), ${seconds} second(s) remaining`
      );
    }
    // Wait for a bit before checking again to avoid spamming your RPC provider
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

main().catch(console.error);
