import "@/styles/globals.css";
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import WagmiProvider from "../utils/wagmiprovider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div>
      <WagmiProvider>
        <Navbar />
        <Component {...pageProps} />
        <Footer />
      </WagmiProvider>
    </div>
  );
}
