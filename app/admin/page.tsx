"use client";

import { useState, useEffect, useRef } from "react";
import { collection, doc, addDoc, setDoc, increment, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { PlusCircle, Loader2, RefreshCw, Target, PlayCircle, Settings, Lock, Radio } from "lucide-react";

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

export default function AdminPage() {
  // Oturum (Auth) State'leri
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const sessionPasswordRef = useRef("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("adminAuth");
      const pass = sessionStorage.getItem("adminPassword");
      if (auth === "true" && pass) {
        setIsLoggedIn(true);
        setSessionPassword(pass);
        sessionPasswordRef.current = pass;
      }
    }
  }, []);

  // Bağış Formu State'leri
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    amount: "",
    currency: "TL",
  });

  // Firestore'dan gelecek dinamik ayarlar
  const [settings, setSettings] = useState({ leafPrice: 15, targetLeaves: 100000, adminPassword: "Cinar2026" });
  const [formSettings, setFormSettings] = useState({ leafPrice: "15", targetLeaves: "100000" });
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "stats", "totalAmount"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const lp = data.leafPrice || 15;
        const tl = data.targetLeaves || 100000;
        const ap = data.adminPassword || "Cinar2026";
        setIsLive(data.isLive || false);
        setSettings({ leafPrice: lp, targetLeaves: tl, adminPassword: ap });
        
        if (isFirstLoad.current) {
          setFormSettings({ leafPrice: lp.toString(), targetLeaves: tl.toString() });
          isFirstLoad.current = false;
        }

        // Canlı Takip & Dışarı Atma (Auto Logout)
        if (sessionPasswordRef.current && sessionPasswordRef.current !== ap) {
          setIsLoggedIn(false);
          setSessionPassword("");
          sessionPasswordRef.current = "";
          sessionStorage.removeItem("adminAuth");
          sessionStorage.removeItem("adminPassword");
          setLoginError("Güvenlik nedeniyle oturumunuz sonlandırıldı, lütfen yeni şifreyle giriş yapın.");
        }
      }
    });
    return () => unsub();
  }, []);

  // Kampanya Ayarları Güncelleme State'leri
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [isLive, setIsLive] = useState(false);

  // Genel Durum Güncelleme (Eşitleme) State'leri
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncData, setSyncData] = useState({
    amount: "",
    type: "TL",
  });

  // Yayın Hedefi Güncelleme State'leri
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const [sessionTarget, setSessionTarget] = useState("");

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncLoading(true);
    setSyncMessage("");

    try {
      const amountVal = parseFloat(syncData.amount);
      if (isNaN(amountVal) || amountVal < 0) {
        throw new Error("Lütfen geçerli bir değer girin.");
      }

      let totalTl = 0;
      let totalLeaves = 0;

      if (syncData.type === "TL") {
        totalTl = amountVal;
        totalLeaves = Math.floor(totalTl / settings.leafPrice);
      } else {
        totalLeaves = amountVal;
        totalTl = totalLeaves * settings.leafPrice;
      }

      const statsDocRef = doc(db, "stats", "totalAmount");
      await setDoc(statsDocRef, {
        totalLeaves: totalLeaves,
        totalTl: totalTl,
        lastUpdate: serverTimestamp()
      }, { merge: true }); // Merge true yaparak session vb değerleri silmez

      setSyncMessage(`Başarılı! Güncel durum ${totalLeaves.toLocaleString('tr-TR')} Yaprak (${totalTl.toLocaleString('tr-TR')} TL) olarak eşitlendi.`);
      setSyncData({ amount: "", type: "TL" });
    } catch (error: any) {
      setSyncMessage(error.message || "Bir hata oluştu.");
    } finally {
      setIsSyncLoading(false);
    }
  };

  const handleToggleLive = async () => {
    try {
      const statsDocRef = doc(db, "stats", "totalAmount");
      await setDoc(statsDocRef, { isLive: !isLive }, { merge: true });
    } catch (error: any) {
      alert("Yayın durumu güncellenirken hata oluştu: " + error.message);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === settings.adminPassword) {
      setIsLoggedIn(true);
      setSessionPassword(passwordInput);
      sessionPasswordRef.current = passwordInput;
      sessionStorage.setItem("adminAuth", "true");
      sessionStorage.setItem("adminPassword", passwordInput);
      setLoginError("");
    } else {
      setLoginError("Hatalı şifre, lütfen tekrar deneyin.");
      setPasswordInput("");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-zinc-100 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-zinc-100 text-zinc-600 rounded-full mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">Yönetici Girişi</h1>
            <p className="text-sm text-zinc-500 mt-2 text-center">Paneli görüntülemek için lütfen şifrenizi girin.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <input
                required
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full text-center text-zinc-900 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900/50 tracking-widest"
                placeholder="••••••••"
              />
            </div>
            
            {loginError && (
              <div className="text-sm p-3 rounded-xl font-medium bg-red-50 text-red-600 text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white py-3.5 rounded-xl font-semibold hover:bg-zinc-800 transition-colors"
            >
              <span>Giriş Yap</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSessionLoading(true);
    setSessionMessage("");

    try {
      const targetVal = parseFloat(sessionTarget);
      if (isNaN(targetVal) || targetVal <= 0) {
        throw new Error("Lütfen geçerli bir hedef girin.");
      }

      const statsDocRef = doc(db, "stats", "totalAmount");
      await setDoc(statsDocRef, {
        sessionTarget: targetVal
      }, { merge: true });

      setSessionMessage(`Başarılı! Yayın hedefi ${targetVal.toLocaleString('tr-TR')} Yaprak olarak güncellendi.`);
      setSessionTarget("");
    } catch (error: any) {
      setSessionMessage(error.message || "Bir hata oluştu.");
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingsLoading(true);
    setSettingsMessage("");

    try {
      const lpVal = parseFloat(formSettings.leafPrice);
      const tlVal = parseFloat(formSettings.targetLeaves);
      if (isNaN(lpVal) || lpVal <= 0 || isNaN(tlVal) || tlVal <= 0) {
        throw new Error("Lütfen geçerli değerler girin.");
      }

      const statsDocRef = doc(db, "stats", "totalAmount");
      await setDoc(statsDocRef, { leafPrice: lpVal, targetLeaves: tlVal }, { merge: true });

      setSettingsMessage("Ayarlar başarıyla güncellendi!");
    } catch (error: any) {
      setSettingsMessage(error.message || "Bir hata oluştu.");
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const handleSessionReset = async () => {
    if (!confirm("Bu yayında toplanan yaprakları sıfırlayıp yeni bir yayın başlatmak istediğinize emin misiniz? (Genel toplam etkilenmeyecek)")) return;
    try {
      const statsDocRef = doc(db, "stats", "totalAmount");
      await setDoc(statsDocRef, { sessionLeaves: 0 }, { merge: true });
      alert("Yayın başarıyla sıfırlandı!");
    } catch (error: any) {
      alert("Sıfırlama sırasında hata oluştu: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const amountVal = parseFloat(formData.amount);
      if (isNaN(amountVal) || amountVal <= 0) {
        throw new Error("Lütfen geçerli bir tutar girin.");
      }

      // Döviz kuru çekimi (Canlı API)
      let rate = 1;
      if (formData.currency !== "TL") {
        try {
          const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${formData.currency}`);
          if (!res.ok) throw new Error("API Hatası");
          const data = await res.json();
          rate = data.rates.TRY;
        } catch (err) {
          throw new Error("Güncel döviz kurları alınamadı, lütfen daha sonra tekrar deneyin.");
        }
      }

      // Hesaplama: Tutar * Canlı Kur = Toplam TL -> Toplam TL / 15 = Yaprak
      const totalTl = amountVal * rate;
      const leaves = Math.floor(totalTl / settings.leafPrice);

      if (leaves <= 0) {
        throw new Error("Tutar, en az 1 Çınar Yaprağı edecek kadar olmalıdır.");
      }

      // 1. Yeni bağışı koleksiyona ekle (Liste ve Toast için)
      await addDoc(collection(db, "donations"), {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        originalAmount: amountVal,
        currency: formData.currency,
        totalTl: totalTl,
        leaves: leaves,
        createdAt: serverTimestamp(),
      });

      // 2. Dashboard'un okuyabilmesi için Toplam sayacı ve Yayın sayacını artır (Increment)
      const statsDocRef = doc(db, "stats", "totalAmount");
      await setDoc(statsDocRef, {
        totalLeaves: increment(leaves),
        totalTl: increment(totalTl),
        sessionLeaves: increment(leaves),
        lastUpdate: serverTimestamp()
      }, { merge: true });

      setMessage(`Başarılı! ${leaves} adet Çınar Yaprağı eklendi.`);
      setFormData({ firstName: "", lastName: "", amount: "", currency: "TL" });
    } catch (error: any) {
      setMessage(error.message || "Bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center py-8 sm:py-12 px-4 font-sans">
      
      {/* YAYIN DURUMU KARTI */}
      <div className="w-full max-w-5xl mb-6 sm:mb-8 bg-white rounded-3xl shadow-sm border border-zinc-100 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold text-zinc-900 flex items-center justify-center sm:justify-start gap-2">
            <Radio className={`w-6 h-6 ${isLive ? "text-red-500 animate-pulse" : "text-zinc-400"}`} />
            Yayın Durumu
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Şu anki izleyiciler {isLive ? "canlı yayın ekranını" : "bekleme ekranını"} görüyor.</p>
        </div>
        <button
          onClick={handleToggleLive}
          className={`relative w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
            isLive
              ? "bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:bg-red-600"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          {isLive ? <span className="animate-pulse">🔴 YAYINDA</span> : "⚫ YAYIN KAPALI"}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 w-full max-w-5xl items-start">
        
        {/* Sol Sütun: Yeni Bağış Paneli */}
        <div className="flex-1 w-full bg-white rounded-3xl shadow-sm border border-zinc-100 p-6 sm:p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-[#4CAF50]/10 text-[#4CAF50] rounded-full mb-4">
              <SycamoreLeaf index="admin-header" fillPercentage={100} className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">Yönetim Paneli</h1>
            <p className="text-sm text-zinc-500 mt-1">Yeni bağış ekleyin (1 Yaprak = {settings.leafPrice} TL)</p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Ad</label>
              <input
                required
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full text-zinc-900 border border-zinc-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/50"
                placeholder="Örn: Ali"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Soyad</label>
              <input
                required
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full text-zinc-900 border border-zinc-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/50"
                placeholder="Örn: Yılmaz"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium text-zinc-700">Bağış Tutarı</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full text-zinc-900 border border-zinc-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/50"
                placeholder="1000"
              />
            </div>
            <div className="space-y-1 sm:col-span-1">
              <label className="text-sm font-medium text-zinc-700">Birim</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full text-zinc-900 border border-zinc-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/50"
              >
                <option value="TL">TL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {message && (
            <div className={`text-sm p-3 rounded-xl font-medium ${message.includes("Başarılı") ? "bg-[#4CAF50]/10 text-[#4CAF50]" : "bg-red-50 text-red-600"}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#4CAF50] text-white py-3 rounded-xl font-semibold hover:bg-[#3d8c40] transition-colors disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />}
            <span>{isLoading ? "Kaydediliyor..." : "Bağışı Kaydet"}</span>
          </button>
        </form>
        </div>

        {/* Sağ Sütun: Ayarlar (Yayın ve Genel) */}
        <div className="flex-1 w-full flex flex-col gap-6 sm:gap-8">
          
          {/* 0. Kampanya Genel Ayarları */}
          <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 p-6 sm:p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="p-3 bg-orange-50 text-orange-500 rounded-full mb-4">
                <Settings className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900">Kampanya Genel Ayarları</h2>
              <p className="text-sm text-zinc-500 mt-1 text-center">Yaprak fiyatını ve genel hedefi belirleyin.</p>
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">1 Yaprak Kaç TL?</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formSettings.leafPrice}
                    onChange={(e) => setFormSettings({ ...formSettings, leafPrice: e.target.value })}
                    className="w-full text-zinc-900 border border-zinc-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Genel Hedef (Yaprak)</label>
                  <input
                    required
                    type="number"
                    value={formSettings.targetLeaves}
                    onChange={(e) => setFormSettings({ ...formSettings, targetLeaves: e.target.value })}
                    className="w-full text-zinc-900 border border-zinc-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
              </div>

              {settingsMessage && (
                <div className={`text-sm p-3 rounded-xl font-medium ${settingsMessage.includes("başarı") ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"}`}>
                  {settingsMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSettingsLoading}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-70"
              >
                {isSettingsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings className="w-5 h-5" />}
                <span>{isSettingsLoading ? "Güncelleniyor..." : "Ayarları Güncelle"}</span>
              </button>
            </form>
          </div>
          
          {/* 1. Yayın Ayarları */}
          <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 p-6 sm:p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="p-3 bg-purple-50 text-purple-500 rounded-full mb-4">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900">Yayın Ayarları</h2>
              <p className="text-sm text-zinc-500 mt-1 text-center">Bu yayın için hedef belirleyin ve sayacı sıfırlayın.</p>
            </div>

            <form onSubmit={handleSessionSubmit} className="space-y-4 mb-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Bu Yayındaki Hedef (Yaprak)</label>
                <input
                  required
                  type="number"
                  value={sessionTarget}
                  onChange={(e) => setSessionTarget(e.target.value)}
                  className="w-full text-zinc-900 border border-zinc-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="Örn: 10000"
                />
              </div>

              {sessionMessage && (
                <div className={`text-sm p-3 rounded-xl font-medium ${sessionMessage.includes("Başarılı") ? "bg-purple-50 text-purple-600" : "bg-red-50 text-red-600"}`}>
                  {sessionMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSessionLoading}
                className="w-full flex items-center justify-center gap-2 bg-purple-500 text-white py-3 rounded-xl font-semibold hover:bg-purple-600 transition-colors disabled:opacity-70"
              >
                {isSessionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
                <span>{isSessionLoading ? "Güncelleniyor..." : "Hedefi Güncelle"}</span>
              </button>
            </form>

            <button
              type="button"
              onClick={handleSessionReset}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white py-3 rounded-xl font-semibold hover:bg-zinc-800 transition-colors"
            >
              <PlayCircle className="w-5 h-5" />
              <span>Yayın Başlat / Sıfırla</span>
            </button>
          </div>

          {/* 2. Sync Panel (Genel Durumu Güncelleme) */}
          <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 p-6 sm:p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-full mb-4">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900">Genel Durumu Güncelle</h2>
              <p className="text-sm text-zinc-500 mt-1 text-center">Dışarıdaki bağışları eşitlemek için tutarı ezerek (merge) günceller.</p>
            </div>
            
            <form onSubmit={handleSyncSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium text-zinc-700">Toplam</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={syncData.amount}
                    onChange={(e) => setSyncData({ ...syncData, amount: e.target.value })}
                    className="w-full text-zinc-900 border border-zinc-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Örn: 15000"
                  />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-sm font-medium text-zinc-700">Birim</label>
                  <select
                    value={syncData.type}
                    onChange={(e) => setSyncData({ ...syncData, type: e.target.value })}
                    className="w-full text-zinc-900 border border-zinc-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="TL">TL</option>
                    <option value="LEAVES">Yaprak</option>
                  </select>
                </div>
              </div>

              {syncMessage && (
                <div className={`text-sm p-3 rounded-xl font-medium ${syncMessage.includes("Başarılı") ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}>
                  {syncMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSyncLoading}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-70"
              >
                {isSyncLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                <span>{isSyncLoading ? "Güncelleniyor..." : "Durumu Eşitle"}</span>
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}