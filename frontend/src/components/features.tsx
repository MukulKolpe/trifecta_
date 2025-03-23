"use client";

import type React from "react";

import { motion } from "framer-motion";
import { Clock, Shield, Zap, LinkIcon, BarChart3, Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function Features() {
  const features = [
    {
      icon: <Clock className="h-12 w-12 text-blue-400" />,
      title: "Dutch Auction Mechanism",
      description:
        "Optimal price discovery through time-based decreasing prices, ensuring maximum value for users.",
    },
    {
      icon: <Shield className="h-12 w-12 text-blue-400" />,
      title: "Trusted Execution Environments",
      description:
        "Secure hardware areas that protect sensitive data and computations from tampering or unauthorized access.",
    },
    {
      icon: <Zap className="h-12 w-12 text-blue-400" />,
      title: "Real-Time Proving",
      description:
        "Immediate validation of computations, allowing systems to verify correct execution with minimal latency.",
    },
    {
      icon: <LinkIcon className="h-12 w-12 text-blue-400" />,
      title: "Cross-Chain Composability",
      description:
        "Seamless interoperability with the Ethereum ecosystem and improved application-first user experience.",
    },
    {
      icon: <BarChart3 className="h-12 w-12 text-blue-400" />,
      title: "Scalable Performance",
      description:
        "Achieve the cost and performance benefits of rollup transactions while maintaining ecosystem composability.",
    },
    {
      icon: <Lock className="h-12 w-12 text-blue-400" />,
      title: "Encrypted Mempool",
      description:
        "Prevents adversarial reordering such as sandwich attacks, protecting users from front-running and back-running.",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section
      id="features"
      className="py-24 bg-slate-900 w-full flex justify-center"
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Cutting-Edge Technology
          </h2>
          <p className="text-gray-300 text-xl">
            Our bridge combines advanced technologies to provide a secure,
            efficient, and user-friendly cross-chain experience.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="h-full border-blue-900/50 bg-slate-800/50 backdrop-blur-sm hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-300 overflow-hidden group">
      <div className="absolute -right-16 -top-16 w-32 h-32 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-all duration-500"></div>
      <CardHeader className="pb-2">
        <div className="mb-4">{icon}</div>
        <CardTitle className="text-2xl text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-300 text-base">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
