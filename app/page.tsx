"use client";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";

export default function AIImageApp() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-blue-400 flex flex-col">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-purple-400" />
          <span className="text-2xl font-bold text-white">AI ImageGen</span>
        </div>

        <button
          onClick={() => router.push("/upload")}
          className="flex items-center gap-2 px-6 py-2 bg-blue-300 rounded-lg font-medium hover:bg-blue-500 transition-all hover:scale-105"
        >
          Get Started
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center text-center px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
            Create Stunning Images with AI
          </h1>
          <p className="text-lg md:text-xl text-purple-200 mb-10">
            Transform your imagination into visually captivating art.
            Describe your idea, and let AI bring it to life instantly.
          </p>
          <button
            onClick={() => router.push("/upload")}
            className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold text-lg hover:bg-purple-700 hover:scale-105 transition-all shadow-lg"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300" onClick={() => router.push("/upload")}>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4 mx-auto" onClick={() => router.push("/upload")}>
              <Zap className="w-6 h-6 text-white"  />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Lightning Fast
            </h3>
            <p className="text-purple-200">
              Generate high-quality images in seconds with powerful AI models.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300" onClick={() => router.push("/upload")}>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4 mx-auto" onClick={() => router.push("/upload")}>
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Limitless Creativity
            </h3>
            <p className="text-purple-200">
              From realistic portraits to fantasy art — create anything you imagine.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300" onClick={() => router.push("/upload")}>
            <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center mb-4 mx-auto" >
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Safe & Secure
            </h3>
            <p className="text-purple-200">
              Your images are private, securely stored, and only visible to you.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-purple-300 py-8 border-t border-white/10">
        © {new Date().getFullYear()} AI ImageGen. All rights reserved.
      </footer>
    </div>
  );
}
