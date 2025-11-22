
import React, { useState, useMemo } from 'react';
import { AreaChart, Area, YAxis, XAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';
import { CurrencyPairData, SignalType, Timeframe } from '../types';
import { Minus, Sparkles, ArrowRight, ArrowUpCircle, ArrowDownCircle, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw, Send } from 'lucide-react';
import { analyzeMarketWithGemini } from '../services/geminiService';
import { sendSignalToTelegram } from '../services/telegramService';

interface SignalCardProps {
  data: CurrencyPairData;
  timeframe: Timeframe;
}

const SignalCard: React.FC<SignalCardProps> = ({ data, timeframe }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [showTrendOverlay, setShowTrendOverlay] = useState(false);
  const [isAnalyzingTrend, setIsAnalyzingTrend] = useState(false);

  // Zoom and Pan State
  // viewSize: Number of data points to show at once
  const [viewSize, setViewSize] = useState(20);
  // viewOffset: How many points back from the end we are (0 = live/latest)
  const [viewOffset, setViewOffset] = useState(0);

  // Derived visible data
  const visibleData = useMemo(() => {
    const totalPoints = data.history.length;
    // Calculate end index based on offset from the right
    const endIndex = totalPoints - viewOffset;
    // Calculate start index based on zoom level (viewSize)
    const startIndex = Math.max(0, endIndex - viewSize);
    
    return data.history.slice(startIndex, endIndex);
  }, [data.history, viewSize, viewOffset]);

  // Handlers for Controls
  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewSize(prev => Math.max(5, prev - 5));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewSize(prev => Math.min(data.history.length, prev + 5));
  };

  const handlePanLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewOffset(prev => Math.min(data.history.length - viewSize, prev + 5));
  };

  const handlePanRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewOffset(prev => Math.max(0, prev - 5));
  };

  const handleResetView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewOffset(0);
    setViewSize(20);
  };

  const handleAIAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    setIsLoadingAI(true);
    setAiAnalysis(null);
    const analysis = await analyzeMarketWithGemini(data, timeframe);
    setAiAnalysis(analysis);
    setIsLoadingAI(false);
  };

  const handleTelegramSend = async (e: React.MouseEvent) => {
      e.stopPropagation();
      const chatId = localStorage.getItem('telegram_chat_id');
      
      if (!chatId) {
          alert("Erreur: Veuillez configurer votre ID Telegram en cliquant sur l'icône 'Avion' en haut à droite de l'écran.");
          return;
      }

      setIsSendingTelegram(true);
      const success = await sendSignalToTelegram(chatId, data, timeframe, aiAnalysis);
      setIsSendingTelegram(false);
      
      if (success) {
          // Visual feedback could be added here
      }
  };

  const handleCardClick = () => {
    if (!showTrendOverlay) {
      setShowTrendOverlay(true);
      setIsAnalyzingTrend(true);
      // Simulate calculation delay based on timeframe selection
      setTimeout(() => {
        setIsAnalyzingTrend(false);
      }, 800);
    }
  };

  const closeOverlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTrendOverlay(false);
    setAiAnalysis(null);
  };

  // Determine color for chart
  const isPositive = data.change >= 0;
  const chartColor = isPositive ? '#10b981' : '#f43f5e'; // Emerald or Rose

  // Trend logic for overlay
  const isBullish = data.signal === SignalType.STRONG_BUY || data.signal === SignalType.BUY;
  const isBearish = data.signal === SignalType.STRONG_SELL || data.signal === SignalType.SELL;

  // Formatters
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };
  
  const isJpy = data.symbol.includes('JPY');
  // Dynamic decimal places based on symbol
  const formatPrice = (val: number) => val.toFixed(isJpy ? 2 : 5);
  const formatPriceAxis = (val: number) => val.toFixed(isJpy ? 2 : 4);

  // Custom Dot Component for the "Live" point
  const CustomLiveDot = (props: any) => {
    const { cx, cy, index, payload } = props;
    
    // Only render for the last point IF we are looking at the live edge (viewOffset === 0)
    const isLastVisiblePoint = index === visibleData.length - 1;
    const isActuallyLive = viewOffset === 0;

    if (isLastVisiblePoint && isActuallyLive) {
        return (
            <g>
                {/* Pulsing Halo Effect */}
                <circle cx={cx} cy={cy} r={6} fill={chartColor} opacity={0.4}>
                    <animate attributeName="r" from="6" to="20" dur="1.5s" begin="0s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" begin="0s" repeatCount="indefinite" />
                </circle>
                
                {/* Solid Dot */}
                <circle cx={cx} cy={cy} r={4} stroke="#fff" strokeWidth={2} fill={chartColor} />

                {/* Floating Label Box */}
                <g transform={`translate(${cx}, ${cy - 50})`}>
                    {/* Box Background */}
                    <rect 
                        x={-45} 
                        y={0} 
                        width={90} 
                        height={34} 
                        rx={4} 
                        fill="#0f172a" 
                        stroke={chartColor} 
                        strokeWidth={1} 
                        fillOpacity={0.95} 
                        className="drop-shadow-lg"
                    />
                    
                    {/* Price Text */}
                    <text x={0} y={14} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="bold" fontFamily="monospace" dominantBaseline="middle">
                        {formatPrice(payload.value)}
                    </text>
                    
                    {/* Time Text */}
                    <text x={0} y={26} textAnchor="middle" fill="#94a3b8" fontSize={9} dominantBaseline="middle">
                        {formatTime(payload.timestamp)}
                    </text>

                    {/* Connecting Triangle/Arrow */}
                    <path d="M -5 34 L 0 39 L 5 34 Z" fill={chartColor} />
                </g>
            </g>
        );
    }
    return null;
  };

  return (
    <div 
        onClick={handleCardClick}
        className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg hover:shadow-2xl hover:border-blue-500/30 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden cursor-pointer group h-[350px]"
    >
      {/* Trend Overlay */}
      {showTrendOverlay && (
        <div className="absolute inset-0 z-30 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 h-full">
            <button 
                onClick={closeOverlay}
                className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-40"
            >
                <X className="w-5 h-5" />
            </button>

            {isAnalyzingTrend ? (
                <div className="flex flex-col items-center gap-4 mt-8">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-blue-500/30 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm">Calcul du Signal...</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 w-full absolute inset-0 justify-center bg-slate-900 overflow-y-auto p-4">
                    <div className="bg-slate-800 px-3 py-0.5 rounded-full border border-slate-700 mb-1 mt-8">
                        <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Signal ({timeframe})</h3>
                    </div>
                    
                    {isBullish && (
                        <div className="animate-in zoom-in duration-300 flex flex-col items-center">
                            <ArrowUpCircle className="w-16 h-16 text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)] mb-1" />
                            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-emerald-400 tracking-tight">HAUSSE</span>
                            <div className="mt-1 px-3 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/30">
                                CALL
                            </div>
                        </div>
                    )}

                    {isBearish && (
                        <div className="animate-in zoom-in duration-300 flex flex-col items-center">
                            <ArrowDownCircle className="w-16 h-16 text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.4)] mb-1" />
                            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-rose-400 tracking-tight">BAISSE</span>
                            <div className="mt-1 px-3 py-0.5 bg-rose-500/20 text-rose-300 rounded-full text-xs font-bold border border-rose-500/30">
                                PUT
                            </div>
                        </div>
                    )}

                    {!isBullish && !isBearish && (
                        <div className="animate-in zoom-in duration-300 flex flex-col items-center">
                            <Minus className="w-16 h-16 text-slate-500 mb-1" />
                            <span className="text-2xl font-bold text-slate-400">NEUTRE</span>
                        </div>
                    )}

                    <div className="mt-4 w-full pb-4">
                        {/* Buttons Container */}
                        <div className="flex gap-2 w-full justify-between items-stretch mb-2">
                            {!aiAnalysis ? (
                                 <button 
                                    onClick={handleAIAnalyze}
                                    className="flex-grow flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg text-white text-xs font-bold transition-all shadow-lg"
                                 >
                                    <Sparkles className="w-3 h-3 text-yellow-300" />
                                    Analyse IA
                                 </button>
                            ) : (
                                <div className="flex-grow"></div> 
                            )}
                            
                            <button
                                onClick={handleTelegramSend}
                                disabled={isSendingTelegram}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#229ED9] hover:bg-[#1e8bc0] rounded-lg text-white text-xs font-bold transition-all shadow-lg"
                                title="Envoyer le signal au bot Telegram"
                            >
                                {isSendingTelegram ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Send className="w-3 h-3" />
                                )}
                            </button>
                        </div>

                        {isLoadingAI && (
                            <div className="flex items-center justify-center gap-2 text-xs text-blue-300 animate-pulse mt-2">
                                <Sparkles className="w-3 h-3" />
                                <span>Analyse...</span>
                            </div>
                        )}
                        {aiAnalysis && (
                            <div className="mt-2 bg-slate-800/90 p-3 rounded-lg text-left text-xs text-slate-300 border border-slate-600 shadow-inner leading-relaxed animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-1 mb-1 text-yellow-500 font-bold text-[10px] uppercase">
                                    <Sparkles className="w-3 h-3" />
                                    Gemini
                                </div>
                                {aiAnalysis}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Header (Symbol + Change + Price) */}
      <div className="flex justify-between items-start p-4 relative z-10 h-[80px]">
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border bg-slate-700/50 border-slate-600 shadow-md`}>
                <span className={`font-bold text-xs text-slate-200`}>
                    {data.symbol.substring(0, 3)}
                </span>
            </div>
            <div>
                <h3 className="font-bold text-white text-base leading-none shadow-black drop-shadow-sm">{data.symbol}</h3>
                <div className="flex items-center gap-1 mt-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-700/50 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                         {data.change > 0 ? '+' : ''}{data.change.toFixed(2)}%
                    </span>
                </div>
            </div>
        </div>
        
        {/* Visible Price Top Right */}
        <div className="flex flex-col items-end">
             <span className={`text-xl font-mono font-bold tracking-tight ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatPrice(data.currentPrice)}
             </span>
             <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Prix Actuel</span>
        </div>
      </div>

      {/* Chart Controls Toolbar */}
      <div className="absolute top-[80px] left-4 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex bg-slate-900/80 backdrop-blur rounded-lg border border-slate-700 p-1 shadow-sm">
            <button 
                onClick={handlePanLeft}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                title="Reculer (Pan Left)"
            >
                <ChevronLeft className="w-3 h-3" />
            </button>
            <button 
                onClick={handleResetView}
                className={`p-1 hover:bg-slate-700 rounded ${viewOffset === 0 ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
                title="Réinitialiser (Live)"
            >
                <RotateCcw className="w-3 h-3" />
            </button>
            <button 
                onClick={handlePanRight}
                disabled={viewOffset === 0}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                title="Avancer (Pan Right)"
            >
                <ChevronRight className="w-3 h-3" />
            </button>
            <div className="w-[1px] bg-slate-700 mx-1"></div>
            <button 
                onClick={handleZoomOut}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                title="Zoom Arrière"
            >
                <ZoomOut className="w-3 h-3" />
            </button>
            <button 
                onClick={handleZoomIn}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                title="Zoom Avant"
            >
                <ZoomIn className="w-3 h-3" />
            </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="absolute bottom-0 left-0 right-0 top-[70px] z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={visibleData} margin={{ top: 40, right: 5, left: 5, bottom: 0 }}>
            <defs>
              <linearGradient id={`color${data.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
            
            <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                tick={{ fill: '#64748b', fontSize: 9 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                minTickGap={30}
                height={20}
                dy={5}
            />
            
            {/* Y Axis showing variation */}
            <YAxis 
                domain={['dataMin', 'dataMax']} 
                orientation="right"
                tick={{ fill: '#64748b', fontSize: 9 }}
                tickFormatter={formatPriceAxis}
                tickLine={false}
                axisLine={false}
                width={45}
                interval="preserveStartEnd"
            />

            <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                formatter={(value: number) => [formatPrice(value), 'Prix']}
                labelFormatter={(label: number) => formatTime(label)}
                cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            <Area 
                type="monotone" 
                dataKey="value" 
                stroke={chartColor} 
                fillOpacity={1} 
                fill={`url(#color${data.symbol})`} 
                strokeWidth={2}
                isAnimationActive={false} 
                dot={<CustomLiveDot />}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Hover Signal Hint */}
       <div className="absolute bottom-8 left-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
           <div className="flex items-center text-white text-[10px] font-bold bg-blue-600/90 px-3 py-1.5 rounded-full shadow-lg backdrop-blur animate-bounce">
                Voir Signal <ArrowRight className="w-3 h-3 ml-1" />
           </div>
      </div>

    </div>
  );
};

export default SignalCard;
