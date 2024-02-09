# Rescue Script for Compromised Wallet: Unstaking and Transferring Tokens

This repository contains a script developed to recover tokens from a compromised wallet. The primary purpose was to safely unstake and transfer tokens, along with any BNB balance, to a secure wallet before the compromised account could be further exploited. The script activates once a specific stake's `endTime` (a predetermined timestamp) is reached, ensuring the entire balance is securely transferred out of the compromised wallet.

### Environment Variables

To run the script, you'll need to set up the following environment variables in a `.env` file:

```
STAKING_CONTRACT_ADDRESS=<Address of the staking contract>
TOKEN_CONTRACT_ADDRESS=<Address of the staked token>
RECIPIENT_ADDRESS=<Your secure wallet address>
PRIVATE_KEY=<Private key of the compromised wallet>
RPC_URL=<Your RPC URL, e.g., Ankr or Infura. For Hardhat tests, use the local RPC URL>
```

### Getting Started

#### Installing Dependencies

To install necessary dependencies, run:

```bash
yarn install
```

#### Executing the Script

To start the rescue process, execute:

```bash
yarn start
```

This script will continuously monitor the blockchain until the `block.timestamp` equals or surpasses the stake's `endTime`. Once this condition is met, it will proceed with the unstaking and asset transfer operations.

### Testing in a Hardhat Environment

To simulate and test the script in a controlled environment:

1. Configure `hardhat.config.js` for the desired network (e.g., Binance Smart Chain). This involves setting the correct RPC URL in the configuration file.
2. Start a local Hardhat node, which will fork the current state of the specified blockchain:

```bash
yarn hardhat node
```

This creates a local fork for testing, allowing you to run the script as if it were on the mainnet without deploying additional contracts.

#### Fast Forwarding Time

To test the script without waiting for real-time progression to the `endTime`, use the fast-forward script:

```bash
yarn fastForward
```

This command adjusts the Hardhat node's timestamp to the specified `endTime`, enabling the immediate execution of the unstake and transfer operations.

### Draining Script

Included is a `test.js` script designed for further testing and security measures. When run, it monitors the wallet for any new deposits. If deposits are detected, it automatically drains these assets to the `RECIPIENT_ADDRESS`. This is particularly useful for safeguarding the wallet against further actions by the attacker.

```bash
node src/test.js
```

This proactive measure is recommended for use immediately after the initial token rescue operation, ensuring that any attempt by the attacker to utilize the compromised wallet results in the assets being securely redirected.
