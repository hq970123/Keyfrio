import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Sparkles,
  Film,
  Layers,
  Sliders,
  Volume2,
  Type,
  Maximize2,
  ArrowRight,
  FolderOpen,
  Plus,
  Tv,
  Smartphone,
  Clapperboard,
  Shield,
  Zap,
  Cpu,
  Monitor,
  Download,
  CheckCircle2,
  Star,
  Flame,
  Palette,
  Eye,
  RotateCcw,
  Sparkle,
  ChevronRight,
  Keyboard,
  Globe,
  Radio,
  FileVideo,
  Activity,
  Diamond,
} from 'lucide-react';
import { AppLogo } from '../common/AppLogo';
import { AspectRatio } from '../../types/editor';

// Template assets
import lvxingImg from '../../assets/templates/lvxing.png';
import duanshipinImg from '../../assets/templates/duanshipin.png';
import bokeImg from '../../assets/templates/boke.png';
import yugaopianImg from '../../assets/templates/yugaopian.png';

interface TemplateCard {
  id: string;
  title: string;
  tag: string;
  desc: string;
  aspect: AspectRatio;
  fps: number;
  width: number;
  height: number;
  bgImage: string;
  badgeColor: string;
}

const TEMPLATES_LIST: TemplateCard[] = [
  {
    id: 'travel-vlog',
    title: '4K 电影感旅拍 Vlog',
    tag: '热度推荐',
    desc: '16:9 画幅 • 24fps 胶片调色 • 预设多轨音画分离与转场',
    aspect: '16:9',
    fps: 24,
    width: 3840,
    height: 2160,
    bgImage: lvxingImg,
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  {
    id: 'tiktok-viral',
    title: '竖屏短视频爆款模版',
    tag: '爆款模板',
    desc: '9:16 竖屏 • 60fps 高帧率 • 适配抖音/TikTok 节奏卡点',
    aspect: '9:16',
    fps: 60,
    width: 1080,
    height: 1920,
    bgImage: duanshipinImg,
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  },
  {
    id: 'podcast-sub',
    title: '知识博主与访谈字幕',
    tag: '口播干货',
    desc: '16:9 画幅 • 30fps • 智能标题、高对比度双语字幕轨',
    aspect: '16:9',
    fps: 30,
    width: 1920,
    height: 1080,
    bgImage: bokeImg,
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  {
    id: 'epic-trailer',
    title: '21:9 史诗级宽屏预告',
    tag: '院线质感',
    desc: '21:9 宽荧幕 • 24fps 电影质感 • 动态重低音效与冲击滤镜',
    aspect: '21:9',
    fps: 24,
    width: 2560,
    height: 1080,
    bgImage: yugaopianImg,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
];

export const LandingPage: React.FC = () => {
  const openHome = () => window.location.assign('/projects');
  const openEditor = () => window.location.assign('/editor');

  // Interactive Hero Preview State
  const [isPlayingDemo, setIsPlayingDemo] = useState(true);
  const [activeAspect, setActiveAspect] = useState<AspectRatio>('16:9');
  const [activeGpuShader, setActiveGpuShader] = useState<'particles' | 'cyber' | 'film' | 'clean'>('particles');
  const [activeFeatureTab, setActiveFeatureTab] = useState<'timeline' | 'color' | 'lottie' | 'audio'>('timeline');

  // Simulated live playback playhead progress
  const [demoProgress, setDemoProgress] = useState(35);

  useEffect(() => {
    if (!isPlayingDemo) return;
    const timer = setInterval(() => {
      setDemoProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 200);
    return () => clearInterval(timer);
  }, [isPlayingDemo]);

  // Handle direct template start
  const handleUseTemplate = (template: TemplateCard) => {
    const params = new URLSearchParams({ template: JSON.stringify(template) });
    window.location.assign(`/editor?${params.toString()}`);
  };

  const handleStartCreating = () => {
    openHome();
  };

  const handleQuickDemoLaunch = () => {
    window.location.assign('/editor?demo=1');
  };

  return (
    <div className="min-h-screen bg-[#070912] text-neutral-100 font-sans selection:bg-blue-500 selection:text-white relative overflow-x-hidden">
      {/* Background Decorative Gradients & Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-cyan-500/12 via-indigo-600/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-[40%] -left-[10%] w-[600px] h-[600px] bg-cyan-600/[0.07] blur-[140px] rounded-full" />
        <div className="absolute top-[60%] -right-[10%] w-[600px] h-[600px] bg-violet-600/[0.07] blur-[140px] rounded-full" />
        {/* Subtle grid mesh */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* 1. Official Header / Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#070912]/75 border-b border-white/[0.07] transition-all">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 h-[72px] flex items-center justify-between">
          {/* Brand Logo & Slogan */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <AppLogo className="w-8 h-8 group-hover:scale-105 transition-transform" />
              <div className="flex flex-col text-left">
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  Keyfrio
                  <span className="text-[9px] font-bold bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-sky-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full font-mono">
                    2.0
                  </span>
                </span>
                <span className="text-[10px] text-neutral-400 font-medium hidden sm:inline -mt-0.5">
                  Edit every moment. Shape every story.
                </span>
              </div>
            </button>
          </div>

          {/* Center Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs text-neutral-300 font-medium">
            <a href="#features" className="hover:text-white transition-colors">
              核心特性
            </a>
            <a href="#ai-suite" className="hover:text-white transition-colors">
              AI 创意套件
            </a>
            <a href="#templates" className="hover:text-white transition-colors">
              场景模板
            </a>
            <a href="#tech" className="hover:text-white transition-colors">
              技术架构
            </a>
            <a href="#creator-stories" className="hover:text-white transition-colors">
              创作者生态
            </a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={openHome}
              className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-[#14161f] hover:bg-[#1e202c] border border-[#242735] px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium"
            >
              <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>工程项目库</span>
            </button>

            <button
              onClick={handleStartCreating}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 px-4 py-2 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all cursor-pointer transform active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>立即创作</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative z-10 pt-14 pb-12 lg:pt-20 lg:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Top Floating Badge */}
        <div className="inline-flex items-center gap-2 bg-white/[0.035] border border-white/[0.09] px-3.5 py-1.5 rounded-full text-xs text-neutral-300 mb-7 backdrop-blur-md shadow-lg shadow-black/20 animate-in fade-in slide-in-from-top-4 duration-500">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-300 opacity-50"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-300"></span>
          </span>
          <span className="font-semibold text-white">为浏览器打造的视频剪辑工作台</span>
          <span className="text-neutral-500">•</span>
          <span className="text-teal-200 font-medium">Edit every moment. Shape every story.</span>
        </div>

        {/* Main Hero Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-[76px] font-black tracking-[-0.045em] leading-[1.08] max-w-5xl">
          <span className="text-white">让剪辑回归创作</span>
          <br />
          <span className="bg-gradient-to-r from-teal-200 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
            把灵感，剪成你的故事
          </span>
        </h1>

        {/* Slogan & Description */}
        <p className="mt-6 text-base sm:text-lg text-neutral-400 max-w-2xl leading-8">
          <strong className="text-teal-200 font-semibold">Keyfrio</strong> 将视频、音频与文字放进一条清晰的多轨时间线，
          在浏览器里完成剪辑、动效、调色与导出。
        </p>

        {/* Hero CTA Buttons */}
        <div className="mt-9 flex w-full flex-col sm:w-auto sm:flex-row flex-wrap items-center justify-center gap-3">
          <button
            id="hero-start-creating-btn"
            onClick={handleStartCreating}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-[#071111] bg-gradient-to-r from-teal-200 to-cyan-300 hover:brightness-105 shadow-[0_8px_30px_rgba(45,212,191,0.18)] transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-base tracking-wide">立即创作</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleQuickDemoLaunch}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm text-neutral-200 hover:text-white bg-white/[0.035] hover:bg-white/[0.07] border border-white/[0.09] hover:border-white/20 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <span>试玩演示工程 (Live Demo)</span>
          </button>

          <button
            onClick={openHome}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm text-neutral-400 hover:text-white bg-transparent hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] transition-all cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <span>进入工程库</span>
          </button>
        </div>

        {/* Feature Highlights Pills */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>零等待浏览器即开即用</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-sky-400" />
            <span>100% 本地隐私安全处理</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>WebCodecs 4K 60FPS 极速渲染</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkle className="w-4 h-4 text-purple-400" />
            <span>Gemini AI 智能分镜与字幕</span>
          </div>
        </div>

        {/* 3. Interactive Hero Studio Mockup */}
        <div className="mt-14 w-full max-w-5xl rounded-2xl border border-white/[0.11] bg-[#0d1119]/95 p-3 sm:p-4 shadow-[0_30px_100px_rgba(0,0,0,0.58)] backdrop-blur-2xl relative group ring-1 ring-white/[0.025]">
          {/* Top Mock Window Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1f2230] text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-[11px] font-mono text-neutral-400 ml-2">
                Keyfrio Pro Studio • [4K Cinema Timeline]
              </span>
            </div>

            {/* Interactive Aspect Switcher & Shader Selector */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center bg-[#171924] p-0.5 rounded-lg border border-[#262a3c] text-[10px]">
                {(['16:9', '9:16', '21:9'] as AspectRatio[]).map((aspect) => (
                  <button
                    key={aspect}
                    onClick={() => setActiveAspect(aspect)}
                    className={`px-2 py-0.5 rounded font-mono transition-colors ${
                      activeAspect === aspect
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {aspect}
                  </button>
                ))}
              </div>

              <button
                onClick={handleStartCreating}
                className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-[10px] px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-2.5 h-2.5" />
                <span>进入全屏剪辑</span>
              </button>
            </div>
          </div>

          {/* Main Mockup Screen (Player + Tools + Timeline Preview) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-3">
            {/* Left Mock Track Layers */}
            <div className="hidden lg:flex lg:col-span-3 flex-col gap-2 bg-[#0a0b10] p-2.5 rounded-xl border border-[#1d202c] text-left text-xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-300 pb-1 border-b border-[#1c1f2b]">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-sky-400" />
                  <span>分轨图层 (Tracks)</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">4 Tracks</span>
              </div>

              <div className="flex flex-col gap-1.5 text-[10px]">
                <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-800/40 text-blue-200 flex items-center justify-between">
                  <span className="font-semibold">V1 4K 电影主画面</span>
                  <span className="text-[9px] text-sky-400">00:00:12:00</span>
                </div>
                <div className="p-2 rounded-lg bg-pink-950/40 border border-pink-800/40 text-pink-200 flex items-center justify-between">
                  <span className="font-semibold">T1 动态字幕 & 动效</span>
                  <span className="text-[9px] text-pink-400">Lottie 矢量</span>
                </div>
                <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 flex items-center justify-between">
                  <span className="font-semibold">FX1 GPU 粒子着色器</span>
                  <span className="text-[9px] text-cyan-400">WebGL 2.0</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-200 flex items-center justify-between">
                  <span className="font-semibold">A1 电影原声 BGM</span>
                  <span className="text-[9px] text-emerald-400">波形可视化</span>
                </div>
              </div>

              {/* Quick interactive shader filter buttons */}
              <div className="mt-auto pt-2 border-t border-[#1c1f2b] flex flex-col gap-1">
                <span className="text-[10px] text-neutral-400 font-semibold">实时着色器特效切换:</span>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <button
                    onClick={() => setActiveGpuShader('particles')}
                    className={`py-1 px-1.5 rounded transition-colors ${
                      activeGpuShader === 'particles'
                        ? 'bg-cyan-600 text-white font-medium'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    ✨ 金色微尘
                  </button>
                  <button
                    onClick={() => setActiveGpuShader('cyber')}
                    className={`py-1 px-1.5 rounded transition-colors ${
                      activeGpuShader === 'cyber'
                        ? 'bg-purple-600 text-white font-medium'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    ⚡ 赛博霓虹
                  </button>
                  <button
                    onClick={() => setActiveGpuShader('film')}
                    className={`py-1 px-1.5 rounded transition-colors ${
                      activeGpuShader === 'film'
                        ? 'bg-amber-600 text-white font-medium'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    🎬 胶片颗粒
                  </button>
                  <button
                    onClick={() => setActiveGpuShader('clean')}
                    className={`py-1 px-1.5 rounded transition-colors ${
                      activeGpuShader === 'clean'
                        ? 'bg-blue-600 text-white font-medium'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    🌫️ 纯净原生
                  </button>
                </div>
              </div>
            </div>

            {/* Center & Right Preview Canvas + Timeline Simulation */}
            <div className="lg:col-span-9 flex flex-col gap-2.5">
              {/* Preview Stage */}
              <div
                className={`w-full bg-[#050608] rounded-xl border border-[#1f2230] relative overflow-hidden flex items-center justify-center transition-all ${
                  activeAspect === '9:16' ? 'h-64 sm:h-80 max-w-[220px] mx-auto' : activeAspect === '21:9' ? 'h-52 sm:h-64' : 'h-56 sm:h-72'
                }`}
              >
                {/* Background Image / Video Simulation */}
                <img
                  src={lvxingImg}
                  alt="Keyfrio Preview"
                  className="absolute inset-0 w-full h-full object-cover opacity-85 transition-transform duration-700"
                  style={{
                    filter:
                      activeGpuShader === 'film'
                        ? 'sepia(0.3) contrast(1.2)'
                        : activeGpuShader === 'cyber'
                        ? 'hue-rotate(45deg) saturate(1.4)'
                        : 'none',
                  }}
                />

                {/* Simulated GPU Particle Overlay */}
                {activeGpuShader === 'particles' && (
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent mix-blend-screen animate-pulse" />
                )}
                {activeGpuShader === 'cyber' && (
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-cyan-500/20 via-transparent to-pink-500/20 mix-blend-overlay" />
                )}

                {/* Simulated Floating Title */}
                <div className="absolute bottom-6 left-6 right-6 text-left pointer-events-none">
                  <span className="text-[10px] font-mono uppercase bg-black/60 backdrop-blur-md text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                    Keyfrio 4K Cinema
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] mt-1 tracking-tight">
                    Edit every moment. Shape every story.
                  </h3>
                </div>

                {/* Play/Pause center overlay button */}
                <button
                  onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                  className="absolute z-20 w-12 h-12 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.6)] backdrop-blur-md transition-transform hover:scale-110 cursor-pointer"
                >
                  {isPlayingDemo ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>
              </div>

              {/* Simulated Mini Timeline Container */}
              <div className="bg-[#0b0c12] p-2.5 rounded-xl border border-[#1f2230] flex flex-col gap-1.5">
                {/* Scrubber & Timecode Bar */}
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span className="text-sky-400 font-bold">00:00:08:14</span>
                    <span>/</span>
                    <span>00:00:24:00</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Activity className="w-3 h-3" />
                    <span>60.0 FPS • WebGPU Turbo</span>
                  </div>
                </div>

                {/* Timeline Progress Bar with Active Playhead */}
                <div className="relative w-full h-8 bg-[#141620] rounded-lg border border-[#232738] overflow-hidden flex items-center px-1">
                  {/* Waveform Bars Simulation */}
                  <div className="absolute inset-0 flex items-center justify-between px-2 opacity-30 pointer-events-none">
                    {Array.from({ length: 48 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-blue-400 rounded-full"
                        style={{ height: `${20 + ((i * 17) % 70)}%` }}
                      />
                    ))}
                  </div>

                  {/* Played Track Fill */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-blue-500/20 border-r-2 border-blue-400 transition-all duration-75"
                    style={{ width: `${demoProgress}%` }}
                  />

                  {/* Playhead Marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 shadow-[0_0_8px_#facc15] z-10"
                    style={{ left: `${demoProgress}%` }}
                  >
                    <div className="w-2.5 h-2.5 bg-yellow-400 rotate-45 -ml-1 -mt-0.5 rounded-xs" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Stats & Hardware Metric Strip */}
      <section className="border-y border-white/[0.07] bg-white/[0.018] py-9 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col md:border-r md:border-white/[0.08]">
            <span className="text-2xl sm:text-3xl font-bold text-teal-200 tracking-tight">多轨编辑</span>
            <span className="text-xs text-neutral-500 font-medium mt-2">视频、音频与文字同屏编排</span>
          </div>
          <div className="flex flex-col md:border-r md:border-white/[0.08]">
            <span className="text-2xl sm:text-3xl font-bold text-cyan-200 tracking-tight">帧级控制</span>
            <span className="text-xs text-neutral-500 font-medium mt-2">精准调整片段与播放位置</span>
          </div>
          <div className="flex flex-col md:border-r md:border-white/[0.08]">
            <span className="text-2xl sm:text-3xl font-bold text-indigo-200 tracking-tight">灵活创作</span>
            <span className="text-xs text-neutral-500 font-medium mt-2">字幕、动效、滤镜与音频工具</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-bold text-violet-200 tracking-tight">项目可续</span>
            <span className="text-xs text-neutral-500 font-medium mt-2">保存工程，随时继续编辑</span>
          </div>
        </div>
      </section>

      {/* 5. Core Feature Matrix (核心特性矩阵) */}
      <section id="features" className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-sky-400 font-mono text-xs uppercase tracking-wider font-semibold bg-sky-400/10 px-3 py-1 rounded-full border border-blue-500/20 mb-3">
            <Cpu className="w-3.5 h-3.5" />
            <span>Power & Precision</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            专为专业创作而生的全套工业级剪辑系统
          </h2>
          <p className="mt-4 text-neutral-400 text-sm sm:text-base leading-relaxed">
            从帧级多轨微调到 WebGL 着色器粒子渲染，Keyfrio 将桌面级 NLE 非线性剪辑能力完全带入现代 Web 浏览器。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Multi-track Timeline */}
          <div className="bg-gradient-to-b from-white/[0.045] to-white/[0.015] border border-white/[0.08] hover:border-teal-300/30 p-6 rounded-2xl transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.25)] flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-sky-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">多轨非线性自由时间线</h3>
            <p className="text-xs text-neutral-400 leading-relaxed mb-4 flex-1">
              无限音频、视频、文字、特效分轨堆叠。支持毫秒级磁性对齐、音视频自动分离绑定、无缝吸附与双声道真实波形可视化。
            </p>
            <div className="flex items-center text-xs font-semibold text-sky-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>查看多轨特性</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: GPU Shaders */}
          <div className="bg-gradient-to-b from-white/[0.045] to-white/[0.015] border border-white/[0.08] hover:border-cyan-300/30 p-6 rounded-2xl transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.25)] flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">WebGL / PixiJS GPU 粒子引擎</h3>
            <p className="text-xs text-neutral-400 leading-relaxed mb-4 flex-1">
              内置赛博霓虹、水波涟漪、金色微尘、冲击波、RGB 分离、雪花与流星着色器。硬件加速实时合成，即刻预览无掉帧。
            </p>
            <div className="flex items-center text-xs font-semibold text-cyan-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>探索着色器特效</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3: Color Grading & CDL */}
          <div className="bg-gradient-to-b from-white/[0.045] to-white/[0.015] border border-white/[0.08] hover:border-amber-300/30 p-6 rounded-2xl transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.25)] flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Palette className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">ASC-CDL 电影级调色与三段色轮</h3>
            <p className="text-xs text-neutral-400 leading-relaxed mb-4 flex-1">
              暗部 Lift、中间调 Gamma、高光 Gain 专业二维色轮。包含青橙调色、90s 复古胶片、落日金辉与黑白纪实 1-Click 调色预设。
            </p>
            <div className="flex items-center text-xs font-semibold text-amber-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>了解专业校色</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 4: Lottie & Typography */}
          <div className="bg-gradient-to-b from-white/[0.045] to-white/[0.015] border border-white/[0.08] hover:border-violet-300/30 p-6 rounded-2xl transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.25)] flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Type className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Lottie 矢量动效与艺术字幕</h3>
            <p className="text-xs text-neutral-400 leading-relaxed mb-4 flex-1">
              广播级下三分之一字幕条、爆款综艺艺术字预设、打字机逐字出场、弹性弹跳动效与丰富动态表情贴纸库。
            </p>
            <div className="flex items-center text-xs font-semibold text-purple-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>浏览动效库</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 5: Audio EQ & Compressor */}
          <div className="bg-gradient-to-b from-white/[0.045] to-white/[0.015] border border-white/[0.08] hover:border-emerald-300/30 p-6 rounded-2xl transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.25)] flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Volume2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">3-Band 参数均衡与动态压缩混音</h3>
            <p className="text-xs text-neutral-400 leading-relaxed mb-4 flex-1">
              实时立体声 dBFS 峰值电平表，低频/中频/高频增益调节，人声清亮、低音增强预设与专业人声动态压缩器。
            </p>
            <div className="flex items-center text-xs font-semibold text-emerald-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>探索混音引擎</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 6: AI Copilot & Fast Export */}
          <div className="bg-gradient-to-b from-white/[0.045] to-white/[0.015] border border-white/[0.08] hover:border-pink-300/30 p-6 rounded-2xl transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.25)] flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-pink-600/20 border border-pink-500/30 text-pink-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Sparkle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI 智能副驾与无损快速导出</h3>
            <p className="text-xs text-neutral-400 leading-relaxed mb-4 flex-1">
              Gemini 驱动的剧本脚本编写、分镜构思与双语字幕生成。支持 4K/2K/1080P WebM & MP4 极速导出与 IndexedDB 本地持久存储。
            </p>
            <div className="flex items-center text-xs font-semibold text-pink-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>查看智能导出</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* 6. Scenario Templates Showcase (热门爆款场景模板库) */}
      <section id="templates" className="py-20 bg-gradient-to-b from-white/[0.018] to-transparent border-y border-white/[0.06] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center gap-1.5 text-amber-400 font-mono text-xs uppercase tracking-wider font-semibold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mb-3">
                <Flame className="w-3.5 h-3.5" />
                <span>Ready-To-Use Presets</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                全场景高水准模板，一键启动成片
              </h2>
              <p className="mt-3 text-neutral-400 text-sm max-w-xl">
                无论横屏 4K 电影质感 Vlog、抖音快手竖屏短视频，还是知识访谈口播，一键即可载入专业分轨预设。
              </p>
            </div>

            <button
              onClick={handleStartCreating}
              className="mt-4 md:mt-0 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-blue-300 hover:underline cursor-pointer"
            >
              <span>进入工程库浏览全部模板</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Template Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TEMPLATES_LIST.map((template) => (
              <div
                key={template.id}
                className="group bg-[#11151d] border border-white/[0.08] hover:border-teal-200/30 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.4)] flex-1"
              >
                {/* Cover Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-neutral-900">
                  <img
                    src={template.bgImage}
                    alt={template.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12141d] via-transparent to-transparent opacity-80" />

                  {/* Top Tag Badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md ${template.badgeColor}`}>
                      {template.tag}
                    </span>
                  </div>

                  {/* Aspect Ratio Badge */}
                  <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-300">
                    {template.aspect}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex flex-col flex-1">
                  <h4 className="font-bold text-sm text-white group-hover:text-sky-400 transition-colors">
                    {template.title}
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed line-clamp-2 flex-1">
                    {template.desc}
                  </p>

                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="mt-4 w-full py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 hover:border-blue-500 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>立即应用模板</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. AI Creative Suite (AI 创作能力展示) */}
      <section id="ai-suite" className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-gradient-to-br from-[#121422] via-[#0f111a] to-[#141224] border border-[#2b2f48] rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 flex flex-col text-left">
              <div className="inline-flex items-center gap-1.5 text-purple-400 font-mono text-xs uppercase tracking-wider font-semibold bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 w-fit mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen AI Video Engine</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                AI 创意副驾驶：从灵感构思到自动上轨
              </h2>

              <p className="mt-4 text-neutral-300 text-sm leading-relaxed">
                深度集成 Google Gemini 多模态智能模型，为创作者提供全流程的智能剪辑赋能。无论是撰写爆款脚本、智能分镜建议、文生语音还是双语字幕对齐，只需一句话指令。
              </p>

              <div className="mt-6 flex flex-col gap-3 text-xs text-neutral-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                    1
                  </div>
                  <span><strong>剧本脚本生成</strong>：输入故事主题，秒级输出专业分镜剧本与旁白。</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                    2
                  </div>
                  <span><strong>自然语言剪辑指令</strong>：如「在第 5 秒添加赛博霓虹滤镜并将音量淡出」。</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                    3
                  </div>
                  <span><strong>AI 智能字幕与翻译</strong>：自动识别音轨，一键生成艺术花字与双语对照字幕。</span>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={handleStartCreating}
                  className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>体验 AI 剪辑助理</span>
                </button>
              </div>
            </div>

            {/* AI Mock Chat Dialog */}
            <div className="lg:col-span-6 bg-[#0a0b12] border border-[#2b3550] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#1c1f2f]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-white font-bold text-xs">Keyfrio AI Copilot</span>
                </div>
                <span className="text-[10px] text-neutral-500">Gemini 2.5 Active</span>
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                {/* User message */}
                <div className="self-end bg-blue-600/30 border border-sky-400/35 text-blue-200 p-2.5 rounded-xl rounded-tr-none max-w-[85%]">
                  帮我给这段 4K 旅拍视频设计一个震撼的开场转场，并加上复古胶片调色与清脆低音增强。
                </div>

                {/* AI response */}
                <div className="self-start bg-[#171c2a] border border-[#33405e] text-neutral-200 p-3 rounded-xl rounded-tl-none max-w-[90%] flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-purple-300 font-semibold text-[11px]">
                    <Sparkles className="w-3 h-3" />
                    <span>已为你自动规划并执行 3 项专业调教：</span>
                  </div>
                  <ul className="text-[10px] text-neutral-300 flex flex-col gap-1 list-disc pl-4">
                    <li>在 00:00:00 处添加「变焦推近 (Zoom In)」转场 (时长 0.6s)</li>
                    <li>应用「复古胶片 Vintage 90s」ASC-CDL 调色预设</li>
                    <li>开启 3-Band 均衡器低音增强 (Low Gain +6dB)</li>
                  </ul>
                  <div className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded">
                    ✓ 时间线已实时更新生效，可点击播放预览
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Modern Web Architecture (架构与安全性) */}
      <section id="tech" className="py-20 bg-[#090c14] border-t border-[#1d2432] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-emerald-400 font-mono text-xs uppercase tracking-wider font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-3">
              <Shield className="w-3.5 h-3.5" />
              <span>Modern Web Standard</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              突破浏览器极限的下一代硬核架构
            </h2>
            <p className="mt-3 text-neutral-400 text-sm">
              告别上传等待与云端泄露风险，所有渲染与音频合成均在本地浏览器高速完成。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111621] border border-[#252e40] p-6 rounded-2xl flex flex-col">
              <div className="text-emerald-400 mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">100% 本地计算与隐私隔离</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                视频素材仅保留在您的设备本地（IndexedDB / OPFS 原生文件系统），不需要上传至任何外部服务器，保护绝对创作隐私。
              </p>
            </div>

            <div className="bg-[#111621] border border-[#252e40] p-6 rounded-2xl flex flex-col">
              <div className="text-sky-400 mb-4">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">WebCodecs 硬件解编码加速</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                直接调用 GPU 硬件编解码器，实现 4K 60FPS 逐帧流式解码、无损抽帧生成胶片预览条，拖拽播放毫无卡顿。
              </p>
            </div>

            <div className="bg-[#111621] border border-[#252e40] p-6 rounded-2xl flex flex-col">
              <div className="text-purple-400 mb-4">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">随时随地，跨端即开即剪</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                跨越 Windows、macOS 与 Linux，只需打开 Chrome / Edge 即可获得一致的专业 NLE 剪辑体验。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Creator Testimonials (创作者生态) */}
      <section id="creator-stories" className="py-20 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 text-sky-400 font-mono text-xs uppercase tracking-wider font-semibold bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20 mb-3">
            <Star className="w-3.5 h-3.5" />
            <span>Loved By Creators</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            全球创作者选择 Keyfrio 的理由
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#131824] border border-[#252d40] p-5 rounded-2xl flex flex-col justify-between">
            <p className="text-xs text-neutral-300 leading-relaxed italic">
              “无需下载几十个 G 的传统剪辑软件，在咖啡馆打开浏览器就能直接剪 4K Vlog。调色色轮和 GPU 粒子特效出片质感太惊艳了！”
            </p>
            <div className="mt-5 flex items-center gap-3 pt-4 border-t border-[#1c1f2b]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 flex items-center justify-center font-bold text-white text-xs">
                L
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Leo Zhang</h4>
                <p className="text-[10px] text-neutral-400">独立旅拍导演 • 20万关注</p>
              </div>
            </div>
          </div>

          <div className="bg-[#131824] border border-[#252d40] p-5 rounded-2xl flex flex-col justify-between">
            <p className="text-xs text-neutral-300 leading-relaxed italic">
              “爆款短视频模板和 Lottie 艺术花字直接帮我们团队将短视频出片效率提升了 3 倍以上。音频 3-Band 均衡器人声特别干净。”
            </p>
            <div className="mt-5 flex items-center gap-3 pt-4 border-t border-[#1c1f2b]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xs">
                S
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Sarah Meng</h4>
                <p className="text-[10px] text-neutral-400">新媒体 MCN 视频负责人</p>
              </div>
            </div>
          </div>

          <div className="bg-[#131824] border border-[#252d40] p-5 rounded-2xl flex flex-col justify-between">
            <p className="text-xs text-neutral-300 leading-relaxed italic">
              “100% 浏览器本地计算与 IndexedDB 存储，让我们处理企业保密视频内容时完全没有任何合规顾虑，安全且极致丝滑。”
            </p>
            <div className="mt-5 flex items-center gap-3 pt-4 border-t border-[#1c1f2b]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-emerald-500 flex items-center justify-center font-bold text-white text-xs">
                K
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Kevin Chen</h4>
                <p className="text-[10px] text-neutral-400">科技访谈节目制片人</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Grand Bottom Call-To-Action Banner */}
      <section className="py-20 relative z-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-[#102323] via-[#11192a] to-[#17152a] border border-teal-100/15 rounded-[28px] p-8 sm:p-14 text-center relative overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-300/10 via-transparent to-transparent pointer-events-none" />

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight relative z-10">
            准备好讲述你的精彩故事了吗？
          </h2>

          <p className="mt-4 text-base sm:text-lg text-blue-200 max-w-2xl mx-auto relative z-10">
            <strong>Keyfrio</strong> — Edit every moment. Shape every story.
            <br />
            点击下方按钮，即刻开启全功能专业创作之旅。
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 relative z-10">
            <button
              onClick={handleStartCreating}
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-[#071111] bg-teal-200 hover:bg-teal-100 shadow-[0_8px_30px_rgba(45,212,191,0.2)] transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>立即创作 (Start Creating)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={openHome}
              className="flex items-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm text-neutral-200 hover:text-white bg-[#171c2a] hover:bg-[#1f2236] border border-[#2b3046] transition-all cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-indigo-400" />
              <span>浏览我的工程库</span>
            </button>
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <footer className="border-t border-white/[0.07] bg-[#070910] py-12 text-neutral-400 text-xs relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <AppLogo className="w-7 h-7" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-white text-sm">Keyfrio Studio</span>
              <span className="text-[10px] text-neutral-500">Edit every moment. Shape every story.</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-neutral-400">
            <button
              onClick={openHome}
              className="hover:text-white transition-colors cursor-pointer"
            >
              工程项目管理
            </button>
            <button
              onClick={openEditor}
              className="hover:text-white transition-colors cursor-pointer"
            >
              多轨剪辑工作台
            </button>
            <button
              onClick={() => window.location.assign('/editor?shortcuts=1')}
              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>快捷键指南</span>
            </button>
          </div>

          <div className="text-neutral-500 text-[11px] font-mono">
            © 2026 Keyfrio Video Editor. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
