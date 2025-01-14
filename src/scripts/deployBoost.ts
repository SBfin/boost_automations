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
const CLANKER_POOL_ADDRESS = "0x8277cf39532d28739be584c5eea1f010c50b8c7f";

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
    
    const bytes4Selector = keccak256(stringToHex("event Swap (address sender, address recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)")).slice(0, 10) as `0x${string}`

    // Convert to bytes32 by padding with zeros
    const bytes32Selector = bytes4Selector.padEnd(66, '0') as `0x${string}`

    const actionStepMint: ActionStep = {
        chainid: 84533,
        signature: bytes32Selector, 
        signatureType: SignatureType.EVENT, 
        targetContract: CLANKER_POOL_ADDRESS as `0x${string}`, 
        actionParameter: {
            filterType: FilterType.LESS_THAN_OR_EQUAL,
            fieldType: PrimitiveType.UINT,
            fieldIndex: 2, // The 'amount' parameter is the first (and only) parameter
            filterData: toHex(0), 
        }
      };

    const functionActionPayload = {
        actionClaimant: {
          signatureType: SignatureType.EVENT,
          signature: bytes32Selector,
          fieldIndex: 0,
          targetContract: CLANKER_POOL_ADDRESS as `0x${string}`,
          chainid: 84532,
        },
        actionSteps: [actionStepMint]
      };
      
    const eventAction = core.EventAction(functionActionPayload);
    
    try {
        // Deploy the boost
        // Who is calling this?
        const boost = await core.createBoost({
            maxParticipants: BigInt(10),
            budget: budget,
            action: eventAction,
            incentives: [
                core.ERC20Incentive({
                  asset: USDC_ADDRESS,
                  reward: parseUnits("1", 6),
                  limit: BigInt(2),
                  strategy: StrategyType.POOL,
                  manager: budget.assertValidAddress(),
                }),
            ],
        }, {
            chainId: 84533
        });

        console.log("Boost deployed successfully!", boost.id);
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