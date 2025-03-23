// @ts-nocheck comment
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { HowItWorks } from "@/components/how-it-works";
import { ParticleBackground } from "@/components/particle-background";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden flex flex-col items-center">
      <ParticleBackground />
      <main className="w-full flex flex-col items-center pt-24 md:pt-28">
        <Hero />
        <Features />
        <HowItWorks />
      </main>
    </div>
  );
}
