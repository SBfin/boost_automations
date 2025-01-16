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
const COWSWAP_GPV2_SETTLEMENT_ADDRESS = "0xba12222222228d8ba445958a75a0704d566bf2c8";
const CHAIN_ID = 8453;
/*ZBU-OLAS*/
const token_array = /*["0x4F9Fd6Be4a90f2620860d680c0d4d5Fb53d1A825",
                    "0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4",
                    "0xB1a03EdA10342529bBF8EB700a06C60441fEf25d",*/
                    [COWSWAP_GPV2_SETTLEMENT_ADDRESS]

async function main() {
    console.log("Deploying boosts...");
    console.log("Budget address:", BUDGET_ADDRESS);
    console.log("Wallet address:", account.address);
    const budget = core.ManagedBudget(BUDGET_ADDRESS);
    console.log("Budget manager:", await budget.owner());

    // trade event emitted from gpv2 settlement
    const signature = "0xa07a543ab8a018198e99ca0184c93fe9050a79400a0a723441f84de1d972cc17" as `0x${string}`;

    // Iterate through each token in the array
    for (const tokenAddress of token_array) {
        console.log(`Creating boost for token: ${tokenAddress}`);
        
        const actionStepSwap: ActionStep = {
            chainid: CHAIN_ID,
            signature: signature, 
            signatureType: SignatureType.EVENT, 
            targetContract: COWSWAP_GPV2_SETTLEMENT_ADDRESS as `0x${string}`,
            actionParameter: {
                filterType: FilterType.GREATER_THAN_OR_EQUAL,
                fieldType: PrimitiveType.ADDRESS,
                fieldIndex: 0,
                filterData: "0x0000000000000000000000000000000000000000" as `0x${string}`, 
            }
        };

        const functionActionPayload = {
            actionClaimant: {
                signatureType: SignatureType.EVENT,
                signature: signature,
                fieldIndex: 0, // owner is 0
                targetContract: COWSWAP_GPV2_SETTLEMENT_ADDRESS as `0x${string}`,
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
                        reward: parseUnits("0.01", 6),
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