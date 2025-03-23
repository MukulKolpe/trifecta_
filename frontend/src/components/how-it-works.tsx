"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function HowItWorks() {
  const [activeTab, setActiveTab] = useState("deposit");

  const steps = {
    deposit: [
      {
        title: "User Deposits Tokens",
        description: "Alice deposits tokens to the Escrow contract on L1.",
        icon: "💰",
      },
      {
        title: "Tokens Bridged to t1",
        description: "Tokens are bridged to t1 via the L1ERC20Gateway.",
        icon: "🌉",
      },
    ],
    auction: [
      {
        title: "Dutch Auction Starts",
        description: "A Dutch auction starts on t1 with an initial price.",
        icon: "🏛️",
      },
      {
        title: "Price Decreases Over Time",
        description:
          "The price decreases linearly until a filler accepts or the reserve price is reached.",
        icon: "⏱️",
      },
      {
        title: "Filler Accepts Price",
        description:
          "The first bidder to accept the current price wins the auction.",
        icon: "🎯",
      },
    ],
    settlement: [
      {
        title: "Filler Executes Settlement",
        description: "The winning filler executes the settlement on L1.",
        icon: "✅",
      },
      {
        title: "Tokens Transferred to User",
        description: "The filler transfers tokens to Alice on L1.",
        icon: "↩️",
      },
      {
        title: "Filler Receives Tokens",
        description: "The filler receives Alice's tokens on t1.",
        icon: "🔄",
      },
    ],
  };

  return (
    <section
      id="how-it-works"
      className="py-24 bg-slate-950 w-full flex justify-center"
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            How It Works
          </h2>
          <p className="text-gray-300 text-xl">
            Our bridge uses a Dutch auction mechanism to optimize cross-chain
            token transfers between L1 and the t1 chain.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <Tabs
            defaultValue="deposit"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 mb-12 bg-slate-800 p-2 border border-blue-900/50 rounded-lg mx-auto">
              <TabsTrigger
                value="deposit"
                className={cn(
                  "text-lg py-4 data-[state=active]:bg-blue-600 data-[state=active]:text-white",
                  activeTab === "deposit" ? "text-white" : "text-gray-400"
                )}
              >
                Deposit Phase
              </TabsTrigger>
              <TabsTrigger
                value="auction"
                className={cn(
                  "text-lg py-4 data-[state=active]:bg-blue-600 data-[state=active]:text-white",
                  activeTab === "auction" ? "text-white" : "text-gray-400"
                )}
              >
                Auction Phase
              </TabsTrigger>
              <TabsTrigger
                value="settlement"
                className={cn(
                  "text-lg py-4 data-[state=active]:bg-blue-600 data-[state=active]:text-white",
                  activeTab === "settlement" ? "text-white" : "text-gray-400"
                )}
              >
                Settlement Phase
              </TabsTrigger>
            </TabsList>

            {Object.entries(steps).map(([phase, phaseSteps]) => (
              <TabsContent key={phase} value={phase} className="mt-0">
                <div className="relative">
                  <div className="absolute left-10 top-0 bottom-0 w-1 bg-blue-900/50" />

                  <div className="space-y-12">
                    {phaseSteps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="relative flex items-start"
                      >
                        <div className="absolute left-10 top-10 -ml-px h-full w-1 bg-blue-900/50" />
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/20 text-3xl">
                          {step.icon}
                        </div>
                        <div className="ml-8 mt-2">
                          <h3 className="text-2xl font-semibold text-white">
                            {step.title}
                          </h3>
                          <p className="mt-2 text-gray-300 text-lg">
                            {step.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-12 flex justify-center">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (activeTab === "deposit") setActiveTab("auction");
                        else if (activeTab === "auction")
                          setActiveTab("settlement");
                        else setActiveTab("deposit");
                      }}
                      className="gap-2 text-blue-400 hover:text-blue-300 hover:bg-blue-950/50 text-lg py-6 px-8"
                    >
                      {activeTab === "settlement" ? "Start Over" : "Next Phase"}
                      {activeTab !== "settlement" ? (
                        <ArrowRight className="h-5 w-5" />
                      ) : (
                        <ArrowDown className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-20 p-8 bg-slate-800/50 rounded-lg border border-blue-900/50 shadow-[0_0_15px_rgba(59,130,246,0.1)] mx-auto">
            <h3 className="text-2xl font-semibold mb-6 text-white text-center">
              Dutch Auction Mechanism
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-gray-300 text-lg mb-6">
                  The Dutch auction works by starting with a high price
                  (typically 120% of the minimum destination amount) and
                  linearly decreasing the price over time until a filler accepts
                  or the reserve price is reached.
                </p>
                <p className="text-gray-300 text-lg">
                  This approach ensures efficient price discovery, maximum value
                  for the user, quick finality, and guaranteed minimum
                  execution.
                </p>
              </div>
              <div className="relative h-64 bg-slate-900 rounded-lg overflow-hidden border border-blue-900/50">
                <DutchAuctionGraph />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DutchAuctionGraph() {
  const points = [
    { x: 0, y: 20 }, // Start at 120%
    { x: 80, y: 80 }, // End at 95%
    { x: 100, y: 80 }, // Flat line at reserve price
  ];

  // Convert points to SVG path
  const pathData = points
    .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="absolute inset-0 p-6">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        <line
          x1="0"
          y1="20"
          x2="100"
          y2="20"
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="3"
        />
        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="3"
        />
        <line
          x1="0"
          y1="80"
          x2="100"
          y2="80"
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="3"
        />

        {/* X and Y axis */}
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          stroke="#64748b"
          strokeWidth="1.5"
        />
        <line
          x1="0"
          y1="100"
          x2="100"
          y2="100"
          stroke="#64748b"
          strokeWidth="1.5"
        />

        {/* Dutch auction curve */}
        <path
          d={`${pathData} L 100 100 L 0 100 Z`}
          fill="url(#gradient)"
          opacity="0.4"
        />
        <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="3" />

        {/* Animated dot */}
        <circle
          className="animate-pulse"
          cx="40"
          cy="50"
          r="5"
          fill="#60a5fa"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Labels */}
      <div className="absolute top-2 left-2 text-sm text-gray-300">120%</div>
      <div className="absolute bottom-2 left-2 text-sm text-gray-300">95%</div>
      <div className="absolute bottom-2 right-2 text-sm text-gray-300">
        Time
      </div>
      <div className="absolute top-1/2 left-2 text-sm text-gray-300 -translate-y-1/2">
        Price
      </div>
    </div>
  );
}
