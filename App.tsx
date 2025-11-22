import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TimeframeSelector from './components/TimeframeSelector';
import SignalCard from './components/SignalCard';
import { CurrencyPairData, SignalType, Timeframe } from './types';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// Fallback prices in case API fails (Approx values)
const FALLBACK_PAIRS = [
  { symbol: 'EUR/USD OTC', basePrice: 1.05420 }, 
  { symbol: 'GBP/USD OTC', basePrice: 1.26120 },
  { symbol: 'USD/JPY OTC', basePrice: 154.65 },
  { symbol: 'AUD/CAD OTC', basePrice: 0.91380 },
  { symbol: 'USD/CHF OTC', basePrice: 0.88550 },
  { symbol: 'NZD/USD OTC', basePrice: 0.58420 },
  { symbol: 'EUR/JPY OTC', basePrice: 163.15 },
  { symbol: 'GBP/JPY OTC', basePrice: 195.35 },
];

// Helper to generate random walk price with realistic micro-movements
const generateNextPrice = (current: number, volatility: number) => {
  const change = (Math.random() - 0.5) * volatility;
  return current + change;
};

const calculateSignal = (rsi: number, stoch: number, trend: number): SignalType => {
  if (rsi < 30 && stoch < 20) return SignalType.STRONG_BUY;
  if (rsi > 70 && stoch > 80) return SignalType.STRONG_SELL;
  if (rsi < 45 && trend > 0) return SignalType.BUY;
  if (rsi > 55 && trend < 0) return SignalType.SELL;
  return SignalType.NEUTRAL;
};

const App: React.FC = () => {
  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.S30); // Default 30s
  const [marketData, setMarketData] = useState<CurrencyPairData[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);
  const [usingRealRates, setUsingRealRates] = useState(false);

  // Initialize Market Data with Real Rates
  useEffect(() => {
    const initData = async () => {
      let initialPairs = FALLBACK_PAIRS;
      
      try {
        // Fetch real rates from open API
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (response.ok) {
            const data = await response.json();
            const rates = data.rates;
            
            // Construct pairs based on real rates
            // Note: OTC markets often mirror real markets closely
            initialPairs = [
                { symbol: 'EUR/USD OTC', basePrice: 1 / rates.EUR },
                { symbol: 'GBP/USD OTC', basePrice: 1 / rates.GBP },
                { symbol: 'USD/JPY OTC', basePrice: rates.JPY },
                { symbol: 'AUD/CAD OTC', basePrice: rates.CAD / rates.AUD },
                { symbol: 'USD/CHF OTC', basePrice: rates.CHF },
                { symbol: 'NZD/USD OTC', basePrice: 1 / rates.NZD },
                { symbol: 'EUR/JPY OTC', basePrice: rates.JPY / rates.EUR },
                { symbol: 'GBP/JPY OTC', basePrice: rates.JPY / rates.GBP },
            ];
            setUsingRealRates(true);
        }
      } catch (error) {
        console.error("Error fetching real rates, using fallback:", error);
      }

      const initialData: CurrencyPairData[] = initialPairs.map(pair => ({
        symbol: pair.symbol,
        currentPrice: pair.basePrice,
        history: Array.from({ length: 40 }, (_, i) => ({ timestamp: Date.now() - i * 1000, value: pair.basePrice })),
        change: 0,
        rsi: 50,
        stochastic: 50,
        signal: SignalType.NEUTRAL,
        lastUpdated: Date.now()
      }));
      
      setMarketData(initialData);
    };

    initData();
  }, []);

  // Simulation Loop - Faster updates (500ms) for "Real-Time" feel
  useEffect(() => {
    if (!isSimulating || marketData.length === 0) return;

    const interval = setInterval(() => {
      setMarketData(prevData => {
        return prevData.map(pair => {
          // Volatility adjustment: varying slightly per pair to look natural
          // JPY pairs have higher nominal volatility due to price scale
          const isJpy = pair.symbol.includes('JPY');
          let baseVol = isJpy ? 0.03 : 0.00008; 
          
          // Add some "noise"
          const volatility = baseVol * (0.8 + Math.random() * 0.4);

          const newPrice = generateNextPrice(pair.currentPrice, volatility);
          
          // Update history
          const newHistory = [...pair.history.slice(1), { timestamp: Date.now(), value: newPrice }];
          
          // Simulate indicators (Random walk with mean reversion)
          let newRsi = pair.rsi + (Math.random() - 0.5) * 5;
          newRsi = Math.max(10, Math.min(90, newRsi)); // Clamp
          
          let newStoch = pair.stochastic + (Math.random() - 0.5) * 8;
          newStoch = Math.max(5, Math.min(95, newStoch));

          // Calculate Trend (Price change over last 10 ticks for stability)
          const startPrice = newHistory[newHistory.length - 10].value;
          const trend = newPrice - startPrice;
          
          // Calculate change percentage relative to the START of the session (first point in history or original base)
          // To simplify for this view, we compare against the price 40 ticks ago (start of visible history approx)
          // or keep a reference. Here we calculate change relative to the moving window start for volatility visualization
          // But standard "change" is usually daily. Since we don't have daily open, let's use the first point in history as reference for "session change"
          const refPrice = newHistory[0].value; 
          const changePercent = ((newPrice - refPrice) / refPrice) * 100;

          const signal = calculateSignal(newRsi, newStoch, trend);

          return {
            ...pair,
            currentPrice: newPrice,
            history: newHistory,
            change: changePercent,
            rsi: newRsi,
            stochastic: newStoch,
            signal: signal,
            lastUpdated: Date.now()
          };
        });
      });
    }, 500); // Updates every 500ms

    return () => clearInterval(interval);
  }, [isSimulating, marketData.length]); // Add marketData.length dependency to ensure loop starts after init

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Header />
      
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        
        {/* Disclaimer Banner */}
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200/80">
            <p className="font-semibold text-blue-200 mb-1">
                {usingRealRates ? "Données Synchronisées avec le Marché Réel" : "Mode Simulation (Hors Ligne)"}
            </p>
            {usingRealRates 
                ? "Les prix de base sont synchronisés avec les taux de change actuels. La volatilité est simulée pour le trading OTC." 
                : "Impossible de récupérer les taux réels. Utilisation des valeurs par défaut simulées."}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Marché OTC Live</h2>
                <p className="text-slate-400 text-sm">Choisissez le temps d'expiration, puis cliquez pour le signal.</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 shadow-inner">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    LIVE
                </div>
                <button 
                    onClick={() => setIsSimulating(!isSimulating)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                    title={isSimulating ? "Pause" : "Reprendre"}
                >
                    <RefreshCw className={`w-5 h-5 ${isSimulating ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>

        <TimeframeSelector selected={timeframe} onSelect={setTimeframe} />

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {marketData.map((pair) => (
            <SignalCard 
              key={pair.symbol} 
              data={pair} 
              timeframe={timeframe} 
            />
          ))}
        </div>

      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-xs">
          <p className="mb-2">&copy; 2024 PocketSignal AI.</p>
          <p>Les cours sont basés sur les taux réels du marché et simulés avec une volatilité OTC.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;