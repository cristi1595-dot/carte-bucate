import React, { useState } from 'react';
import {
  X,
  Cloud,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogOut,
  Sparkles,
} from 'lucide-react';
import {
  getStoredSyncCode,
  setStoredSyncCode,
  clearStoredSyncCode,
  getStoredLastSyncTime,
  generateRandomSyncCode,
  performFullSync,
  startRealtimeSync,
} from '../services/firebaseSync';

interface SyncModalProps {
  onClose: () => void;
  onSyncCompleted?: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ onClose, onSyncCompleted }) => {
  const [currentCode, setCurrentCode] = useState<string | null>(getStoredSyncCode());
  const [inputCode, setInputCode] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(getStoredLastSyncTime());

  const handleCopyCode = () => {
    if (!currentCode) return;
    navigator.clipboard.writeText(currentCode);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (clean.length < 4) {
      setStatusMessage({ text: 'Codul trebuie să aibă cel puțin 4 caractere.', isError: true });
      return;
    }

    setIsSyncing(true);
    setStatusMessage(null);
    setStoredSyncCode(clean);
    setCurrentCode(clean);

    const res = await performFullSync(clean, (step) => setSyncProgressMsg(step));
    setIsSyncing(false);
    setSyncProgressMsg(null);

    if (res.success) {
      setLastSyncTime(Date.now());
      setStatusMessage({ text: 'Conectat și sincronizat cu succes!', isError: false });
      startRealtimeSync(clean);
      onSyncCompleted?.();
    } else {
      setStatusMessage({ text: res.message, isError: true });
    }
  };

  const handleCreateNewRoom = async () => {
    const newCode = generateRandomSyncCode();
    setIsSyncing(true);
    setStatusMessage(null);
    setStoredSyncCode(newCode);
    setCurrentCode(newCode);

    const res = await performFullSync(newCode, (step) => setSyncProgressMsg(step));
    setIsSyncing(false);
    setSyncProgressMsg(null);

    if (res.success) {
      setLastSyncTime(Date.now());
      setStatusMessage({
        text: `Cameră creată cu succes! Folosește codul ${newCode} pe celelalte dispozitive.`,
        isError: false,
      });
      startRealtimeSync(newCode);
      onSyncCompleted?.();
    } else {
      setStatusMessage({ text: res.message, isError: true });
    }
  };

  const handleManualSyncNow = async () => {
    if (!currentCode) return;
    setIsSyncing(true);
    setStatusMessage(null);

    const res = await performFullSync(currentCode, (step) => setSyncProgressMsg(step));
    setIsSyncing(false);
    setSyncProgressMsg(null);

    if (res.success) {
      setLastSyncTime(Date.now());
      setStatusMessage({ text: 'Sincronizare finalizată cu succes!', isError: false });
      onSyncCompleted?.();
    } else {
      setStatusMessage({ text: res.message, isError: true });
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Ești sigur că vrei să deconectezi sincronizarea de pe acest dispozitiv? Rețetele tale locale vor rămâne salvate.')) {
      clearStoredSyncCode();
      setCurrentCode(null);
      setInputCode('');
      setStatusMessage({ text: 'Dispozitivul a fost deconectat de la camera de sincronizare.', isError: false });
    }
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Niciodată';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Chiar acum';
    if (diff < 3600) return `Acum ${Math.floor(diff / 60)} minute`;
    const date = new Date(ts);
    return `${date.toLocaleDateString('ro-RO')} la ${date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-orange-50/70 to-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-600 text-white shadow-md shadow-orange-600/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-stone-900">Sincronizare Multi-Device</h2>
              <p className="text-xs text-stone-500">Telefon • Tabletă • Laptop în timp real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-stone-700">
          {/* Status Alert if any */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs font-semibold ${
                statusMessage.isError
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              {statusMessage.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {currentCode ? (
            /* ACTIVE ROOM STATE */
            <div className="space-y-5">
              {/* Active Room Card */}
              <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/50 to-white border-2 border-orange-200/80 rounded-3xl p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 bg-orange-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Sincronizare Activă
                  </span>
                  <span className="text-xs text-stone-500">
                    {formatLastSync(lastSyncTime)}
                  </span>
                </div>

                <div className="my-3 text-center">
                  <span className="text-xs text-stone-500 font-medium block mb-1">Codul camerei tale de familie:</span>
                  <div className="inline-flex items-center justify-center gap-3 bg-white px-5 py-3 rounded-2xl border border-orange-300/80 shadow-sm">
                    <span className="text-2xl font-black font-mono tracking-wider text-stone-900 select-all">
                      {currentCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      title="Copiază codul"
                      className="p-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 transition-all cursor-pointer active:scale-95"
                    >
                      {copiedToast ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  {copiedToast && (
                    <span className="text-[11px] font-bold text-emerald-600 block mt-1.5">
                      Cod copiat în clipboard!
                    </span>
                  )}
                </div>

                {/* Sync Action Buttons */}
                <div className="mt-4 pt-4 border-t border-orange-200/60 flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={handleManualSyncNow}
                    disabled={isSyncing}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-orange-600/20 active:scale-[0.99] transition-all cursor-pointer text-xs sm:text-sm disabled:opacity-60"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? syncProgressMsg || 'Se sincronizează...' : 'Sincronizează Acum'}</span>
                  </button>

                  <button
                    onClick={handleDisconnect}
                    disabled={isSyncing}
                    title="Deconectează acest dispozitiv"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-rose-600 hover:border-rose-200 bg-white transition-all cursor-pointer text-xs font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Deconectează</span>
                  </button>
                </div>
              </div>

              {/* Instructions on how to connect phone */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-2.5">
                <h4 className="text-xs font-bold text-stone-800 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-orange-600" /> Cum te conectezi de pe telefon / tabletă:
                </h4>
                <ol className="text-xs text-stone-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Deschide aplicația <strong>Carte de Bucate</strong> pe telefon.</li>
                  <li>Apasă pe butonul de <strong>Sincronizare (Cloud)</strong> din meniul de sus.</li>
                  <li>Introdu codul <strong className="font-mono text-stone-900 bg-white px-1.5 py-0.5 rounded border border-stone-200">{currentCode}</strong> și apasă pe <em>„Conectează & Sincronizează”</em>.</li>
                  <li>Rețetele, lista de cumpărături și cămara vor fi sincronizate instant pe ambele dispozitive!</li>
                </ol>
              </div>
            </div>
          ) : (
            /* DISCONNECTED STATE: CREATE OR JOIN */
            <div className="space-y-6">
              {/* Banner */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50/60 border border-orange-200/80 rounded-2xl p-4 flex items-start gap-3">
                <div className="p-2 bg-orange-100 text-orange-700 rounded-xl shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs text-stone-600 leading-relaxed">
                  <strong className="text-stone-900 font-bold block mb-0.5">Sincronizare automată în Cloud:</strong>
                  Orice rețetă adăugată, orice produs bifat în cămară sau lista de cumpărături pe un dispozitiv se actualizează automat pe toate celelalte.
                </div>
              </div>

              {/* Option 1: Create New Room */}
              <div className="border border-stone-200/80 rounded-2xl p-5 bg-white space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm">Dispozitivul principal (ex: Laptop / PC)</h3>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Dacă ai deja rețete pe acest dispozitiv și vrei să le trimiți pe telefon sau tabletă, generează o cameră nouă de sincronizare:
                </p>
                <button
                  onClick={handleCreateNewRoom}
                  disabled={isSyncing}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-orange-600/20 active:scale-[0.99] transition-all cursor-pointer text-xs sm:text-sm disabled:opacity-60"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSyncing ? syncProgressMsg || 'Se configurează...' : 'Generează Cod Nou de Sincronizare'}</span>
                </button>
              </div>

              {/* Option 2: Join Existing Room */}
              <div className="border border-stone-200/80 rounded-2xl p-5 bg-white space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm">Al doilea dispozitiv (ex: Telefon / Tabletă)</h3>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Dacă ai deja un cod generat pe celălalt dispozitiv, introdu-l aici pentru a te conecta:
                </p>
                <form onSubmit={handleConnectExisting} className="space-y-2.5">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="ex: BUCATE-7492 sau NUME-FAMILIE"
                    maxLength={32}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm font-mono uppercase text-stone-900 font-bold tracking-wider placeholder:text-stone-400 placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    disabled={isSyncing || inputCode.trim().length < 4}
                    className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer text-xs sm:text-sm disabled:opacity-40"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? syncProgressMsg || 'Se conectează...' : 'Conectează & Sincronizează'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <Cloud className="w-3.5 h-3.5" />
            <span>Google Cloud Firestore</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-900 bg-white border border-stone-300 hover:bg-stone-50 px-5 py-2 rounded-xl cursor-pointer shadow-2xs"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};
