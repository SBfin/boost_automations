import { BoostCore, SignatureType, StrategyType } from "@boostxyz/sdk";
import { BoostRegistry } from "@boostxyz/sdk";
import { config } from "./config";
import "dotenv/config";
import { parseUnits, keccak256, toHex, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
    EventActionPayload,
    ActionStep,
    ActionClaimant,
    FilterType,
    PrimitiveType
  } from '@boostxyz/sdk';
import { parseAbiItem } from 'viem';
import { pad } from 'viem/utils';

const account = {
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
  address: process.env.WALLET_ADDRESS as `0x${string}`,
};
const registry = new BoostRegistry({
  config,
  account: privateKeyToAccount(account.privateKey),
});
const core = new BoostCore({
  config,
  account: privateKeyToAccount(account.privateKey),
});

const BUDGET_ADDRESS = "0x26694b52b68502809938d2fd14385498bf7d7f65";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const TARGET_TOKEN_ADDRESS = "0xb33Ff54b9F7242EF1593d2C9Bcd8f9df46c77935";
const UNISWAP_ROUTER_ADDRESS = "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad";
const CHAIN_ID = 8453;

const token_array = ["0x4F9Fd6Be4a90f2620860d680c0d4d5Fb53d1A825",
                    "0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4",
                    "0xB1a03EdA10342529bBF8EB700a06C60441fEf25d",
                    "0x9a26F5433671751C3276a065f57e5a02D2817973",   
                    "0xb33Ff54b9F7242EF1593d2C9Bcd8f9df46c77935",
                    "0x768BE13e1680b5ebE0024C42c896E3dB59ec0149",
                    "0xc0041ef357b183448b235a8ea73ce4e4ec8c265f",
                    "0x731814e491571A2e9eE3c5b1F7f3b962eE8f4870",
                    "0x22af33fe49fd1fa80c7149773dde5890d3c76f3b",
                    "0x57edc3f1fd42c0d48230e964b1c5184b9c89b2ed"
                    ]

async function main() {
    console.log("Deploying boost...");
    // log the budget address
    console.log("Budget address:", BUDGET_ADDRESS);
    // log the wallet address
    console.log("Wallet address:", account.address);
    // budget account
    const budget = core.ManagedBudget(BUDGET_ADDRESS);

    //console.log("Budget:", budget);

    // log the budget address manager
    console.log("Budget manager:", await budget.owner());

    // Original bytes4 selector
    const bytes4Selector = keccak256(stringToHex("Transfer (address from, address to, uint256 value)")).slice(0, 10) as `0x${string}`

    // Convert to bytes32 by padding with zeros
    const bytes32Selector = bytes4Selector.padEnd(66, '0') as `0x${string}`

    // const signature = pad("0x4b8c8341");
    // 0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67
    const signature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as `0x${string}`;

    const actionStepSwap: ActionStep = {
        chainid: CHAIN_ID,
        signature: signature, 
        signatureType: SignatureType.EVENT, 
        targetContract: TARGET_TOKEN_ADDRESS as `0x${string}`,        
        actionParameter: {
            filterType: FilterType.EQUAL,
            fieldType: PrimitiveType.ADDRESS,
            fieldIndex: 0, // The value parameter is the third parameter
            filterData: UNISWAP_ROUTER_ADDRESS as `0x${string}`, 
        }
      };

    const functionActionPayload = {
        actionClaimant: {
          signatureType: SignatureType.EVENT,
          signature: signature,
          fieldIndex: 1, // The 'recipient' parameter is the second parameter
          targetContract: TARGET_TOKEN_ADDRESS as `0x${string}`,
          chainid: CHAIN_ID,
        },
        actionSteps: [actionStepSwap]
      };

    console.log("action steps:", actionStepSwap);
    const eventAction = core.EventAction(functionActionPayload);
    console.log("event action:", eventAction);

    try {
        // Deploy the boost
        const boost = await core.createBoost({
            maxParticipants: BigInt(10),
            budget: budget,
            action: eventAction,
            incentives: [
                core.ERC20Incentive({
                  asset: USDC_ADDRESS,
                  reward: parseUnits("0.01", 6),
                  limit: BigInt(2),
                  strategy: StrategyType.POOL,
                  manager: budget.assertValidAddress(),
                }),
            ],
        }, {
            chainId: CHAIN_ID
        });

        console.log("Boost deployed successfully!", boost);
        console.log("Boost id:", boost.id);
    } catch (error) {
        console.error("Error deploying boost:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });