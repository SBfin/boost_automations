import { BoostCore, ManagedBudget } from "@boostxyz/sdk";
import { config } from "./config";
import "dotenv/config";
import { Account, Address, createPublicClient, createWalletClient, http } from "viem";
import { parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from 'viem/chains'; // or your target network
const account = {
    privateKey: process.env.PRIVATE_KEY as `0x${string}`,
    address: process.env.WALLET_ADDRESS as `0x${string}`,
  };

const core = new BoostCore({
    config,
    account: privateKeyToAccount(account.privateKey),
  });

const client = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL)
  });

const walletClient = createWalletClient({
    account: privateKeyToAccount(account.privateKey),
    chain: base,
    transport: http(process.env.BASE_RPC_URL)
  });

const USDC_ADDRESS = "0x83358304b1fcdb122eac1f3c5ba148c26507b6d8";
const BUDGET_ADDRESS = "0x26694b52B68502809938D2FD14385498Bf7d7f65";

// ERC20 ABI (minimum required for balanceOf)
// ERC20 ABI (minimum required for transfer)
const erc20Abi = [
    {
      "constant": false,
      "inputs": [
        {"name": "_to", "type": "address"},
        {"name": "_value", "type": "uint256"}
      ],
      "name": "transfer",
      "outputs": [{"name": "", "type": "bool"}],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "decimals",
      "outputs": [{"name": "", "type": "uint8"}],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [{"name": "_owner", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"name": "balance", "type": "uint256"}],
      "type": "function"
    }
  ] as const;
  


async function main() {
  try {
    console.log('Starting budget funding process...');
    
    // log address and pk
    console.log('Address:', account.address);
    console.log('Private Key:', account.privateKey);

    // Token contract address
    const tokenAddress = USDC_ADDRESS; // Replace with your token address

    // Get balance
    /*
    const balance = await client.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    });

    console.log(`Balance for address ${account.address}:`);
    console.log(`${balance} tokens`);*/


    console.log('Allocating funds...');

    // Token details
    // Budget address
    const recipientAddress = BUDGET_ADDRESS;
    const amount = "1000";

    console.log(`Transferring ${amount} tokens to ${recipientAddress}...`);

    // Perform transfer
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [recipientAddress, parseUnits(amount, 6)]
    });

    console.log('Transaction hash:', hash);

    // Wait for transaction to be mined
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log('Transaction confirmed in block:', receipt.blockNumber);

    return hash;
    // check token balance of address 
    /*
    const allocation = await budget.allocate({
      amount: parseUnits("1", 18), // the amount of tokens to allocate
      asset: REV_TOKEN_ADDRESS, // token address
      target: account.address, // the address allocating the funds
    });*/

    //console.log('Allocation successful:', allocation);
    //return allocation;

  } catch (error) {
    //console.error('Error in budget funding:', error);
    throw error;
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });