// @ts-nocheck comment
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [isMobile, isOpen]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300",
        scrolled ? "bg-slate-900/90 backdrop-blur-md py-4 shadow-lg" : "py-6"
      )}
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 bg-blue-500 rounded-full opacity-70 animate-pulse"></div>
            <div className="absolute inset-1 bg-slate-900 rounded-full flex items-center justify-center">
              <span className="text-blue-400 font-bold text-lg">t1</span>
            </div>
          </div>
          <span className="font-bold text-2xl text-white">DutchCross</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/deposit" className="font-bold text-xl text-white">
            Bridge
          </Link>
          <Link href="/auctions" className="font-bold text-xl text-white">
            Auctions
          </Link>
          <ConnectButton
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "full",
            }}
          />
        </nav>

        {/* Mobile Navigation Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
        </Button>
      </div>

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-slate-900/95 backdrop-blur-md shadow-lg p-6 border-t border-slate-800 animate-in slide-in-from-top">
          <nav className="flex flex-col gap-6">
            <NavLinks mobile onClick={() => setIsOpen(false)} />
            <ConnectButton
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
            />
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLinks({
  mobile = false,
  onClick,
}: {
  mobile?: boolean;
  onClick?: () => void;
}) {
  const links = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#docs", label: "Documentation" },
  ];

  return (
    <>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "text-gray-300 hover:text-white transition-colors text-lg font-medium",
            mobile && "py-3 px-4 hover:bg-slate-800 rounded-md w-full text-xl"
          )}
          onClick={onClick}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}
