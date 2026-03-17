"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, onSnapshot, orderBy, limit, doc } from "firebase/firestore";
import { db } from "./../lib/firebase"; 
import { motion, AnimatePresence, animate } from "framer-motion";
import QRCode from "react-qr-code";
import { Instagram } from "lucide-react";

function maskString(str: string) {
  if (!str) return "";
  return str.length > 2 ? str.substring(0, 2) + "*****" : str + "*****";
}

// Özel 5 Loblu Çınar Yaprağı (Maple/Plane formunda SVG)
const SycamoreLeaf = ({
  fillPercentage = 100,
  index = "default",
  className,
  style
}: {
  fillPercentage?: number;
  index?: string | number;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const gradientId = `leaf-gradient-${index}`;
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset={`${fillPercentage}%`} stopColor="#4CAF50" />
          <stop offset={`${fillPercentage}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M 48 100 L 52 100 L 51 85 L 75 90 L 70 70 L 95 55 L 75 40 L 90 20 L 60 25 L 50 0 L 40 25 L 10 20 L 25 40 L 5 55 L 30 70 L 25 90 L 49 85 Z"
        fill={`url(#${gradientId})`}
        stroke="#e4e4e7" // zinc-200
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default function Dashboard() {
  const [totalLeaves, setTotalLeaves] = useState(0);
  const [sessionLeaves, setSessionLeaves] = useState(0);
  const [sessionTarget, setSessionTarget] = useState(10000);
  const [targetLeaves, setTargetLeaves] = useState(100000);
  const [totalTl, setTotalTl] = useState(0);
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [recentDonation, setRecentDonation] = useState<any>(null);
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const displayPercentageRef = useRef(0);
  const [radius, setRadius] = useState(120);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const unsubStats = onSnapshot(doc(db, "stats", "totalAmount"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTotalLeaves(data.totalLeaves || 0);
        setSessionLeaves(data.sessionLeaves || 0);
        setSessionTarget(data.sessionTarget || 10000);
        setTotalTl(data.totalTl || 0);
        setIsLive(data.isLive ?? false);
        setTargetLeaves(data.targetLeaves || 100000);
        setLastUpdate(data.lastUpdate ? data.lastUpdate.toDate() : null);
      }
    });

    const q = query(collection(db, "donations"), orderBy("createdAt", "desc"), limit(1));
    const unsubDonations = onSnapshot(q, (snapshot) => {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        return;
      }
      const addedDocs = snapshot.docChanges().filter(change => change.type === "added");
      if (addedDocs.length > 0) {
        setRecentDonation(addedDocs[0].doc.data());
        setTimeout(() => setRecentDonation(null), 5000);
      }
    });

    return () => {
      unsubStats();
      unsubDonations();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      // Mobil cihazlarda çemberin ekrana sığması için dinamik yarıçap (max 120px)
      setRadius(Math.min(window.innerWidth * 0.35, 120));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalPercentage = targetLeaves > 0 ? Math.min(100, (totalLeaves / targetLeaves) * 100) : 0;
  const sessionPercentage = sessionTarget > 0 ? Math.min(100, (sessionLeaves / sessionTarget) * 100) : 0;

  // Framer Motion ile yüzde değerini akıcı bir şekilde anime ediyoruz.
  useEffect(() => {
    const controls = animate(displayPercentageRef.current, sessionPercentage, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (val) => {
        displayPercentageRef.current = val;
        setDisplayPercentage(val);
      }
    });
    return controls.stop;
  }, [sessionPercentage]);

  const renderCircularLeaves = () => {
    const leaves = [];
    
    for (let i = 0; i < 10; i++) {
      const leafStart = i * 10;
      const leafEnd = (i + 1) * 10;
      let fillPercentage = 0;

      // Bu yaprağın doluluk oranını (%0 - %100 arası) hesaplıyoruz
      if (displayPercentage >= leafEnd) {
        fillPercentage = 100;
      } else if (displayPercentage > leafStart) {
        fillPercentage = ((displayPercentage - leafStart) / 10) * 100;
      }

      const angle = (i * 36 - 90) * (Math.PI / 180);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const rotation = i * 36; // Yaprak tepesi dışa bakacak şekilde döndürülüyor

      leaves.push(
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0, x: x, y: y, rotate: rotation }}
          animate={{ scale: 1, opacity: 1, x: x, y: y, rotate: rotation }}
          transition={{ delay: i * 0.05 }}
          className="absolute w-12 h-12 sm:w-16 sm:h-16 -ml-6 -mt-6 sm:-ml-8 sm:-mt-8"
          style={{
            left: '50%',
            top: '50%',
          }}
        >
          <SycamoreLeaf index={i} fillPercentage={fillPercentage} className="w-full h-full drop-shadow-sm" />
        </motion.div>
      );
    }
    return leaves;
  };

  // İlk veri yüklenene kadar gösterilecek loader
  if (isLive === null) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4CAF50] border-t-transparent"></div>
      </div>
    );
  }

  const formattedDate = lastUpdate
    ? `${lastUpdate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })} tarihi ${lastUpdate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} saatinde güncellenmiştir.`
    : "Güncelleniyor...";

  // BEKLEME MODU (Standby Screen)
  if (!isLive) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center py-6 sm:py-12 px-4 font-sans relative overflow-hidden">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-sm border border-zinc-100 p-8 sm:p-12 flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center p-4 bg-[#4CAF50]/10 rounded-full mb-6">
            <SycamoreLeaf index="standby-header" fillPercentage={100} className="w-12 h-12 text-[#4CAF50]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 mb-4 tracking-tight">Çınar'ın Mücadelesi Devam Ediyor</h1>
          <p className="text-lg text-zinc-600 mb-8 max-w-lg">
            Kampanyamız T.C. Valilik İzni ile yürütülmektedir. Tüm detaylara, belgelere ve bağış kanallarına QR kodu okutarak veya yanındaki butona tıklayarak ulaşabilirsiniz.
          </p>

          <div className="bg-[#4CAF50]/5 border border-[#4CAF50]/20 rounded-2xl p-6 mb-8 w-full max-w-md relative overflow-hidden">
            <span className="block text-sm font-semibold text-[#4CAF50] mb-1">Şimdiye Kadar Toplanan Bağışlar</span>
            <span className="block text-4xl font-black text-zinc-900 mb-2">{totalLeaves.toLocaleString('tr-TR')} Çınar Yaprağı</span>
            <span className="block text-xs font-medium text-zinc-500 mb-5">{formattedDate}</span>
            
            {/* İlerleme Çubuğu */}
            <div className="w-full h-8 bg-black/5 rounded-full overflow-hidden relative border border-black/5 shadow-inner">
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#4CAF50] z-0">
                %{totalPercentage.toFixed(2)}
              </div>
              <motion.div
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: `inset(0 ${100 - totalPercentage}% 0 0)` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute inset-0 bg-[#4CAF50] flex items-center justify-center text-sm font-bold text-white z-10 shadow-[2px_0_10px_rgba(0,0,0,0.1)]"
              >
                %{totalPercentage.toFixed(2)}
              </motion.div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-md items-center mt-2">
            <a href="https://cinarkaya.taplink.bio/?utm_source=ig&utm_medium=social&utm_content=link_in_bio" target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center bg-white p-4 sm:p-5 rounded-3xl border border-zinc-100 shadow-sm aspect-square hover:scale-105 transition-transform">
              <QRCode value="https://cinarkaya.taplink.bio/?utm_source=ig&utm_medium=social&utm_content=link_in_bio" size={120} level="H" className="w-full h-auto" />
              <span className="text-[10px] sm:text-xs font-bold text-zinc-500 mt-3 uppercase tracking-wider text-center">Okut veya Tıkla</span>
            </a>
            <a href="https://www.instagram.com/cinaricintekyurek" target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] p-4 sm:p-5 rounded-3xl shadow-sm aspect-square hover:scale-105 transition-transform">
              <Instagram className="w-14 h-14 sm:w-16 sm:h-16 text-white mb-2 sm:mb-3" strokeWidth={1.5} />
              <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider text-center">Instagram'a Git</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // CANLI YAYIN MODU
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-6 sm:py-12 px-4 font-sans relative overflow-hidden">
      
      {/* YAYINA GERİ DÖN BUTONU */}
      <motion.a
        href="https://www.instagram.com/cinaricintekyurek/"
        target="_blank"
        rel="noreferrer"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="mb-4 sm:mb-8 flex items-center justify-center gap-2 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white px-8 py-2.5 sm:py-3 rounded-full shadow-[0_0_20px_rgba(220,39,67,0.3)] font-bold text-sm sm:text-base z-20 min-h-[44px] hover:brightness-110"
      >
        <Instagram className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
        <span className="tracking-wide">YAYINA GERİ DÖN</span>
      </motion.a>

      <div className="text-center mb-6 sm:mb-8 max-w-xl w-full">
        <div className="inline-flex items-center justify-center p-3 bg-[#4CAF50]/10 rounded-full mb-4">
          <SycamoreLeaf index="header" fillPercentage={100} className="w-8 h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-2 tracking-tight">Çınar İçin Tek Yürek</h1>
        <p className="text-zinc-500 mb-6">SMA değil, Çınar kazanacak!</p>
        
        <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-100 mb-6">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-medium text-zinc-400">Genel Toplanan</span>
            <span className="text-lg sm:text-2xl font-bold text-[#4CAF50]">{totalLeaves.toLocaleString('tr-TR')}</span>
          </div>
          <div className="flex flex-col border-x border-zinc-100">
            <span className="text-xs sm:text-sm font-medium text-zinc-400">Genel Hedef</span>
            <span className="text-lg sm:text-2xl font-bold text-zinc-800">{targetLeaves.toLocaleString('tr-TR')}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-medium text-zinc-400">Yüzde</span>
            <span className="text-lg sm:text-2xl font-bold text-[#4CAF50]">%{totalPercentage.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-zinc-100 mb-12 flex flex-col items-center max-w-xl w-full">
        <h2 className="text-lg sm:text-xl font-semibold text-zinc-800 mb-2">Bu Yayındaki Hedefimiz</h2>
        <p className="text-xl sm:text-2xl font-bold text-[#4CAF50] mb-8">{sessionTarget.toLocaleString('tr-TR')} Çınar Yaprağı</p>

        <div className="relative w-[80vw] h-[80vw] max-w-[360px] max-h-[360px] flex items-center justify-center my-6">
          {renderCircularLeaves()}
          
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
            <span className="text-4xl sm:text-5xl font-black text-[#4CAF50] drop-shadow-sm mb-1">%{Math.floor(displayPercentage)}</span>
            <span className="text-xs sm:text-sm font-bold text-zinc-500">{sessionLeaves.toLocaleString('tr-TR')} / {sessionTarget.toLocaleString('tr-TR')}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {recentDonation && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white px-6 py-4 rounded-full shadow-xl border border-[#4CAF50]/30 text-zinc-800 font-medium flex items-center gap-3 z-50 whitespace-nowrap">
            <SycamoreLeaf index="toast" fillPercentage={100} className="w-5 h-5 animate-pulse" />
            <span><strong className="text-[#4CAF50]">{maskString(recentDonation.firstName)} {maskString(recentDonation.lastName)}</strong> &gt;&gt; {recentDonation.leaves} Çınar Yaprağı bağışladı!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}