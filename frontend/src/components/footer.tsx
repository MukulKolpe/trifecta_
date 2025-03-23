// @ts-nocheck comment
import Link from "next/link";
import { Github, Link2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-blue-900/30 py-10">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-center items-center gap-6">
          <div className="flex items-center">
            <span className="text-gray-300 text-lg">
              Built with{" "}
              <span className="text-blue-500 animate-pulse text-xl">💙</span> by
              team localhost at ETHGlobal Trifecta Hackathon
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="rounded-full bg-blue-500/10 hover:bg-blue-500/20 h-12 w-12"
          >
            <Link
              href="https://github.com/SarveshLimaye/trifecta"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <Github className="h-6 w-6 fill-current text-blue-400" />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            className="rounded-full bg-blue-500/10 hover:bg-blue-500/20 h-12 w-12"
          >
            <Link
              href="https://ethglobal.com/showcase/dutchcross-0cfhz"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Website"
            >
              <Link2Icon className="h-6 w-6 fill-current text-blue-400" />
            </Link>
          </Button>
        </div>
      </div>
    </footer>
  );
}
