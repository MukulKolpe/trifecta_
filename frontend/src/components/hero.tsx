// @ts-nocheck comment
"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;

    const nodes: Node[] = [];
    const numNodes = 5;
    const connections: Connection[] = [];

    // Create nodes
    for (let i = 0; i < numNodes; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 12 * window.devicePixelRatio, // Increased size
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        color: i === 0 ? "#3b82f6" : "#94a3b8",
      });
    }

    // Create connections
    for (let i = 0; i < numNodes; i++) {
      for (let j = i + 1; j < numNodes; j++) {
        connections.push({
          from: i,
          to: j,
          active: Math.random() > 0.5,
          progress: 0,
          speed: 0.005 + Math.random() * 0.01,
          lastActivation: 0,
        });
      }
    }

    let animationFrameId: number;
    let lastTime = 0;

    const animate = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw connections
      connections.forEach((connection) => {
        const fromNode = nodes[connection.from];
        const toNode = nodes[connection.to];

        // Randomly activate connections
        if (
          !connection.active &&
          time - connection.lastActivation > 3000 &&
          Math.random() < 0.01
        ) {
          connection.active = true;
          connection.progress = 0;
          connection.lastActivation = time;
        }

        // Update progress for active connections
        if (connection.active) {
          connection.progress += connection.speed;
          if (connection.progress >= 1) {
            connection.active = false;
            connection.progress = 0;
          }
        }

        // Draw connection line
        ctx.beginPath();
        ctx.strokeStyle = "#64748b66"; // More visible line color
        ctx.lineWidth = 2 * window.devicePixelRatio; // Thicker lines
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();

        // Draw active connection animation
        if (connection.active) {
          const startX =
            fromNode.x +
            (toNode.x - fromNode.x) * Math.max(0, connection.progress - 0.1);
          const startY =
            fromNode.y +
            (toNode.y - fromNode.y) * Math.max(0, connection.progress - 0.1);
          const endX =
            fromNode.x +
            (toNode.x - fromNode.x) * Math.min(1, connection.progress);
          const endY =
            fromNode.y +
            (toNode.y - fromNode.y) * Math.min(1, connection.progress);

          const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
          gradient.addColorStop(0, "#60a5fa"); // Brighter blue
          gradient.addColorStop(1, "#3b82f6");

          ctx.beginPath();
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 4 * window.devicePixelRatio; // Even thicker for active connections
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      });

      // Update and draw nodes
      nodes.forEach((node) => {
        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off walls
        if (node.x <= node.radius || node.x >= canvas.width - node.radius) {
          node.vx *= -1;
        }
        if (node.y <= node.radius || node.y >= canvas.height - node.radius) {
          node.vy *= -1;
        }

        // Draw node glow
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          node.radius * 2
        );
        gradient.addColorStop(0, node.color);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.arc(node.x, node.y, node.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw node
        ctx.beginPath();
        ctx.fillStyle = node.color;
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section className="relative pt-40 pb-24 md:pt-48 md:pb-32 overflow-hidden">
      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600 leading-tight">
              Unifying Cross-Chain Transfers with Real-Time Proving
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
              Seamlessly bridge tokens between L1 and t1 with our Dutch auction
              mechanism, powered by Trusted Execution Environments and Real-Time
              Proving technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                size="lg"
                className="gap-2 bg-blue-600 hover:bg-blue-500 text-white text-lg px-8 py-7 h-auto"
              >
                Get Started <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-blue-500 text-blue-400 hover:bg-blue-950 text-lg px-8 py-7 h-auto"
              >
                Read Documentation
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Technology highlights moved above the animation */}
        <div className="flex justify-center gap-10 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
              <Shield className="h-8 w-8 text-blue-400" />
            </div>
            <span className="text-lg font-medium text-gray-200">
              Secure TEE
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
              <Zap className="h-8 w-8 text-blue-400" />
            </div>
            <span className="text-lg font-medium text-gray-200">
              Real-Time Proving
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mx-auto max-w-5xl aspect-video rounded-xl overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.3)] border border-blue-500/30"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          ></canvas>
        </motion.div>
      </div>
    </section>
  );
}

interface Node {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
}

interface Connection {
  from: number;
  to: number;
  active: boolean;
  progress: number;
  speed: number;
  lastActivation: number;
}
