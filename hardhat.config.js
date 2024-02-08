require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 56, // BSC's chain ID
      forking: {
        url: "https://bsc-dataseed.binance.org/",
      },
    },
  },
};
