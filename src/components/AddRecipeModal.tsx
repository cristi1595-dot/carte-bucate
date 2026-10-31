import React, { useState } from 'react';
import { DEFAULT_CATEGORIES } from '../types/recipe';
import type { Recipe, RecipeCategory, CategoryItem, Ingredient, InstructionStep } from '../types/recipe';
import {
  parseSchemaRecipeJsonLd,
  autoClassifyCategory,
  fetchHtmlThroughProxies,
  fetchCleanMarkdownFromUrl,
  unwrapRedirectUrl,
  parseOpenGraphMeta,
} from '../services/schemaRecipeParser';
import {
  extractRecipeFromText,
  extractRecipeFromImage,
  hasAnyAiKey,
} from '../services/aiOrchestrator';
import { compressImage } from '../services/imageCompression';
import {
  X,
  FileText,
  Camera,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  Upload,
  Check,
  Clipboard,
} from 'lucide-react';

interface AddRecipeModalProps {
  initialRecipe?: Recipe | null;
  categories?: CategoryItem[];
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
  onOpenSettings: () => void;
  initialShareText?: string;
  initialShareUrl?: string;
}

export const AddRecipeModal: React.FC<AddRecipeModalProps> = ({
  initialRecipe,
  categories = DEFAULT_CATEGORIES,
  onClose,
  onSave,
  onOpenSettings,
  initialShareText,
  initialShareUrl,
}) => {
  // Mode: 'import-text' | 'import-image' | 'form'
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'form'>(
    initialRecipe ? 'form' : initialShareText || initialShareUrl ? 'text' : 'text'
  );

  // Import Inputs
  const [inputText, setInputText] = useState<string>(
    initialShareUrl || initialShareText || ''
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ocrInfo, setOcrInfo] = useState<{ progress: number; status: string } | null>(null);
  const [facebookGuidance, setFacebookGuidance] = useState<boolean>(false);

  // Form Fields (Editable Recipe)
  const [title, setTitle] = useState(initialRecipe?.title || '');
  const [category, setCategory] = useState<RecipeCategory>(initialRecipe?.category || 'Fel Principal');
  const [tagsInput, setTagsInput] = useState(initialRecipe?.tags?.join(', ') || '');
  const [servings, setServings] = useState<number>(initialRecipe?.servings || 4);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | ''>(initialRecipe?.prepTimeMinutes ?? 15);
  const [cookTimeMinutes, setCookTimeMinutes] = useState<number | ''>(initialRecipe?.cookTimeMinutes ?? 30);
  const [notes, setNotes] = useState(initialRecipe?.notes || '');
  const [sourceUrl, setSourceUrl] = useState(initialRecipe?.sourceUrl || initialShareUrl || '');
  const [originalText, setOriginalText] = useState(initialRecipe?.originalText || initialShareText || '');
  const [recipeImage, setRecipeImage] = useState<string | undefined>(initialRecipe?.image);

  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialRecipe?.ingredients || [
      { id: '1', name: '', amount: null, unit: '', originalText: '' },
    ]
  );

  const [instructions, setInstructions] = useState<InstructionStep[]>(
    initialRecipe?.instructions || [
      { id: '1', stepNumber: 1, text: '', timerMinutes: undefined },
    ]
  );

  // Populate structured fields from extracted data
  const populateFromExtracted = (data: any, rawSource: string) => {
    if (data.title) setTitle(data.title);
    if (data.category) setCategory(data.category);
    if (data.tags) setTagsInput(data.tags.join(', '));
    if (data.servings) setServings(data.servings);
    if (data.prepTimeMinutes !== undefined) setPrepTimeMinutes(data.prepTimeMinutes);
    if (data.cookTimeMinutes !== undefined) setCookTimeMinutes(data.cookTimeMinutes);
    if (data.ingredients && data.ingredients.length > 0) setIngredients(data.ingredients);
    if (data.instructions && data.instructions.length > 0) setInstructions(data.instructions);
    if (data.notes) setNotes(data.notes);
    if (data.image) setRecipeImage(data.image);
    setOriginalText(rawSource);
    setActiveTab('form'); // Switch to review & edit form
  };

  // Handler for parsing pasted text or link
  const handleParseTextOrLink = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Te rugăm să introduci un link sau să lipești textul rețetei.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setFacebookGuidance(false);

    try {
      const trimmed = inputText.trim();

      // Unwrap any Facebook/Google redirection URLs to find the actual target website
      const targetUrl = unwrapRedirectUrl(trimmed);
      const isUrl = /^https?:\/\//i.test(targetUrl);
      if (isUrl) {
        setSourceUrl(targetUrl);
      }

      // Check if it's solely an internal social media link (which blocks anonymous web scraping)
      const isSocialUrlOnly =
        /facebook\.com|instagram\.com|tiktok\.com/i.test(targetUrl) && targetUrl.split(/\s+/).length === 1;
      if (isSocialUrlOnly) {
        setFacebookGuidance(true);
        setErrorMessage(
          'Postările interne de Facebook / Instagram cer autentificare și blochează descărcarea automată a textului din link.'
        );
        setIsLoading(false);
        return;
      }

      // 1. Check if the raw input contains Schema.org/Recipe JSON-LD
      const schemaData = parseSchemaRecipeJsonLd(trimmed);
      if (schemaData && schemaData.title && schemaData.ingredients?.length) {
        populateFromExtracted(schemaData, trimmed);
        setIsLoading(false);
        return;
      }

      // 2. If it's a direct URL to a webpage (Jamila, Cookpad, Savori Urbane, bloguri etc.)
      if (isUrl) {
        // Step 2a: Try Jina Reader first (fast, bypasses CORS, strips ads and converts directly to clean markdown)
        try {
          const cleanMarkdown = await fetchCleanMarkdownFromUrl(targetUrl);
          if (cleanMarkdown && cleanMarkdown.length > 150) {
            const fetchedSchema = parseSchemaRecipeJsonLd(cleanMarkdown);
            if (fetchedSchema && fetchedSchema.title && fetchedSchema.ingredients?.length) {
              populateFromExtracted(fetchedSchema, targetUrl);
              setIsLoading(false);
              return;
            }

            // If no embedded schema, feed the clean markdown to AI (DeepSeek / Gemini / Groq)
            if (hasAnyAiKey()) {
              const aiData = await extractRecipeFromText(cleanMarkdown);
              populateFromExtracted(aiData, targetUrl);
              setIsLoading(false);
              return;
            }
          }
        } catch (jinaErr) {
          console.warn('Jina Reader error, trying proxy fallback:', jinaErr);
        }

        // Step 2b: Fallback to multi-proxy fetch
        try {
          const htmlContent = await fetchHtmlThroughProxies(targetUrl);
          if (htmlContent) {
            const fetchedSchema = parseSchemaRecipeJsonLd(htmlContent);
            if (fetchedSchema && fetchedSchema.title && fetchedSchema.ingredients?.length) {
              populateFromExtracted(fetchedSchema, targetUrl);
              setIsLoading(false);
              return;
            }

            const meta = parseOpenGraphMeta(htmlContent);
            if (meta.title) setTitle(meta.title);
            if (meta.image) setRecipeImage(meta.image);
          }
        } catch (e) {
          console.warn('Proxy fetch error:', e);
        }
      }

      // 3. Process text with AI Orchestrator (DeepSeek V3 -> Gemini -> Groq)
      if (!hasAnyAiKey()) {
        const autoCat = autoClassifyCategory(trimmed.slice(0, 80), trimmed);
        setCategory(autoCat);
        setTitle(trimmed.split('\n')[0].slice(0, 60));
        setOriginalText(trimmed);
        setActiveTab('form');
        setErrorMessage(
          'Rețeta a fost încărcată parțial. Pentru extragerea automată a ingredientelor și pașilor, adaugă o cheie DeepSeek, Gemini sau Groq în Setări!'
        );
        setIsLoading(false);
        return;
      }

      const aiData = await extractRecipeFromText(trimmed);
      populateFromExtracted(aiData, trimmed);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Eroare la extragerea rețetei.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setInputText(text.trim());
          setFacebookGuidance(false);
        }
      }
    } catch (err) {
      console.warn('Nu s-a putut citi din clipboard:', err);
    }
  };

  // Handler for image / screenshot upload & OCR / Vision parsing
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setImagePreview(compressed);
      setRecipeImage(compressed);
    } catch {
      setErrorMessage('Eroare la procesarea imaginii.');
    }
  };

  const handleParseImageWithVision = async () => {
    if (!imagePreview) {
      setErrorMessage('Te rugăm să selectezi o imagine sau un screenshot cu rețeta.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setOcrInfo({ progress: 10, status: 'Pornire scaner OCR...' });

    try {
      const aiData = await extractRecipeFromImage(imagePreview, (info) => {
        setOcrInfo(info);
      });
      populateFromExtracted(aiData, 'Screenshot / Imagine scanată cu rețetă');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Eroare la scanarea imaginii.');
    } finally {
      setIsLoading(false);
      setOcrInfo(null);
    }
  };

  // Ingredients editing helpers
  const handleIngredientChange = (index: number, field: keyof Ingredient, value: any) => {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { id: 'ing-' + Date.now(), name: '', amount: null, unit: '', originalText: '' },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Instructions editing helpers
  const handleInstructionChange = (index: number, text: string) => {
    setInstructions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text };
      return updated;
    });
  };

  const handleAddInstruction = () => {
    setInstructions((prev) => [
      ...prev,
      { id: 'step-' + Date.now(), stepNumber: prev.length + 1, text: '' },
    ]);
  };

  const handleRemoveInstruction = (index: number) => {
    setInstructions((prev) =>
      prev.filter((_, i) => i !== index).map((s, idx) => ({ ...s, stepNumber: idx + 1 }))
    );
  };

  // Save recipe to database
  const handleSaveRecipe = () => {
    if (!title.trim()) {
      setErrorMessage('Te rugăm să introduci un titlu pentru rețetă.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    const validIngredients = ingredients.filter((i) => i.name.trim().length > 0);
    const validInstructions = instructions.filter((s) => s.text.trim().length > 0);

    const recipeToSave: Recipe = {
      id: initialRecipe?.id || 'recipe-' + Date.now(),
      title: title.trim(),
      category,
      tags: tags.length > 0 ? tags : ['rețetă'],
      servings: Number(servings) || 4,
      prepTimeMinutes: prepTimeMinutes !== '' ? Number(prepTimeMinutes) : undefined,
      cookTimeMinutes: cookTimeMinutes !== '' ? Number(cookTimeMinutes) : undefined,
      ingredients: validIngredients,
      instructions: validInstructions,
      notes: notes.trim() || undefined,
      rating: initialRecipe?.rating || 0,
      isFavorite: initialRecipe?.isFavorite || false,
      sourceUrl: sourceUrl.trim() || undefined,
      originalText: originalText.trim() || undefined,
      image: recipeImage,
      createdAt: initialRecipe?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(recipeToSave);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-200/80 flex items-center justify-between gap-3 bg-stone-50/50">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900">
              {initialRecipe ? 'Editează Rețeta' : 'Adaugă Rețetă Nouă'}
            </h2>
            <p className="text-xs text-stone-500">
              Din Facebook, clipuri video, link-uri sau poze de cărți de bucate
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        {!initialRecipe && (
          <div className="flex border-b border-stone-200/80 bg-stone-100/50 px-4 pt-2 gap-2 text-xs sm:text-sm font-semibold">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl transition-all ${
                activeTab === 'text'
                  ? 'bg-white text-orange-600 border-t-2 border-orange-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Text / Link Social Media</span>
            </button>

            <button
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl transition-all ${
                activeTab === 'image'
                  ? 'bg-white text-orange-600 border-t-2 border-orange-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Screenshot / Poză Carte</span>
            </button>

            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl transition-all ${
                activeTab === 'form'
                  ? 'bg-white text-orange-600 border-t-2 border-orange-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Formular Manual & Revizuire</span>
            </button>
          </div>
        )}

        {/* Error Alert & Facebook Guidance */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 text-xs sm:text-sm text-rose-800">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span>{errorMessage}</span>
                {errorMessage.includes('Setări') && (
                  <button
                    onClick={onOpenSettings}
                    className="block mt-1 font-bold text-orange-700 hover:underline"
                  >
                    ⚙️ Deschide Setări pentru a configura cheia AI
                  </button>
                )}
              </div>
              <button onClick={() => { setErrorMessage(null); setFacebookGuidance(false); }} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Facebook Quick Actions */}
            {facebookGuidance && (
              <div className="pt-2 border-t border-rose-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="flex items-center justify-center gap-1.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-bold py-2 px-3 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5 text-orange-600" />
                  <span>1. Lipește textul din Facebook</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('image');
                    setErrorMessage(null);
                    setFacebookGuidance(false);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-3 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>2. Fă Screenshot & Scanează</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Paste Text / Link */}
        {activeTab === 'text' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="bg-orange-50/70 border border-orange-200/70 rounded-2xl p-4 text-xs sm:text-sm text-orange-950">
              <p className="font-semibold flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-orange-600" />
                Cum funcționează ingestia inteligentă:
              </p>
              <p className="text-stone-700 leading-relaxed">
                Lipește link-ul rețetei (de pe bloguri precum Jamila, Savori Urbane, etc.) <strong>sau</strong> textul copiat din postările de Facebook, TikTok sau Instagram. Tehnologia AI (DeepSeek / Gemini) va extrage instantaneu ingredientele, gramajele și timpii de preparare.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Lipește Link-ul sau Textul Rețetei:
                </label>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Lipește din Clipboard</span>
                </button>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Exemplu: Lipește aici https://site-retete.ro sau textul copiat din Facebook: 'Azi am făcut o ciorbă de burtă senzațională! Avem nevoie de 1kg burtă, 4 gălbenușuri, smântână...'"
                rows={8}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all"
              />
            </div>

            <button
              onClick={handleParseTextOrLink}
              disabled={isLoading || !inputText.trim()}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-orange-600/25 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Se analizează și structurează rețeta...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Extrage Rețeta & Categorisește Automat</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: Upload Screenshot / Cookbook photo */}
        {activeTab === 'image' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-4 text-xs sm:text-sm text-amber-950">
              <p className="font-semibold flex items-center gap-1.5 mb-1">
                <Camera className="w-4 h-4 text-amber-600" />
                Scanare Screenshot sau Poză din Carte de Bucate
              </p>
              <p className="text-stone-700 leading-relaxed">
                Fă un screenshot la o postare de Facebook / Instagram sau fotografiază o pagină dintr-o carte de bucate. Motorul OCR local citește textul direct pe dispozitivul tău, iar inteligența artificială îl transformă în rețetă salvată.
              </p>
            </div>

            <div className="border-2 border-dashed border-stone-300 rounded-3xl p-6 text-center hover:border-orange-500 transition-colors bg-stone-50">
              {imagePreview ? (
                <div className="space-y-3">
                  <img
                    src={imagePreview}
                    alt="Previzualizare"
                    className="max-h-64 mx-auto rounded-2xl shadow-md object-contain"
                  />
                  <div className="flex justify-center gap-3">
                    <label className="cursor-pointer bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold px-4 py-2 rounded-xl">
                      Alege altă poză
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-stone-800 text-sm">
                    Apasă pentru a alege o poză sau un screenshot
                  </span>
                  <span className="text-xs text-stone-500">sau folosește camera telefonului</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Live Progress Indicator during OCR / AI Parsing */}
            {ocrInfo && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2 text-xs text-indigo-950">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    {ocrInfo.status}
                  </span>
                  <span className="text-indigo-600 font-mono">{ocrInfo.progress}%</span>
                </div>
                <div className="w-full bg-indigo-200/70 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, ocrInfo.progress)}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleParseImageWithVision}
              disabled={isLoading || !imagePreview}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-orange-600/25 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Se procesează imaginea...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Scanează & Extrage Rețeta (OCR + AI)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 3: Detailed Structured Form & Review */}
        {activeTab === 'form' && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {/* Title & Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Titlu Rețetă *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Ciorbă Rădăuțeană"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Categorie Principală
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RecipeCategory)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                  {/* If the recipe category is not currently in the categories list, still show it as an option */}
                  {category && !categories.some((c) => c.id === category) && (
                    <option value={category}>
                      🍽️ {category}
                    </option>
                  )}
                </select>
              </div>
            </div>

            {/* Tags & Times Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Etichete (separate prin virgulă)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="rapid, tradițional, airfryer, de post"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Porții
                </label>
                <input
                  type="number"
                  min={1}
                  value={servings}
                  onChange={(e) => setServings(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-800 text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Timp Gătire (min)
                </label>
                <input
                  type="number"
                  min={0}
                  value={cookTimeMinutes}
                  onChange={(e) => setCookTimeMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="30"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-800 text-center"
                />
              </div>
            </div>

            {/* Image Upload for Recipe */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Poză cu Mâncarea
              </label>
              <div className="flex items-center gap-3">
                {recipeImage ? (
                  <div className="relative w-20 h-16 rounded-xl overflow-hidden border border-stone-200">
                    <img src={recipeImage} alt="Rețetă" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setRecipeImage(undefined)}
                      className="absolute top-1 right-1 bg-stone-900/80 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : null}
                <label className="cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                  <Camera className="w-4 h-4 text-orange-600" />
                  <span>{recipeImage ? 'Schimbă poza' : 'Încarcă sau fă o poză'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const compressed = await compressImage(file);
                        setRecipeImage(compressed);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Ingredients Builder */}
            <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                  <span>🥕</span> Ingrediente ({ingredients.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adaugă rând
                </button>
              </div>

              <div className="space-y-2">
                {ingredients.map((ing, idx) => (
                  <div key={ing.id} className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder="Cant."
                      value={ing.amount ?? ''}
                      onChange={(e) =>
                        handleIngredientChange(
                          idx,
                          'amount',
                          e.target.value === '' ? null : parseFloat(e.target.value)
                        )
                      }
                      className="w-20 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 text-center"
                    />
                    <input
                      type="text"
                      placeholder="Unitate (g, ml, buc)"
                      value={ing.unit}
                      onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                      className="w-24 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-800"
                    />
                    <input
                      type="text"
                      placeholder="Nume ingredient (ex: făină albă)"
                      value={ing.name}
                      onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                      className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      className="p-1.5 text-stone-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions Builder */}
            <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                  <span>📋</span> Pași de Preparare ({instructions.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddInstruction}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adaugă pas
                </button>
              </div>

              <div className="space-y-2.5">
                {instructions.map((step, idx) => (
                  <div key={step.id} className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1">
                      {step.stepNumber}
                    </span>
                    <textarea
                      rows={2}
                      value={step.text}
                      onChange={(e) => handleInstructionChange(idx, e.target.value)}
                      placeholder={`Instrucțiuni pentru pasul ${step.stepNumber}...`}
                      className="flex-1 bg-white border border-stone-200 rounded-xl p-2.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveInstruction(idx)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 mt-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes & Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Note Personale
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Sfaturi utile sau secrete de preparare..."
                  rows={2}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Link Sursă (Facebook, YouTube etc.)
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-200 px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Anulează
          </button>

          {activeTab === 'form' ? (
            <button
              onClick={handleSaveRecipe}
              className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl shadow-md shadow-orange-600/30 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Salvează în Cartea de Bucate</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('form')}
              className="text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-200 bg-stone-100 px-4 py-2 rounded-xl"
            >
              Sau completează manual
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
