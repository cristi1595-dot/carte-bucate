import React, { useState } from 'react';
import { getStoredApiKey, setStoredApiKey } from '../services/geminiParser';
import { getStoredGroqApiKey, setStoredGroqApiKey } from '../services/groqParser';
import { getPreferredProvider, setPreferredProvider, type AIProvider } from '../services/aiOrchestrator';
import { exportDatabaseBackup, importDatabaseBackup, db } from '../db';
import { SAMPLE_RECIPES } from '../db/sampleRecipes';
import {
  X,
  Key,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  Check,
  Smartphone,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  onRefreshData: () => void;
  onOpenManageCategories?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onRefreshData, onOpenManageCategories }) => {
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [groqKey, setGroqKey] = useState(getStoredGroqApiKey());
  const [preferredProvider, setPreferred] = useState<AIProvider>(getPreferredProvider());

  const [keySavedToast, setKeySavedToast] = useState(false);
  const [groqSavedToast, setGroqSavedToast] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKey);
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 2500);
  };

  const handleSaveGroqKey = () => {
    setStoredGroqApiKey(groqKey);
    setGroqSavedToast(true);
    setTimeout(() => setGroqSavedToast(false), 2500);
  };

  const handleChangeProvider = (p: AIProvider) => {
    setPreferred(p);
    setPreferredProvider(p);
  };

  const handleExportBackup = async () => {
    try {
      const json = await exportDatabaseBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `carte-de-bucate-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupMessage('Fișierul de backup a fost descărcat cu succes!');
    } catch {
      setBackupMessage('Eroare la generarea fișierului de backup.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importDatabaseBackup(content);
      setBackupMessage(res.message);
      if (res.success) {
        onRefreshData();
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDefaultSamples = async () => {
    if (window.confirm('Vrei să reîncarci rețetele demonstrative implicite? (Rețetele existente nu vor fi șterse)')) {
      for (const sample of SAMPLE_RECIPES) {
        await db.recipes.put(sample);
      }
      onRefreshData();
      setBackupMessage('Rețetele demonstrative au fost reîncărcate!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              ⚙️
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Setări & Motoare AI</h2>
              <p className="text-xs text-stone-500">Configurare Chei Gratuite, Backup și Instalare PWA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-stone-700">
          {/* Provider Selection */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Furnizor AI Preferat:
            </label>
            <div className="flex gap-1.5">
              {(['auto', 'gemini', 'groq'] as AIProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handleChangeProvider(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    preferredProvider === p
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {p === 'auto' ? '⚡ Automat (Recomandat)' : p === 'gemini' ? 'Gemini (Google)' : 'Groq (Llama 3)'}
                </button>
              ))}
            </div>
          </div>

          {/* Gemini AI Key Section */}
          <div className="border border-stone-200 rounded-2xl p-5 bg-stone-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-orange-600" /> Cheie Google Gemini (Text & Poze)
              </h3>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <span>Obține cheie gratuită</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Gemini este singurul model gratuit care <strong>poate citi și din imagini / screenshot-uri</strong> (Gemini Vision). Are configurat fallback automat între <em>gemini-2.0-flash</em> și <em>gemini-1.5-flash</em>.
            </p>

            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <button
                onClick={handleSaveApiKey}
                className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {keySavedToast ? <Check className="w-4 h-4 text-emerald-400" /> : null}
                <span>{keySavedToast ? 'Salvat!' : 'Salvează'}</span>
              </button>
            </div>
          </div>

          {/* Groq AI Key Section (Alternative ultra-fast zero-downtime) */}
          <div className="border border-stone-200 rounded-2xl p-5 bg-amber-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" /> Cheie Groq API (Opțională - Viteză Instantanee)
              </h3>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <span>Obține cheie gratuită Groq</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Groq rulează <strong>Llama 3.3 70B</strong> cu viteză instantanee (&lt;1s) și <strong>fără erori de supraîncărcare</strong>. Dacă serverele Google sunt aglomerate, aplicația folosește automat Groq pentru text!
            </p>

            <div className="flex gap-2">
              <input
                type="password"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="flex-1 bg-white border border-amber-200 rounded-xl px-3.5 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                onClick={handleSaveGroqKey}
                className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {groqSavedToast ? <Check className="w-4 h-4 text-emerald-400" /> : null}
                <span>{groqSavedToast ? 'Salvat!' : 'Salvează'}</span>
              </button>
            </div>
          </div>

          {/* Categories Management Section */}
          {onOpenManageCategories && (
            <div className="border border-stone-200 rounded-2xl p-5 bg-stone-50/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-orange-600" /> Gestionare Categorii
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenManageCategories();
                  }}
                  className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Personalizează
                </button>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Poți adăuga categorii noi, redenumi sau șterge categoriile existente (ex: Grătar, Paste, Mic Dejun etc.).
              </p>
            </div>
          )}

          {/* Backup & Restore (JSON) */}
          <div className="border border-stone-200 rounded-2xl p-5 bg-white space-y-3">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Backup & Siguranța Rețetelor
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Rețetele tale sunt salvate local pe acest telefon/computer în IndexedDB. Descarcă periodic o copie de rezervă pentru a nu le pierde niciodată.
            </p>

            {backupMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{backupMessage}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-orange-600" />
                <span>Exportă fișier Backup (JSON)</span>
              </button>

              <label className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Restaurează din fișier Backup</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* PWA & Share Target Info */}
          <div className="border border-stone-200 rounded-2xl p-5 bg-stone-50/50 space-y-2.5">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" /> Instalare & Utilizare pe Telefon (PWA)
            </h3>
            <ul className="text-xs text-stone-600 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong>Android:</strong> Meniu ⋮ ➔ <strong>„Instalează aplicația”</strong>.
              </li>
              <li>
                <strong>iPhone (Safari):</strong> Buton Partajare ⎋ ➔ <strong>„Adaugă pe ecranul principal”</strong>.
              </li>
              <li>
                <strong>Partajare directă:</strong> Când vezi o rețetă pe Facebook sau YouTube, apeși pe <em>Share</em> și alegi <em>Cartea de Bucate</em>!
              </li>
            </ul>
          </div>

          {/* Reset / Sample re-seed */}
          <div className="pt-2 flex justify-between items-center text-xs text-stone-500">
            <button
              onClick={handleResetToDefaultSamples}
              className="flex items-center gap-1.5 text-stone-600 hover:text-orange-600 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reîncarcă rețetele demonstrative</span>
            </button>
            <span>Versiune PWA: 1.1 (Multi-Provider AI)</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200/80 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs sm:text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 px-6 py-2.5 rounded-xl cursor-pointer"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};
