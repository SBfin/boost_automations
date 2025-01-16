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
const BALANCER_ROUTER_ADDRESS = "0xba12222222228d8ba445958a75a0704d566bf2c8";
const CHAIN_ID = 8453;
/*ZBU-OLAS*/
const token_array = /*["0x4F9Fd6Be4a90f2620860d680c0d4d5Fb53d1A825",
                    "0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4",
                    "0xB1a03EdA10342529bBF8EB700a06C60441fEf25d",*/
                    ["0x54330d28ca3357F294334BDC454a032e7f353416"]

async function main() {
    console.log("Deploying boosts...");
    console.log("Budget address:", BUDGET_ADDRESS);
    console.log("Wallet address:", account.address);
    const budget = core.ManagedBudget(BUDGET_ADDRESS);
    console.log("Budget manager:", await budget.owner());

    const bytes4Selector = keccak256(stringToHex("Transfer (address from, address to, uint256 value)")).slice(0, 10) as `0x${string}`
    const bytes32Selector = bytes4Selector.padEnd(66, '0') as `0x${string}`
    const signature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as `0x${string}`;

    // Iterate through each token in the array
    for (const tokenAddress of token_array) {
        console.log(`Creating boost for token: ${tokenAddress}`);
        
        const actionStepSwap: ActionStep = {
            chainid: CHAIN_ID,
            signature: signature, 
            signatureType: SignatureType.EVENT, 
            targetContract: tokenAddress as `0x${string}`,        
            actionParameter: {
                filterType: FilterType.EQUAL,
                fieldType: PrimitiveType.ADDRESS,
                fieldIndex: 0,
                filterData: BALANCER_ROUTER_ADDRESS as `0x${string}`, 
            }
        };

        const functionActionPayload = {
            actionClaimant: {
                signatureType: SignatureType.EVENT,
                signature: signature,
                fieldIndex: 1,
                targetContract: tokenAddress as `0x${string}`,
                chainid: CHAIN_ID,
            },
            actionSteps: [actionStepSwap]
        };

        const eventAction = core.EventAction(functionActionPayload);

        try {
            const boost = await core.createBoost({
                maxParticipants: BigInt(10),
                budget: budget,
                action: eventAction,
                incentives: [
                    core.ERC20Incentive({
                        asset: USDC_ADDRESS,
                        reward: parseUnits("0.1", 6),
                        limit: BigInt(1),
                        strategy: StrategyType.POOL,
                        manager: budget.assertValidAddress(),
                    }),
                ],
            }, {
                chainId: CHAIN_ID
            });

            console.log(`Boost deployed successfully for token ${tokenAddress}!`);
            console.log("Boost id:", boost.id);
        } catch (error) {
            console.error(`Error deploying boost for token ${tokenAddress}:`, error);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });