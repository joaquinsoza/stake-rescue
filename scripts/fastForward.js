const { ethers } = require("ethers");
require("dotenv").config();

// Configuration
const networkRpcUrl = process.env.RPC_URL;

// Providers
const provider = new ethers.JsonRpcProvider(networkRpcUrl);

async function fastForwardToTimestamp(targetTimestamp) {
  // Fast forward to the target timestamp
  await provider.send("evm_setNextBlockTimestamp", [targetTimestamp]);
  await provider.send("evm_mine"); // Mine a new block to apply the timestamp change
  console.log(`Fast forwarded to timestamp: ${targetTimestamp}`);
}

async function main() {
  const targetTimestamp = 1713618150; // Example target timestamp

  // Ensure the target timestamp is in the future to avoid errors
  // const currentBlock = await provider.getBlock("latest");
  // let currentTimestamp = currentBlock.timestamp;

  // while (true) {
  //   const newTimestamp = currentTimestamp + 10500;
  //   await fastForwardToTimestamp(newTimestamp);
  //   currentTimestamp = newTimestamp;
  //   if (currentTimestamp >= targetTimestamp) {
  //     break;
  //   }
  // }
  await fastForwardToTimestamp(targetTimestamp);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
