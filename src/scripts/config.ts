import { http, createConfig } from '@wagmi/core'
import { baseSepolia, base, mainnet, sepolia } from '@wagmi/core/chains'
import { type Connection } from '@wagmi/core'

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(process.env.BASE_RPC_URL),
  },
})