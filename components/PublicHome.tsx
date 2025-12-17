import React from 'react';
import { PublishedReport } from '../types';
import { ArrowRight, Link, FileCode, Coins, Cpu, ChevronRight, Github, Twitter, Disc, Globe, Send } from 'lucide-react';

interface PublicHomeProps {
  publishedReports: PublishedReport[];
  onViewReport: (report: PublishedReport) => void;
  onLoginClick: () => void;
  brandLogo?: string;
}

const PublicHome: React.FC<PublicHomeProps> = ({ publishedReports, onViewReport, onLoginClick, brandLogo }) => {
  return (
    <div className="w-full animate-fade-in flex flex-col min-h-[calc(100vh-64px)] bg-black text-white selection:bg-[#F7931A] selection:text-black font-sans">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[40%] bg-purple-900/20 rounded-full blur-[150px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-20 px-4 md:pt-32 md:pb-32 overflow-hidden flex flex-col items-center text-center max-w-6xl mx-auto">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] mb-8 text-white">
          Unleashing Bitcoin's<br />
          <span className="text-[#F7931A]">Full Potential</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-3xl mb-10 leading-relaxed font-light">
          The first high-performance, Bitcoin-native Execution Layer with real smart contracts, <br className="hidden md:block"/>
          trustless bridging, and OP_CAT-based token standards. 
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <a href="https://docs.opcatlabs.io/overview" target="_blank" rel="noreferrer" className="px-8 py-4 bg-[#F7931A] hover:bg-[#ffaa40] text-black font-bold text-lg rounded-lg transition-all flex items-center justify-center gap-2">
             Start Building
          </a>
          <a href="https://github.com/sCrypt-Inc/awesome-op-cat" target="_blank" rel="noreferrer" className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-lg rounded-lg transition-all flex items-center justify-center gap-2">
             Read More
          </a>
        </div>
      </section>

      {/* Features - Core Value Props */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-8 rounded-2xl bg-[#0b0b0b] border border-white/10 hover:border-[#F7931A]/30 transition-colors">
            <Link className="text-[#F7931A] mb-6" size={32} />
            <h3 className="text-lg font-bold text-white mb-3">100% Trustless BTC Bridge</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              A SPV-verified, permissionless BTC bridge. No custodians, no federation required.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-[#0b0b0b] border border-white/10 hover:border-[#F7931A]/30 transition-colors">
            <FileCode className="text-[#F7931A] mb-6" size={32} />
            <h3 className="text-lg font-bold text-white mb-3">High-Level Smart Contracts</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              TypeScript-based, sCrypt-powered, dev-friendly smart contract language, yet native to UTXO logic.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-[#0b0b0b] border border-white/10 hover:border-[#F7931A]/30 transition-colors">
            <Cpu className="text-[#F7931A] mb-6" size={32} />
            <h3 className="text-lg font-bold text-white mb-3">OP_CAT VM</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              A re-engineered Bitcoin engine with restored opcodes, big int support, and parallelism. Built for scalability.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-[#0b0b0b] border border-white/10 hover:border-[#F7931A]/30 transition-colors">
            <Coins className="text-[#F7931A] mb-6" size={32} />
            <h3 className="text-lg font-bold text-white mb-3">OP_CAT Token Protocol</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              First smart contract-enforced tokens, miner-validated, no indexer needed
            </p>
          </div>
        </div>
      </section>

      {/* Updates / Reports Section */}
      <section className="relative z-10 border-t border-white/10 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="flex justify-between items-end mb-12">
             <h2 className="text-3xl font-bold text-white">Ecosystem Updates</h2>
          </div>
          {publishedReports.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-xl">
               <p className="text-gray-500">No public updates available at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {publishedReports.map((report) => (
                <article 
                  key={report.id} 
                  onClick={() => onViewReport(report)}
                  className="group bg-[#0b0b0b] rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all cursor-pointer flex flex-col h-full"
                >
                  {/* CHANGED HEIGHT HERE FROM h-48 TO h-80 (320px) */}
                  <div className="h-80 bg-gray-900 relative overflow-hidden">
                    {report.coverImage ? (
                      <img src={report.coverImage} alt="Cover" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#111]">
                         <div className="text-2xl font-bold text-gray-700">OP_CAT</div>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
                       {new Date(report.publishDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-lg font-bold text-white mb-3 group-hover:text-[#F7931A] transition-colors line-clamp-2">
                      {report.title?.en || report.title?.zh || "Update"}
                    </h3>
                    <p className="text-gray-400 text-sm line-clamp-3 mb-4 flex-1">
                      {report.executiveSummary?.en || report.executiveSummary?.zh || ""}
                    </p>
                    <div className="flex items-center text-[#F7931A] text-xs font-bold uppercase tracking-widest mt-auto">
                       Read Full Report <ArrowRight size={12} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* QR Codes & Footer */}
      <footer className="bg-black border-t border-white/10 pt-16 pb-12">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* QR Codes Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 border-b border-white/5 pb-16">
               <div className="flex flex-col items-center text-center">
                  <div className="bg-white p-2 rounded-xl shadow-lg mb-4">
                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://opcatlabs.io/')}&color=000000&bgcolor=ffffff&qzone=1&margin=0`} alt="Website QR" className="w-32 h-32" />
                  </div>
                  <div className="flex items-center gap-2 text-[#F7931A] font-bold mb-1">
                     <Globe size={16} /> <span>Website</span>
                  </div>
                  <a href="https://opcatlabs.io/" target="_blank" rel="noreferrer" className="text-gray-500 text-sm hover:text-white transition-colors">opcatlabs.io</a>
               </div>
               
               <div className="flex flex-col items-center text-center">
                  <div className="bg-white p-2 rounded-xl shadow-lg mb-4">
                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://x.com/opcatlayer')}&color=000000&bgcolor=ffffff&qzone=1&margin=0`} alt="Twitter QR" className="w-32 h-32" />
                  </div>
                  <div className="flex items-center gap-2 text-[#F7931A] font-bold mb-1">
                     <Twitter size={16} /> <span>Twitter</span>
                  </div>
                  <a href="https://x.com/opcatlayer" target="_blank" rel="noreferrer" className="text-gray-500 text-sm hover:text-white transition-colors">@opcatlayer</a>
               </div>

               <div className="flex flex-col items-center text-center">
                  <div className="bg-white p-2 rounded-xl shadow-lg mb-4">
                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://t.me/opcat_layer/1')}&color=000000&bgcolor=ffffff&qzone=1&margin=0`} alt="Telegram QR" className="w-32 h-32" />
                  </div>
                  <div className="flex items-center gap-2 text-[#F7931A] font-bold mb-1">
                     <Send size={16} /> <span>Telegram</span>
                  </div>
                  <a href="https://t.me/opcat_layer/1" target="_blank" rel="noreferrer" className="text-gray-500 text-sm hover:text-white transition-colors">t.me/opcat_layer</a>
               </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-gray-500 text-sm">
               <div>
                  &copy; {new Date().getFullYear()} OP_CAT Labs. All rights reserved.
               </div>
               
               <div className="flex gap-6">
                  <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                  <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
               </div>
               
               <button onClick={onLoginClick} className="text-gray-600 hover:text-[#F7931A] text-xs uppercase tracking-widest font-bold">
                  Admin Login
               </button>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default PublicHome;