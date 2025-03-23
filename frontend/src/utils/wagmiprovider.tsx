// @ts-nocheck comment
import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { configureChains, createClient, WagmiConfig } from "wagmi";
import { Chain, sepolia } from "wagmi/chains";

import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";

const t1Devnet: Chain = {
  id: 299792,
  name: "𝚝𝟷 Devnet",
  network: "𝚝𝟷 Devnet",
  nativeCurrency: {
    decimals: 18,
    name: "ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.v006.t1protocol.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "𝚝𝟷 Devnet",
      url: "https://explorer.v006.t1protocol.com/",
    },
  },
  testnet: true,
};

const { chains, provider } = configureChains(
  [t1Devnet, sepolia],
  [
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_ID }),
    publicProvider(),
  ]
);

const { connectors } = getDefaultWallets({
  appName: "My RainbowKit App",
  chains,
});

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

function WagmiConnect(props: any) {
  return (
    <>
      <WagmiConfig client={wagmiClient}>
        <RainbowKitProvider
          chains={chains}
          theme={darkTheme({
            accentColor: "#1E88E5",
            borderRadius: "large",
            overlayBlur: "small",
          })}
          coolMode
        >
          {props.children}
        </RainbowKitProvider>
      </WagmiConfig>
    </>
  );
}

export default WagmiConnect;
