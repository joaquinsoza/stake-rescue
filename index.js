const { ethers } = require("ethers");

// Configuration
const stakingContractAddress = "YOUR_STAKING_CONTRACT_ADDRESS";
const tokenContractAddress = "YOUR_TOKEN_CONTRACT_ADDRESS";
const recipientAddress = "YOUR_UNCOMPROMISED_WALLET_ADDRESS";
const privateKey = "YOUR_PRIVATE_KEY"; // Be cautious with your private key
const ankrRpcUrl = "https://rpc.ankr.com/bsc"; // BSC Ankr RPC URL

// ABI for the necessary functions
const stakingContractAbi = [
  // Add only the relevant parts of the ABI
  "function withdraw() external returns (bool)",
  // Include any other functions you might need to call
];
const tokenContractAbi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
];

// Providers and signers
const provider = new ethers.providers.JsonRpcProvider(ankrRpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);
const stakingContract = new ethers.Contract(
  stakingContractAddress,
  stakingContractAbi,
  wallet
);
const tokenContract = new ethers.Contract(
  tokenContractAddress,
  tokenContractAbi,
  wallet
);

// Main function
async function main() {
  try {
    // Withdraw tokens
    console.log("Attempting to withdraw tokens...");
    const withdrawTx = await stakingContract.withdraw();
    const withdrawReceipt = await withdrawTx.wait();
    console.log(
      `Withdraw transaction successful with hash: ${withdrawReceipt.transactionHash}`
    );

    // Transfer tokens to secure wallet
    console.log("Transferring tokens to secure wallet...");
    const tokenBalance = await tokenContract.balanceOf(wallet.address);
    const transferTx = await tokenContract.transfer(
      recipientAddress,
      tokenBalance
    );
    const transferReceipt = await transferTx.wait();
    console.log(
      `Token transfer successful with hash: ${transferReceipt.transactionHash}`
    );

    // Transfer BNB to secure wallet
    console.log("Transferring remaining BNB to secure wallet...");
    const bnbBalance = await provider.getBalance(wallet.address);
    // Ensure gas cost is covered and leave a little margin
    const gasEstimate = ethers.utils.parseUnits("0.00021", "ether"); // Adjust based on current gas prices
    const bnbTransferAmount = bnbBalance.sub(gasEstimate);
    if (bnbTransferAmount.gt(0)) {
      const bnbTransferTx = await wallet.sendTransaction({
        to: recipientAddress,
        value: bnbTransferAmount,
      });
      const bnbTransferReceipt = await bnbTransferTx.wait();
      console.log(
        `BNB transfer successful with hash: ${bnbTransferReceipt.transactionHash}`
      );
    } else {
      console.log("Not enough BNB balance for transfer after gas.");
    }
  } catch (error) {
    console.error(`An error occurred during the operation: ${error}`);
  }
}

// Execute the main function
main();
