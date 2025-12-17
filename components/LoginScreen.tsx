import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, ShieldCheck, QrCode } from 'lucide-react';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { loadAuthSecret, saveAuthSecret } from '../services/storageService';

interface LoginScreenProps {
  onLogin: (password: string) => void;
  onBack: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onBack }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Setup State
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [storedSecret, setStoredSecret] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const secret = await loadAuthSecret();
      if (secret) {
        setStoredSecret(secret);
        setIsSetupMode(false);
      } else {
        // Generate new secret for setup
        const newSecret = new OTPAuth.Secret({ size: 20 });
        const secretStr = newSecret.base32;
        setGeneratedSecret(secretStr);
        
        const totp = new OTPAuth.TOTP({
          issuer: "OP_CAT_Layer",
          label: "Admin",
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: newSecret
        });
        
        const uri = totp.toString();
        try {
          const url = await QRCode.toDataURL(uri);
          setQrCodeUrl(url);
        } catch (err) {
          console.error(err);
        }
        setIsSetupMode(true);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length < 6) return;

    // Use either the newly generated secret (if setting up) or the stored one
    const currentSecret = isSetupMode ? generatedSecret : storedSecret;

    if (!currentSecret) return;

    const totp = new OTPAuth.TOTP({
      issuer: "OP_CAT_Layer",
      label: "Admin",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(currentSecret)
    });

    // Validate token with a window of 1 (allows +/- 30 seconds drift)
    const delta = totp.validate({ token, window: 1 });

    if (delta !== null) {
      if (isSetupMode) {
        // Save the confirmed secret
        await saveAuthSecret(generatedSecret);
        alert("Setup Complete! You are now logged in.");
      }
      onLogin('totp-verified');
    } else {
      setError(true);
      setToken('');
      setTimeout(() => setError(false), 2000);
    }
  };

  if (loading) {
     return <div className="min-h-[80vh] flex items-center justify-center text-[#f0b90b]">Loading Security Module...</div>;
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#1e2329] border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#f0b90b] opacity-5 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
        
        <div className="text-center mb-6 relative z-10">
          <div className="w-16 h-16 bg-black border-2 border-[#f0b90b] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(240,185,11,0.3)]">
            {isSetupMode ? <QrCode className="text-[#f0b90b]" size={32} /> : <ShieldCheck className="text-[#f0b90b]" size={32} />}
          </div>
          <h1 className="text-2xl font-bold text-white brand-font tracking-wider">MISSION CONTROL</h1>
          <p className="text-gray-500 text-sm mt-2">
            {isSetupMode ? "Setup 2FA Authenticator" : "Enter Authenticator Code"}
          </p>
        </div>

        {isSetupMode && (
           <div className="mb-6 bg-white p-4 rounded-xl flex flex-col items-center">
              <p className="text-black text-xs font-bold mb-2 text-center w-full">1. Scan with Google Authenticator</p>
              {qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 mix-blend-multiply" /> : <div className="w-40 h-40 bg-gray-200 animate-pulse"></div>}
              <div className="mt-4 w-full bg-gray-100 p-2 rounded border border-gray-300">
                 <p className="text-[10px] text-gray-500 text-center uppercase tracking-wider mb-1">Manual Key</p>
                 <p className="text-xs text-black font-mono text-center break-all select-all">{generatedSecret}</p>
              </div>
           </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6 relative z-10">
          <div>
            {isSetupMode && <p className="text-gray-400 text-xs mb-2 text-center">2. Enter the 6-digit code to confirm:</p>}
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="000 000"
              className={`w-full bg-[#0b0e11] border ${error ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-3 text-white text-center tracking-[0.5em] text-xl font-mono focus:border-[#f0b90b] focus:outline-none transition-all placeholder-gray-700`}
              autoFocus
            />
            {error && <p className="text-red-500 text-xs text-center mt-2 animate-bounce">Invalid Code. Try again.</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-[#f0b90b] text-black font-bold py-3 rounded-xl hover:bg-[#d9a506] transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            {isSetupMode ? 'Verify & Save' : 'Authenticate'} <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm underline">
            Return to Public Site
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;