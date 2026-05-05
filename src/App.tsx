import { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';

// MediaPipe is loaded via CDN in index.html as global scripts.
// DO NOT import from npm - it cannot be bundled correctly by Vite.
// Access via window globals set by the CDN scripts.

// Type-only import for TypeScript hints (stripped at compile time)
import type { Results } from '@mediapipe/hands';

const getHands = (): any => {
  return (window as any).Hands;
};

const getDrawingUtils = () => {
  // CDN exposes drawConnectors / drawLandmarks directly on window
  return window as any;
};

import { 
  Camera, 
  MessageSquare, 
  Trash2, 
  ChevronRight, 
  BookOpen, 
  Play, 
  ArrowLeft,
  Hand,
  Info,
  Zap,
  Shield,
  Sparkles,
  Eye,
  RotateCcw,
  Space,
  Settings,
  Plus,
  PlayCircle,
  StopCircle,
  Brain
} from 'lucide-react';
import { detectHandSign } from './utils/signLogic';
import * as mlEngine from './utils/mlEngine';

type Page = 'home' | 'guide' | 'detector-letter' | 'detector-word' | 'example';

const HAND_CONNECTIONS: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

const SIGN_DATA = [
  { char: 'A', emoji: '✊', img: '/signs/a.png', desc: 'Kepalkan tangan, jempol di samping', fingers: 'Semua tertutup rapat', color: 'from-cyan-500/20 to-blue-500/20', border: 'hover:border-cyan-500/50' },
  { char: 'B', emoji: '🖐️', img: '/signs/b.png', desc: 'Tangan lurus tegak', fingers: '4 jari lurus, jempol dilipat', color: 'from-purple-500/20 to-pink-500/20', border: 'hover:border-purple-500/50' },
  { char: 'C', emoji: '🗜️', img: '/signs/c.png', desc: 'Melengkung bentuk C', fingers: 'Semua melengkung setengah terbuka', color: 'from-sky-500/20 to-cyan-500/20', border: 'hover:border-sky-500/50' },
  { char: 'D', emoji: '☝️', img: '/signs/d.png', desc: 'Telunjuk naik, lain membulat', fingers: 'Jempol menyentuh jari tengah', color: 'from-amber-500/20 to-orange-500/20', border: 'hover:border-amber-500/50' },
  { char: 'E', emoji: '✊', img: '/signs/e.png', desc: 'Kuku menyentuh telapak', fingers: 'Semua ditekuk rapat', color: 'from-rose-500/20 to-red-500/20', border: 'hover:border-rose-500/50' },
  { char: 'F', emoji: '👌', img: '/signs/f.png', desc: 'Bentuk tanda OK', fingers: 'Jempol & telunjuk nyambung', color: 'from-emerald-500/20 to-cyan-500/20', border: 'hover:border-emerald-500/50' },
  { char: 'G', emoji: '🤏', img: '/signs/g.png', desc: 'Telunjuk & jempol mendatar', fingers: 'Mencapit secara horizontal', color: 'from-yellow-500/20 to-lime-500/20', border: 'hover:border-yellow-500/50' },
  { char: 'H', emoji: '✌️', img: '/signs/h.png', desc: 'Telunjuk & tengah mendatar', fingers: 'Dua jari lurus ke samping', color: 'from-orange-500/20 to-red-500/20', border: 'hover:border-orange-500/50' },
  { char: 'I', emoji: '🤙', img: '/signs/i.png', desc: 'Hanya kelingking naik', fingers: 'Kelingking lurus ke atas', color: 'from-blue-500/20 to-indigo-500/20', border: 'hover:border-blue-500/50' },
  { char: 'J', emoji: '🪝', img: '/signs/j.png', desc: 'Kelingking melukis J', fingers: 'Gerakan seperti mata kail', color: 'from-violet-500/20 to-purple-500/20', border: 'hover:border-violet-500/50' },
  { char: 'K', emoji: '✌️', img: '/signs/k.png', desc: 'Bentuk V, jempol di tengah', fingers: 'Telunjuk & tengah terbuka', color: 'from-fuchsia-500/20 to-pink-500/20', border: 'hover:border-fuchsia-500/50' },
  { char: 'L', emoji: '🤟', img: '/signs/l.png', desc: 'Bentuk pistol huruf L', fingers: 'Jempol direntang ke samping', color: 'from-lime-500/20 to-green-500/20', border: 'hover:border-lime-500/50' },
  { char: 'M', emoji: '✊', img: '/signs/m.png', desc: 'Jempol diselip di 3 jari', fingers: 'Masuk di bawah telunjuk, tengah, manis', color: 'from-red-500/20 to-rose-500/20', border: 'hover:border-red-500/50' },
  { char: 'N', emoji: '✊', img: '/signs/n.png', desc: 'Jempol diselip di 2 jari', fingers: 'Masuk di bawah telunjuk & tengah', color: 'from-pink-500/20 to-rose-500/20', border: 'hover:border-pink-500/50' },
  { char: 'O', emoji: '⭕', img: '/signs/o.png', desc: 'Bentuk lingkaran (teropong)', fingers: 'Jari melengkung nyentuh jempol', color: 'from-amber-500/20 to-yellow-500/20', border: 'hover:border-amber-500/50' },
  { char: 'P', emoji: '👇', img: '/signs/p.png', desc: 'K terbalik (menghadap bawah)', fingers: 'Jempol di tengah telunjuk & tengah', color: 'from-blue-500/20 to-cyan-500/20', border: 'hover:border-blue-500/50' },
  { char: 'Q', emoji: '🤏', img: '/signs/q.png', desc: 'G terbalik (menghadap bawah)', fingers: 'Jempol & telunjuk menunjuk bawah', color: 'from-emerald-500/20 to-teal-500/20', border: 'hover:border-emerald-500/50' },
  { char: 'R', emoji: '🤞', img: '/signs/r.png', desc: 'Telunjuk & tengah menyilang', fingers: 'Jari tengah di atas telunjuk', color: 'from-cyan-500/20 to-blue-500/20', border: 'hover:border-cyan-500/50' },
  { char: 'S', emoji: '✊', img: '/signs/s.png', desc: 'Kepalan bulat', fingers: 'Jempol menyilang di depan jari', color: 'from-indigo-500/20 to-violet-500/20', border: 'hover:border-indigo-500/50' },
  { char: 'T', emoji: '✊', img: '/signs/t.png', desc: 'Jempol diselip di 1 jari', fingers: 'Masuk di bawah telunjuk saja', color: 'from-purple-500/20 to-fuchsia-500/20', border: 'hover:border-purple-500/50' },
  { char: 'U', emoji: '🤞', img: '/signs/u.png', desc: 'Telunjuk & tengah tegak rapat', fingers: 'Nempel tanpa celah', color: 'from-teal-500/20 to-emerald-500/20', border: 'hover:border-teal-500/50' },
  { char: 'V', emoji: '✌️', img: '/signs/v.png', desc: 'Tanda Peace', fingers: 'Telunjuk & tengah terpisah', color: 'from-pink-500/20 to-rose-500/20', border: 'hover:border-pink-500/50' },
  { char: 'W', emoji: '🖐️', img: '/signs/w.png', desc: 'Tiga jari tegak', fingers: 'Telunjuk, tengah, manis naik', color: 'from-indigo-500/20 to-purple-500/20', border: 'hover:border-indigo-500/50' },
  { char: 'X', emoji: '🪝', img: '/signs/x.png', desc: 'Telunjuk melengkung (kait)', fingers: 'Seperti kait bajak laut', color: 'from-rose-500/20 to-red-500/20', border: 'hover:border-rose-500/50' },
  { char: 'Y', emoji: '🤙', img: '/signs/y.png', desc: 'Mirip menelepon', fingers: 'Kelingking & jempol keluar', color: 'from-cyan-500/20 to-teal-500/20', border: 'hover:border-cyan-500/50' },
  { char: 'Z', emoji: '⚡', img: '/signs/z.png', desc: 'Telunjuk melukis Z', fingers: 'Menulis Z di udara', color: 'from-yellow-500/20 to-amber-500/20', border: 'hover:border-yellow-500/50' }
];

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detectedText, setDetectedText] = useState<string>("");
  const [currentLetter, setCurrentLetter] = useState<string>("");
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [frameCount, setFrameCount] = useState(0);
  const lastTypedLetterRef = useRef<string>("");
  // Output hanya ditampilkan setelah user pertama kali menekan tombol rekam
  const [hasRecordedOnce, setHasRecordedOnce] = useState(false);

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    let path = '/';
    if (page === 'guide') path = '/dataset-library';
    if (page === 'detector-letter') path = '/studio-huruf';
    if (page === 'detector-word') path = '/studio-kata';
    if (page === 'example') path = '/contoh-penggunaan';
    
    if (window.location.pathname !== path) {
      window.history.pushState({ page }, '', path);
    }
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.page) {
        setCurrentPage(e.state.page);
      } else {
        const path = window.location.pathname;
        if (path === '/dataset-library') navigateTo('guide');
        else if (path === '/studio-huruf') navigateTo('detector-letter');
        else if (path === '/studio-kata') navigateTo('detector-word');
        else if (path === '/contoh-penggunaan') navigateTo('example');
        else navigateTo('home');
      }
    };
    
    // Initial load sync
    const path = window.location.pathname;
    if (path === '/dataset-library') navigateTo('guide');
    else if (path === '/studio-huruf') navigateTo('detector-letter');
    else if (path === '/studio-kata') navigateTo('detector-word');
    else if (path === '/contoh-penggunaan') navigateTo('example');
    else navigateTo('home');

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // ML Studio States
  const mlStudioRef = useRef({
    activeMode: 'letter' as mlEngine.MLMode,
    isStudioMode: false,
    isRecording: false,
    trainingLetter: 'A',
    useMLMode: false
  });
  
  const [mlState, setMlState] = useState({
    activeMode: 'letter' as mlEngine.MLMode,
    isStudioMode: false,
    isRecording: false,
    trainingLetter: 'A',
    useMLMode: false,
    sampleCounts: {} as Record<string, number>,
    isDropdownOpen: false,
    customLabels: [] as string[],
    isAddingCustom: false,
    newCustomValue: ""
  });

  const updateMlState = (updates: Partial<typeof mlState>) => {
    mlStudioRef.current = { ...mlStudioRef.current, ...updates };
    setMlState(prev => ({ ...prev, ...updates }));
  };

  const updateSampleCounts = (mode: mlEngine.MLMode = mlState.activeMode) => {
    const counts = mlEngine.getClassCounts(mode);
    setMlState(prev => ({ ...prev, sampleCounts: counts }));
  };
  
  const handleExportDataset = () => {
    mlEngine.downloadDataset(mlState.activeMode);
  };

  const handleImportDataset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const success = mlEngine.importDataset(mlState.activeMode, json);
        if (success) {
          updateSampleCounts();
          alert("Dataset berhasil di-import!");
        } else {
          alert("Format dataset tidak valid!");
        }
      } catch (err) {
        alert("Gagal membaca file JSON!");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  const FRAME_THRESHOLD = 15;

  useEffect(() => {
    setIsModelLoading(true);
    // Load dataset from local storage on first mount
    const loadInitialData = async () => {
      try {
        // Only load from localStorage. No more auto-fetching broken datasets.
        mlEngine.loadDatasetFromStorage('letter');
        mlEngine.loadDatasetFromStorage('word');
      } catch (error) {
        console.error("Failed to load local dataset:", error);
      } finally {
        updateSampleCounts();
        setIsModelLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!currentPage.startsWith('detector')) return;

    let isRunning = true;
    let animationFrameId: number;

    const HandsConstructor = getHands();
    if (!HandsConstructor) {
      console.error('MediaPipe Hands tidak tersedia. Pastikan script CDN sudah dimuat.');
      setIsModelLoading(false);
      return;
    }
    const hands = new (HandsConstructor as any)({
      // Gunakan file lokal dari folder /public/hands/ agar tidak bergantung pada CDN versioned
      locateFile: (file: string) => `/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0, // Diturunkan ke 0 agar lebih ringan dan tidak delay di laptop
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults(onResults);

    const processVideo = async () => {
      if (!isRunning) return;
      
      const video = webcamRef.current?.video;
      // Pastikan video sudah dirender dan siap
      if (video && video.readyState === 4) {
        try {
          await hands.send({ image: video });
          setIsModelLoading(false); // Matikan loading setelah model berhasil menerima frame pertama
        } catch (error) {
          console.error("Error dalam memproses video:", error);
        }
      }
      
      // Looping terus-menerus meskipun video awal belum ready (polling)
      if (isRunning) {
        animationFrameId = requestAnimationFrame(processVideo);
      }
    };

    processVideo(); // Mulai loop

    return () => { 
      isRunning = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      hands.close(); 
    };
  }, [currentPage]);

  const onResults = (results: Results) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Balikkan (mirror) canvas secara horizontal agar sejajar dengan video webcam yang mirrored
    ctx.translate(canvasRef.current.width, 0);
    ctx.scale(-1, 1);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const handedness = results.multiHandedness[0].label; // "Left" atau "Right"

      const utils = getDrawingUtils();
      if (utils.drawConnectors) {
        utils.drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#06b6d4', lineWidth: 3 });
      }
      if (utils.drawLandmarks) {
        utils.drawLandmarks(ctx, landmarks, { color: '#a855f7', lineWidth: 1, radius: 3 });
      }
      
      const mlParams = mlStudioRef.current;
      
      if (mlParams.isStudioMode && mlParams.isRecording) {
        // Mode Training
        const features = mlEngine.processLandmarksToFeatures(landmarks);
        mlEngine.classifiers[mlParams.activeMode].addExample(features, mlParams.trainingLetter);
        features.dispose();
      } else if (mlParams.useMLMode && mlEngine.classifiers[mlParams.activeMode].getNumClasses() > 0) {
        // Mode AI Prediksi
        const features = mlEngine.processLandmarksToFeatures(landmarks);
        mlEngine.classifiers[mlParams.activeMode].predictClass(features).then((res: { label: string; confidences: { [key: string]: number } }) => {
          handleGesture(res.label);
          features.dispose();
        }).catch((err: any) => console.error(err));
      } else {
        // Mode Heuristik
        const letter = detectHandSign(landmarks, handedness);
        handleGesture(letter);
      }
    } else {
      mlEngine.clearTemporalBuffer();
      setCurrentLetter("");
      setFrameCount(0);
    }
    ctx.restore();
  };

  const handleGesture = (label: string) => {
    if (!label) { 
      setCurrentLetter(""); 
      setFrameCount(0); 
      lastTypedLetterRef.current = ""; 
      return; 
    }

    setCurrentLetter(prevLetter => {
      if (prevLetter === label) {
        if (lastTypedLetterRef.current === label) {
          // Jika huruf sudah diketik, biarkan progress bar penuh dan jangan ketik ulang
          setFrameCount(FRAME_THRESHOLD);
          return prevLetter;
        }

        setFrameCount(prevCount => {
          const next = prevCount + 1;
          if (next >= FRAME_THRESHOLD) { 
            setDetectedText(prevText => {
              const isWord = mlStudioRef.current.activeMode === 'word';
              const hasContent = prevText.trim().length > 0;
              // Provide padding if it's a word and there's previous text
              const prefix = (isWord && hasContent && !prevText.endsWith(' ')) ? ' ' : '';
              const suffix = isWord ? ' ' : '';
              return prevText + prefix + label + suffix;
            }); 
            lastTypedLetterRef.current = label;
            return FRAME_THRESHOLD; 
          }
          return next;
        });
        return prevLetter;
      } else {
        setFrameCount(1);
        lastTypedLetterRef.current = "";
        return label;
      }
    });
  };

  // ===================== LANDING PAGE =====================
  const LandingPage = () => (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Background Ornaments specific to Landing */}
      <div className="absolute top-20 right-10 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none animate-float-slow" />
      <div className="absolute bottom-20 left-10 w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none animate-float-slow" style={{ animationDelay: '-4s' }} />

      {/* Hero Section */}
      <div className="pt-20 pb-32 flex flex-col lg:flex-row items-center gap-16 min-h-[85vh]">
        {/* Left Content */}
        <div className="flex-1 text-center lg:text-left z-10">
          <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-cyan-500/30 mb-8 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-cyan-300 tracking-wider uppercase">Platform Machine Learning Terbuka</span>
          </div>
          
          <h1 className="animate-fade-up stagger-1 text-6xl sm:text-7xl lg:text-8xl font-black mb-6 leading-[1.05] tracking-tight">
            <span className="block text-white">Latih AI Anda</span>
            <span className="block text-gradient-hero">Tanpa Coding</span>
          </h1>
          
          <p className="animate-fade-up stagger-2 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed font-light">
            Buat Dataset Bahasa Isyarat Anda sendiri langsung di dalam browser. Rekam 21 titik rangka tangan, latih model AI secara real-time, lalu Export hasilnya (JSON/CSV) untuk project Anda!
          </p>
          <div className="animate-fade-up stagger-3 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-5">
            <button 
              onClick={() => navigateTo('example')}
              className="group relative w-full sm:w-auto overflow-hidden flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all transform hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(34,197,94,0.4)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 transition-all group-hover:scale-110 duration-500" />
              <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] group-hover:animate-shimmer" />
              <span className="relative flex items-center gap-3 text-white">
                <Info size={22} />
                Apa ini?
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>

            <button 
              onClick={() => { navigateTo('detector-letter'); updateMlState({ activeMode: 'letter', trainingLetter: 'A' }); updateSampleCounts('letter'); }}
              className="group relative w-full sm:w-auto overflow-hidden flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all transform hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(6,182,212,0.4)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 transition-all group-hover:scale-110 duration-500" />
              <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] group-hover:animate-shimmer" />
              <span className="relative flex items-center gap-3 text-white">
                <Play size={22} fill="currentColor" />
                Mode Huruf
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>

            <button 
              onClick={() => { navigateTo('detector-word'); updateMlState({ activeMode: 'word', trainingLetter: 'Halo' }); updateSampleCounts('word'); }}
              className="group relative w-full sm:w-auto overflow-hidden flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all transform hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(168,85,247,0.4)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-600 transition-all group-hover:scale-110 duration-500" />
              <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] group-hover:animate-shimmer" />
              <span className="relative flex items-center gap-3 text-white">
                <Brain size={22} />
                Mode Kata
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            
            <button 
              onClick={() => navigateTo('guide')}
              className="group w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl glass hover:bg-white/5 border border-white/10 hover:border-white/20 text-white font-bold text-lg transition-all hover:-translate-y-1"
            >
              <BookOpen size={22} className="text-slate-400 group-hover:text-purple-400 transition-colors" />
              Lihat Panduan
            </button>
          </div>
          
          {/* Stats/Trust */}
          <div className="animate-fade-up stagger-4 mt-16 flex items-center justify-center lg:justify-start gap-8 border-t border-white/5 pt-8">
            <div>
              <p className="text-3xl font-black text-white">0<span className="text-cyan-500">ms</span></p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Server Latency</p>
            </div>
            <div className="w-px h-12 bg-white/5" />
            <div>
              <p className="text-3xl font-black text-white">100<span className="text-purple-500">%</span></p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Lokal & Privat</p>
            </div>
            <div className="w-px h-12 bg-white/5" />
            <div>
              <p className="text-3xl font-black text-white">21<span className="text-emerald-500">+</span></p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Titik Sendi</p>
            </div>
          </div>
        </div>

        {/* Right Visualizer */}
        <div className="flex-1 relative w-full max-w-lg hidden lg:block animate-float">
          <div className="relative aspect-square">
            {/* Holographic glowing orb */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-600/20 blur-3xl animate-pulse-neon" />
            
            {/* AI-Generated Hero Visual */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full">
                {/* Main Glass Card with AI Background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[420px] glass-strong rounded-[2rem] border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 to-purple-500" />
                  <img 
                    src="https://image.pollinations.ai/prompt/futuristic%20holographic%20hand%20tracking%20interface%20dark%20background%20cyan%20purple%20neon%20lights%20realistic%204k%20detailed?width=400&height=500&nologo=true&seed=101" 
                    alt="AI Hand Tracking Interface" 
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                    loading="lazy"
                  />
                  <div className="relative z-10 p-6 h-full flex flex-col bg-gradient-to-b from-transparent via-[#050810]/50 to-[#050810]">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-cyan-300 tracking-wider uppercase">Live</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="relative inline-block mb-4">
                          <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
                          <span className="relative text-7xl filter drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">✌️</span>
                        </div>
                        <div className="glass px-4 py-2 rounded-xl border border-cyan-500/30 inline-block">
                          <p className="text-xs font-bold text-cyan-300 tracking-widest uppercase">Huruf V Terdeteksi</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Confidence</span>
                        <span className="text-sm font-bold text-emerald-400">98.4%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-[98%] bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full" />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>21 Titik Sendi Aktif</span>
                        <span>60 FPS</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Stats Cards */}
                <div className="absolute -right-8 top-16 w-56 p-4 glass rounded-2xl border border-white/10 shadow-xl animate-float backdrop-blur-md" style={{ animationDelay: '-2s' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg"><Zap size={16} className="text-emerald-400" /></div>
                    <p className="text-sm font-bold text-white">Processing</p>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-1">
                    <div className="h-full w-[85%] bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  <p className="text-[10px] text-emerald-400 font-mono">60 FPS • 0.2ms Latency</p>
                </div>
                
                <div className="absolute -left-6 bottom-28 w-60 p-4 glass rounded-2xl border border-white/10 shadow-xl animate-float backdrop-blur-md" style={{ animationDelay: '-1s' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg"><Shield size={16} className="text-purple-400" /></div>
                    <p className="text-sm font-bold text-white">Privacy Shield</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-[10px] text-slate-300">100% Local Processing</p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Data tidak pernah meninggalkan perangkat</p>
                </div>

                <div className="absolute right-4 bottom-10 w-48 p-3 glass rounded-xl border border-cyan-500/20 shadow-lg animate-float backdrop-blur-md" style={{ animationDelay: '-3s' }}>
                  <div className="flex items-center gap-2">
                    <Brain size={14} className="text-cyan-400" />
                    <p className="text-xs font-bold text-cyan-300">KNN Model Ready</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Showcase */}
      <div className="pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-white mb-4">Teknologi <span className="text-gradient-cyan">Mutakhir</span></h2>
          <p className="text-slate-400">Dirancang untuk kecepatan, akurasi, dan privasi maksimal.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <Zap size={28} />, title: "Real-time Edge AI", desc: "Berjalan langsung di browser menggunakan WebAssembly dan WebGL tanpa delay server.", gradient: "from-cyan-500 to-blue-600" },
            { icon: <Shield size={28} />, title: "Privasi Absolut", desc: "Video dari kamera Anda tidak pernah meninggalkan perangkat Anda. 100% aman.", gradient: "from-purple-500 to-pink-600" },
            { icon: <Sparkles size={28} />, title: "Presisi Tinggi", desc: "Melacak 21 titik sendi pada tangan dengan akurasi tinggi bahkan di kondisi minim cahaya.", gradient: "from-emerald-500 to-cyan-600" },
          ].map((item, i) => (
            <div key={i} className={`animate-fade-up stagger-${i+4} holo-card rounded-3xl p-8`}>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white mb-6 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)]`}>
                {item.icon}
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">{item.title}</h3>
              <p className="text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ===================== EXAMPLE PAGE =====================
  const ExamplePage = () => {
    return (
      <div className="animate-fade-up w-full max-w-7xl mx-auto px-4 pb-20">
        <div className="text-center mt-12 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-500/30 mb-6">
            <Info size={16} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Tentang AlphaBrain</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
            Bagaimana <span className="text-gradient-cyan">Cara Kerjanya?</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            AlphaBrain adalah studio AI tanpa coding yang memungkinkan Anda melatih komputer untuk mengenali gerakan tangan Anda sendiri.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <div className="space-y-8">
            <div className="holo-card p-8 rounded-3xl border border-white/5">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400"><Zap size={24} /></div>
                1. Deteksi Titik Sendi
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Kamera akan melacak 21 titik koordinat pada tangan Anda secara real-time. Kami menggunakan teknologi MediaPipe untuk memastikan deteksi tetap akurat meski tangan bergerak cepat.
              </p>
            </div>
            <div className="holo-card p-8 rounded-3xl border border-white/5">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Brain size={24} /></div>
                2. Latih Otak AI Anda
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Dalam <b>Studio AI</b>, Anda bisa merekam contoh gerakan (misalnya huruf A atau kata 'Halo'). Komputer akan mempelajari pola koordinat tersebut menggunakan algoritma KNN (K-Nearest Neighbors).
              </p>
            </div>
            <div className="holo-card p-8 rounded-3xl border border-white/5">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><MessageSquare size={24} /></div>
                3. Prediksi Real-time
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Setelah dilatih, AI akan mencoba menebak gerakan tangan Anda. Hasilnya bisa langsung muncul sebagai teks di layar, membantu komunikasi tanpa suara.
              </p>
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 blur-3xl rounded-full" />
            <div className="relative glass-strong p-4 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <img 
                src="https://image.pollinations.ai/prompt/person%20using%20hand%20gesture%20recognition%20software%20on%20computer%20screen%20dark%20room%20cyan%20ambient%20light%20realistic%20photography?width=800&height=450&nologo=true&seed=202" 
                alt="Person using AI Hand Recognition" 
                className="rounded-[2rem] w-full object-cover aspect-video opacity-90 group-hover:opacity-100 transition-opacity"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform cursor-pointer">
                  <Play fill="white" size={32} className="ml-1" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-16">
          <h3 className="text-3xl font-black text-white mb-4">Skenario Penggunaan Nyata</h3>
          <p className="text-slate-400 max-w-2xl mx-auto">Lihat bagaimana AlphaBrain menjembatani hambatan komunikasi di berbagai situasi sehari-hari.</p>
        </div>

        <div className="space-y-24 mb-32">
          {/* Scenario 1: Medical */}
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                Instansi Kesehatan
              </div>
              <h4 className="text-3xl font-bold text-white">Komunikasi Pasien-Dokter yang Mandiri</h4>
              <p className="text-slate-300 leading-relaxed">
                Bayangkan seorang pasien Tuli datang ke IGD tanpa pendamping. Dengan AlphaBrain yang terpasang di tablet rumah sakit, pasien dapat memberikan isyarat "Sakit", "Sesak Nafas", atau "Alergi" yang langsung diterjemahkan menjadi teks untuk perawat.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-400 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Mengurangi risiko salah diagnosis karena kendala bahasa.
                </li>
                <li className="flex items-center gap-3 text-slate-400 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Memberikan privasi penuh bagi pasien tanpa harus selalu bergantung pada pihak ketiga.
                </li>
              </ul>
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-emerald-500/10 blur-[80px] rounded-full" />
              <div className="relative glass-strong p-3 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden aspect-video">
                <img 
                  src="https://image.pollinations.ai/prompt/doctor%20using%20tablet%20to%20communicate%20with%20deaf%20patient%20hospital%20emergency%20room%20warm%20professional%20lighting%20realistic%20photography?width=800&height=450&nologo=true&seed=303" 
                  alt="Doctor using AI to communicate with deaf patient" 
                  className="w-full h-full object-cover rounded-[1.5rem] opacity-85"
                  loading="lazy"
                />
                <div className="absolute bottom-6 left-6 right-6 p-4 glass rounded-xl border border-white/10">
                  <p className="text-xs font-bold text-white mb-1">AI Output: "SAYA SESAK NAFAS"</p>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-[92%] h-full bg-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scenario 2: Education */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest">
                Sektor Pendidikan
              </div>
              <h4 className="text-3xl font-bold text-white">Belajar Bahasa Isyarat dengan Feedback Instan</h4>
              <p className="text-slate-300 leading-relaxed">
                Di sekolah inklusi, siswa umum seringkali kesulitan mempraktikkan isyarat tangan karena tidak tahu apakah gerakan mereka sudah benar. AlphaBrain bertindak sebagai "Tutor AI" yang memberikan koreksi posisi jari secara real-time.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 glass rounded-2xl border border-white/5">
                  <p className="text-xl font-bold text-white mb-1">98%</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black">Akurasi Belajar</p>
                </div>
                <div className="p-4 glass rounded-2xl border border-white/5">
                  <p className="text-xl font-bold text-white mb-1">0.1s</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black">Respon Koreksi</p>
                </div>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-purple-500/10 blur-[80px] rounded-full" />
              <div className="relative glass-strong p-3 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden aspect-video">
                <img 
                  src="https://image.pollinations.ai/prompt/student%20practicing%20sign%20language%20in%20modern%20classroom%20with%20digital%20screen%20showing%20hand%20tracking%20points%20realistic%20photography?width=800&height=450&nologo=true&seed=404" 
                  alt="Student learning sign language with AI tutor" 
                  className="w-full h-full object-cover rounded-[1.5rem] opacity-85"
                  loading="lazy"
                />
                <div className="absolute top-6 right-6 p-4 glass rounded-xl border border-purple-500/30">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs mb-1">
                    <Zap size={14} /> POSISI JARI BENAR
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scenario 3: Smart Home */}
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest">
                Teknologi Masa Depan
              </div>
              <h4 className="text-3xl font-bold text-white">Kontrol Rumah Pintar Melalui Isyarat</h4>
              <p className="text-slate-300 leading-relaxed">
                Membantu lansia atau penyandang disabilitas motorik mengontrol lingkungan mereka. Cukup dengan isyarat "L" untuk Lampu atau "K" untuk Kipas, sistem akan mengirimkan sinyal ke perangkat IoT di rumah.
              </p>
              <div className="flex items-center gap-4 p-4 glass-strong rounded-2xl border border-cyan-500/20">
                <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400"><Settings size={20} /></div>
                <p className="text-sm text-slate-300 font-medium">Bisa dikoneksikan ke Google Home atau Alexa melalui API.</p>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-cyan-500/10 blur-[80px] rounded-full" />
              <div className="relative glass-strong p-3 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden aspect-video">
                <img 
                  src="https://image.pollinations.ai/prompt/elderly%20person%20controlling%20smart%20home%20lights%20with%20hand%20gestures%20modern%20cozy%20living%20room%20warm%20lighting%20realistic%20photography?width=800&height=450&nologo=true&seed=505" 
                  alt="Smart home control with hand gestures" 
                  className="w-full h-full object-cover rounded-[1.5rem] opacity-85"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="px-6 py-3 glass-strong rounded-full border border-cyan-500/50 text-cyan-400 font-bold animate-pulse">
                    MENU: KONTROL LAMPU
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 glass-strong p-12 rounded-[3rem] border border-white/10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full" />
          <div className="relative z-10">
            <h3 className="text-3xl font-black text-white mb-4">Siap untuk mencoba?</h3>
            <p className="text-slate-300 mb-10 max-w-xl mx-auto font-light">Mulai latih AI Anda sekarang. Tidak perlu install aplikasi, semua berjalan di browser Anda.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => navigateTo('detector-letter')} className="px-8 py-4 bg-white text-slate-900 font-bold rounded-2xl hover:scale-105 transition-transform">Buka Studio AI</button>
              <button onClick={() => navigateTo('guide')} className="px-8 py-4 glass border border-white/10 text-white font-bold rounded-2xl hover:bg-white/5 transition-all">Lihat Panduan Isyarat</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===================== GUIDE PAGE =====================
  const GuidePage = () => (
    <div className="animate-fade-up w-full max-w-7xl mx-auto px-4 pb-20">
      {/* Hero Banner for Guide */}
      <div className="relative rounded-[2.5rem] overflow-hidden mb-16 glass-strong border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 via-cyan-900/40 to-blue-900/40" />
        <div className="absolute right-0 top-0 w-1/2 h-full bg-[url('https://image.pollinations.ai/prompt/hand%20sign%20language%20dictionary%20open%20book%20with%20holographic%20hand%20tracking%20points%20futuristic%20interface%20dark%20background?width=1000&height=600&nologo=true&seed=606')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="relative p-10 md:p-16 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 mb-6">
              <BookOpen size={16} className="text-purple-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Database</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
              Panduan <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Library</span>
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed font-light">
              Referensi bentuk standar yang digunakan untuk mengumpulkan data. Tiru pose ini di dalam AI Studio untuk merekam Dataset berkualitas tinggi.
            </p>
          </div>
          <button onClick={() => navigateTo('home')} className="group flex items-center gap-3 px-6 py-3 rounded-xl glass hover:bg-white/10 transition-all shrink-0">
            <ArrowLeft size={20} className="text-slate-400 group-hover:text-white transition-colors" />
            <span className="font-semibold text-slate-300 group-hover:text-white transition-colors">Kembali</span>
          </button>
        </div>
      </div>

      {/* Dictionary Grid - Premium Trading Card Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
        {SIGN_DATA.map((item, i) => (
          <div key={item.char} className={`animate-fade-up stagger-${i+1} holo-card rounded-[2rem] group cursor-pointer`}>
            {/* Glossy Reflection overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            <div className="p-1">
              {/* Inner Card Top - Emoji Showcase */}
              <div className={`relative aspect-[4/3] rounded-[1.75rem] overflow-hidden bg-gradient-to-br ${item.color} flex flex-col items-center justify-center border border-white/5`}>
                <div className="absolute inset-0 bg-[#050810]/40 backdrop-blur-[2px]" />
                
                {/* Big Background Letter */}
                <span className="absolute text-9xl font-black text-white/[0.05] -rotate-12 scale-150 select-none">{item.char}</span>
                
                {/* 3D-like Image Showcase */}
                <div className="relative z-10 w-full h-full p-4 transform group-hover:scale-110 transition-all duration-500 ease-out">
                  <img 
                    src={item.img} 
                    alt={`Hand sign for ${item.char}`}
                    className="w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]"
                    onError={(e) => {
                      // Fallback to emoji if image is missing
                      (e.target as any).style.display = 'none';
                      (e.target as any).nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="hidden text-7xl text-center leading-none select-none drop-shadow-2xl">
                    {item.emoji}
                  </div>
                </div>
                
                {/* Neon base shadow */}
                <div className="absolute bottom-4 w-20 h-4 bg-black/40 blur-md rounded-full transform group-hover:scale-75 transition-transform duration-500" />
              </div>

              {/* Inner Card Bottom - Text Info */}
              <div className="p-6">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-4xl font-black text-white">{item.char}</h3>
                  <div className="w-8 h-8 rounded-full glass flex items-center justify-center">
                    <Hand size={14} className="text-slate-400" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Aksi</p>
                    <p className="text-sm text-slate-300 font-medium">{item.desc}</p>
                  </div>
                  <div className="h-px w-full bg-white/5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Posisi Jari</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.fingers}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA to Detector */}
      <div className="mt-24 text-center relative max-w-3xl mx-auto">
        <div className="absolute inset-0 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative p-10 rounded-[2.5rem] holo-card flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6 text-left">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Eye size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Siap untuk mempraktikkan?</h3>
              <p className="text-slate-400 text-sm">Buka kamera dan sistem AI kami akan menilai gerakan Anda.</p>
            </div>
          </div>
          <button onClick={() => { navigateTo('detector-letter'); updateMlState({ activeMode: 'letter', trainingLetter: 'A' }); updateSampleCounts('letter'); }} className="w-full md:w-auto px-8 py-4 rounded-xl bg-white text-slate-900 font-black hover:scale-105 hover:bg-cyan-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            Coba Detektor
          </button>
        </div>
      </div>
    </div>
  );

  // ===================== DETECTOR PAGE =====================
  const DetectorPage = ({ mode }: { mode: mlEngine.MLMode }) => (
    <div className="animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigateTo('home')} className="p-3 rounded-2xl glass hover:neon-border transition-all text-slate-400 hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">Detektor</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[11px] text-cyan-400 font-bold uppercase tracking-widest">AI Engine Aktif</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setDetectedText(prev => prev.slice(0, -1))} className="p-3 rounded-2xl glass hover:neon-border-purple transition-all text-slate-400 hover:text-purple-400" title="Hapus 1 karakter">
            <RotateCcw size={18} />
          </button>
          <button onClick={() => setDetectedText(prev => prev + " ")} className="p-3 rounded-2xl glass hover:neon-border-emerald transition-all text-slate-400 hover:text-emerald-400" title="Spasi">
            <Space size={18} />
          </button>
          <button onClick={() => setDetectedText("")} className="flex items-center gap-2 px-5 py-3 rounded-2xl glass text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all">
            <Trash2 size={16} />
            <span className="text-sm font-bold hidden sm:inline">Hapus Semua</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Camera - 3 cols */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative rounded-[2rem] overflow-hidden bg-[#050810] aspect-video border border-white/5 shadow-2xl animate-glow-breathe">
            {/* Loading Overlay */}
            {isModelLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#050810]/95 backdrop-blur-md z-50">
                <div className="flex flex-col items-center max-w-xs text-center px-6">
                  <div className="relative w-20 h-20 mb-8">
                    <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
                    <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Sparkles size={24} className="text-cyan-400 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">Memuat Engine</h3>
                  <p className="text-sm font-bold text-cyan-400/80 tracking-widest uppercase">Sistem Siap...</p>
                </div>
              </div>
            )}

            {/* Webcam & Canvas */}
            <Webcam 
              ref={webcamRef} 
              className="absolute inset-0 w-full h-full object-cover" 
              mirrored 
              videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
            />
            <canvas ref={canvasRef} width={1280} height={720} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
            
            {/* Corner decorations */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-500/40 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-500/40 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-500/40 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-500/40 rounded-br-lg" />

            {/* Status Badge */}
            <div className="absolute top-6 left-6">
              <div className="px-5 py-2.5 rounded-2xl glass text-xs font-bold flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${currentLetter ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-600'}`} />
                <span className={currentLetter ? 'text-cyan-300' : 'text-slate-500'}>
                  {currentLetter ? `TERDETEKSI: ${currentLetter}` : 'MENCARI TANGAN...'}
                </span>
              </div>
            </div>

            {/* Current Letter Badge - hanya muncul setelah user merekam */}
            {hasRecordedOnce && currentLetter && (
              <div className="absolute bottom-6 right-6">
                <div className="w-auto min-w-[5rem] h-20 px-6 rounded-2xl glass neon-border flex items-center justify-center animate-letter-pop">
                  <span className="text-4xl font-black text-cyan-400">{currentLetter}</span>
                </div>
              </div>
            )}

            {/* Prompt sebelum rekaman pertama */}
            {!hasRecordedOnce && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                <div className="px-5 py-2.5 rounded-2xl glass border border-purple-500/30 text-center">
                  <p className="text-xs font-bold text-purple-300">Tahan tombol <span className="text-white">REKAM</span> untuk mulai</p>
                </div>
              </div>
            )}

            {/* Scan line overlay */}
            <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" style={{ animation: 'scan-line 4s linear infinite' }} />
          </div>
          
          {/* Progress Bar - hanya muncul setelah user merekam */}
          {hasRecordedOnce && currentLetter && (
            <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${(frameCount / FRAME_THRESHOLD) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Output Panel - 2 cols */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Main Output - hanya tampil setelah rekaman pertama */}
          {hasRecordedOnce ? (
          <div className="relative flex-1 p-8 rounded-[2rem] glass-strong overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 blur-3xl rounded-full pointer-events-none" />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10">
                    <MessageSquare size={16} className="text-cyan-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">Output</span>
                </div>
                {detectedText.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-3 py-1 rounded-lg">
                    {detectedText.length} chars
                  </span>
                )}
              </div>

              <div className="min-h-[200px] text-5xl md:text-6xl font-black font-mono break-all leading-[1.1] text-white">
                {detectedText || (
                  <div className="flex flex-col items-center justify-center h-[200px] text-slate-700">
                    <div className="w-14 h-14 rounded-2xl border border-dashed border-slate-800 flex items-center justify-center mb-4">
                      <Camera size={24} />
                    </div>
                    <p className="text-sm font-semibold">Menunggu isyarat...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          ) : (
          <div className="relative flex-1 p-8 rounded-[2rem] glass-strong overflow-hidden flex flex-col items-center justify-center text-center gap-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full pointer-events-none" />
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-purple-500/30 flex items-center justify-center mb-2">
              <PlayCircle size={28} className="text-purple-400" />
            </div>
            <p className="text-base font-bold text-slate-400">Output akan muncul di sini</p>
            <p className="text-xs text-slate-600 max-w-[200px] leading-relaxed">
              Arahkan tangan ke kamera, lalu tekan dan tahan tombol <span className="text-purple-400 font-bold">REKAM</span> untuk mulai merekam posisi tangan.
            </p>
          </div>
          )}

          {/* Tip Card */}
          <div className="p-5 rounded-2xl glass neon-border-purple">
            <div className="flex gap-4 items-start">
              <div className="p-2 rounded-xl bg-purple-500/10 shrink-0">
                <Info size={16} className="text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-300 mb-1">Tips Akurasi</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Gunakan satu tangan, pastikan pencahayaan cukup, dan jaga jarak 30-50cm dari kamera.
                </p>
              </div>
            </div>
          </div>

          {/* ML Studio / AI Training Card - Moved to TOP priority */}
          <div className="p-5 rounded-2xl glass border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] order-first relative z-40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20">
                  <Brain size={16} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Dashboard Pelatihan AI</p>
                  <p className="text-[10px] text-purple-300">Model: {mode === 'word' ? 'Custom Kata' : 'A-Z Huruf'}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer" title="Uji Coba AI Anda">
                <input type="checkbox" className="sr-only peer" checked={mlState.useMLMode} onChange={(e) => updateMlState({ useMLMode: e.target.checked })} />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </div>

            {!mlState.useMLMode ? (
              <div className="space-y-4 animate-fade-up">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative z-50">
                    <button 
                      onClick={() => updateMlState({ isDropdownOpen: !mlState.isDropdownOpen })}
                      className="flex items-center justify-between min-w-[110px] bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold rounded-lg px-3 py-2.5 border border-purple-500/30 hover:border-purple-500/60 transition-all shadow-[0_0_10px_rgba(168,85,247,0.1)]"
                    >
                      <span>Label: {mlState.trainingLetter}</span>
                      <ChevronRight size={14} className={`transform transition-transform ${mlState.isDropdownOpen ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {mlState.isDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[90]" onClick={() => updateMlState({ isDropdownOpen: false, isAddingCustom: false })} />
                        <div className="absolute top-full mt-2 left-0 w-48 bg-[#0f172a]/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-2xl shadow-purple-500/20 max-h-60 overflow-y-auto z-[100] py-2">
                          {mode === 'letter' && SIGN_DATA.map(s => (
                            <button
                              key={s.char}
                              onClick={() => updateMlState({ trainingLetter: s.char, isDropdownOpen: false, isAddingCustom: false })}
                              className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors ${
                                mlState.trainingLetter === s.char 
                                  ? 'bg-purple-500/20 text-purple-300' 
                                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              Label: {s.char}
                            </button>
                          ))}
                          
                          {mode === 'word' && Object.keys(mlState.sampleCounts).map(char => (
                            <button
                              key={char}
                              onClick={() => updateMlState({ trainingLetter: char, isDropdownOpen: false, isAddingCustom: false })}
                              className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors ${
                                mlState.trainingLetter === char 
                                  ? 'bg-purple-500/20 text-purple-300' 
                                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              Label: {char}
                            </button>
                          ))}
                          
                          <div className="border-t border-white/10 mt-1 pt-1 px-2">
                            {mode === 'word' && (
                              mlState.isAddingCustom ? (
                                <div className="flex flex-col gap-1">
                                  <input 
                                    type="text" 
                                    autoFocus
                                    className="w-full bg-slate-900 text-white text-[10px] rounded px-2 py-1.5 border border-purple-500/50 focus:outline-none"
                                    placeholder="Ketik kata (mis: TOLONG)..."
                                    value={mlState.newCustomValue}
                                    onChange={(e) => updateMlState({ newCustomValue: e.target.value.toUpperCase() })}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && mlState.newCustomValue.trim() !== '') {
                                        updateMlState({ 
                                          trainingLetter: mlState.newCustomValue.trim(), 
                                          isDropdownOpen: false, 
                                          isAddingCustom: false,
                                          newCustomValue: ''
                                        });
                                      }
                                    }}
                                  />
                                  <p className="text-[8px] text-slate-500 text-center">Tekan Enter untuk simpan</p>
                                </div>
                              ) : (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); updateMlState({ isAddingCustom: true }); }}
                                  className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 rounded transition-colors"
                                >
                                  <Plus size={12} /> Label Kata Baru
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <button 
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${mlState.isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.3)]'}`}
                    onMouseDown={() => { updateMlState({ isStudioMode: true, isRecording: true }); setHasRecordedOnce(true); }}
                    onMouseUp={() => { updateMlState({ isRecording: false }); updateSampleCounts(); mlEngine.saveDatasetToStorage(mode); }}
                    onMouseLeave={() => { updateMlState({ isRecording: false }); updateSampleCounts(); mlEngine.saveDatasetToStorage(mode); }}
                  >
                    {mlState.isRecording ? <StopCircle size={14} /> : <PlayCircle size={14} />}
                    {mlState.isRecording ? 'MEREKAM DATA...' : 'TAHAN UNTUK REKAM (KLIK)'}
                  </button>
                </div>
                <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-purple-500/20">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="bg-white/5 px-2 py-1 rounded">Total {mlState.trainingLetter}: <strong className="text-white text-xs">{mlState.sampleCounts[mlState.trainingLetter] || 0}</strong> baris</span>
                    <span className="text-purple-300">Kelas Tersimpan: {Object.keys(mlState.sampleCounts).length}</span>
                  </div>
                  <div className="flex items-center gap-2 w-full mt-2">
                    <button onClick={() => mlEngine.downloadDatasetCSV(mode)} className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-colors">📥 Export CSV</button>
                    <button onClick={handleExportDataset} className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold transition-colors">📥 Download Model (JSON)</button>
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <button onClick={() => { if(confirm("Hapus semua data yang dilatih?")) { mlEngine.clearAllData(mode); updateSampleCounts(); } }} className="w-1/3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-[10px] font-bold transition-colors">Hapus Semua</button>
                    <label className="w-2/3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded text-[10px] font-bold transition-colors text-center cursor-pointer flex items-center justify-center gap-2">
                      <Plus size={10} /> Import Model (.json)
                      <input type="file" accept=".json" className="hidden" onChange={handleImportDataset} />
                    </label>
                  </div>
                  <p className="text-[9px] text-slate-500 italic mt-1">*LocalStorage terbatas 5MB. Gunakan 'Download Model' untuk menyimpan permanen.</p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-center font-bold text-purple-200 p-3 bg-purple-500/20 rounded-xl border border-purple-500/30 animate-pulse">
                Uji Coba Model Aktif! 🚀 <br/><span className="text-[10px] font-normal">Sistem menebak berdasarkan data manual Anda.</span>
              </div>
            )}
          </div>

          {/* Quick Guide */}
          <div className="p-5 rounded-2xl glass">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Model Tersimpan</p>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(mlState.sampleCounts).length > 0 ? (
                Object.keys(mlState.sampleCounts).map(label => (
                  <div 
                    key={label} 
                    onClick={() => updateMlState({ trainingLetter: label })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentLetter === label ? 'bg-cyan-500/20 text-cyan-300 neon-border' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                  >
                    {label} <span className="ml-1 text-[8px] opacity-50">({mlState.sampleCounts[label]})</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 font-medium italic">Belum ada data yang dilatih. Mulai rekam untuk menambahkan.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ===================== MAIN LAYOUT =====================
  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 selection:bg-cyan-500/30 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute -top-[30%] -left-[15%] w-[60%] h-[60%] bg-cyan-500/[0.07] blur-[150px] rounded-full animate-float-slow" />
        <div className="absolute -bottom-[30%] -right-[15%] w-[60%] h-[60%] bg-purple-500/[0.07] blur-[150px] rounded-full animate-float-slow" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-emerald-500/[0.03] blur-[120px] rounded-full" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 px-6 md:px-10 py-5 flex justify-between items-center glass-strong border-b border-white/[0.03]">
        <button onClick={() => navigateTo('home')} className="flex items-center gap-3 group">
          <div className="relative w-12 h-12 rounded-2xl glass border border-white/10 flex items-center justify-center shadow-lg shadow-cyan-500/10 group-hover:shadow-cyan-500/30 transition-all overflow-hidden bg-white/5">
            <img src="/logo.png" alt="AlphaBrain Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <div>
            <span className="font-black text-xl tracking-tight text-white">Alpha<span className="text-gradient-cyan">Brain</span></span>
            <span className="ml-2 text-[9px] font-bold text-cyan-400 uppercase tracking-widest px-2 py-0.5 rounded-full border border-cyan-400/30">Training</span>
          </div>
        </button>
        
        <div className="flex items-center gap-2">
          <button onClick={() => navigateTo('home')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${currentPage === 'home' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            Beranda
          </button>
          <button onClick={() => navigateTo('guide')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${currentPage === 'guide' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            Panduan Library
          </button>
          <button onClick={() => navigateTo('example')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${currentPage === 'example' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            Contoh & Info
          </button>
          <div className="flex gap-1 ml-2 bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50 shadow-inner">
            <button 
              onClick={() => { navigateTo('detector-letter'); updateMlState({ activeMode: 'letter', trainingLetter: 'A' }); updateSampleCounts('letter'); }} 
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${currentPage === 'detector-letter' ? 'bg-gradient-to-r from-purple-500 to-cyan-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              Studio Huruf
            </button>
            <button 
              onClick={() => { navigateTo('detector-word'); updateMlState({ activeMode: 'word', trainingLetter: 'KATA_1' }); updateSampleCounts('word'); }} 
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${currentPage === 'detector-word' ? 'bg-gradient-to-r from-cyan-500 to-emerald-600 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              Studio Kata
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      {/* PENTING: Semua halaman dipanggil sebagai fungsi biasa, bukan JSX komponen.
          Ini mencegah React unmount+remount Webcam setiap kali App re-render (tiap frame). */}
      <main className="relative z-10 max-w-7xl mx-auto py-10 px-6">
        {currentPage === 'home' && LandingPage()}
        {currentPage === 'guide' && GuidePage()}
        {currentPage === 'example' && ExamplePage()}
        {currentPage === 'detector-letter' && DetectorPage({ mode: 'letter' })}
        {currentPage === 'detector-word' && DetectorPage({ mode: 'word' })}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-10 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg glass border border-white/5 flex items-center justify-center overflow-hidden">
               <img src="/logo.png" alt="AlphaBrain" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm text-slate-600 font-semibold">AlphaBrain &copy; 2026</span>
          </div>
          <p className="text-xs text-slate-700">Inovasi Tanpa Batas &mdash; Komunikasi untuk Semua</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
