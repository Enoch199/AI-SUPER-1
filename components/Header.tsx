
import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Send, Settings, Check, X } from 'lucide-react';

const Header: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [chatId, setChatId] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('telegram_chat_id');
    if (stored) setChatId(stored);
  }, []);

  const handleSave = () => {
    localStorage.setItem('telegram_chat_id', chatId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setShowSettings(false);
  };

  return (
    <header className="w-full bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between shadow-lg relative">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">PocketSignal <span className="text-blue-400">AI</span></h1>
          <p className="text-xs text-slate-400">Assistant de Trading Options Binaires</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-700">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-slate-300">
            Moteur: Gemini 2.5
            </span>
        </div>

        <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors ${chatId ? 'bg-[#229ED9] text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
            title="Configuration Telegram"
        >
            <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Telegram Settings Popover */}
      {showSettings && (
        <div className="absolute top-16 right-4 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    <Send className="w-3 h-3 text-[#229ED9]" /> Connexion Bot Telegram
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            <div className="space-y-3">
                <div>
                    <label className="text-xs text-slate-400 mb-1 block">Votre Chat ID (Utilisateur ou Canal)</label>
                    <input 
                        type="text" 
                        value={chatId}
                        onChange={(e) => setChatId(e.target.value)}
                        placeholder="ex: 123456789 ou @moncanal"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-[#229ED9] outline-none placeholder-slate-600"
                    />
                </div>
                <div className="bg-slate-900/50 p-2 rounded text-[10px] text-slate-400 leading-tight border border-slate-700">
                    1. Démarrez le bot <strong>@B_Coin</strong> sur Telegram.<br/>
                    2. Entrez votre ID ici.<br/>
                    3. Sauvegardez pour activer l'envoi.
                </div>
                <button 
                    onClick={handleSave}
                    className="w-full bg-[#229ED9] hover:bg-[#1e8bc0] text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                    {saved ? <Check className="w-3 h-3" /> : <Settings className="w-3 h-3" />}
                    {saved ? 'Connecté !' : 'Sauvegarder Connexion'}
                </button>
            </div>
        </div>
      )}
    </header>
  );
};

export default Header;
