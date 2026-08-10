import React from "react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-100 bg-white/95 backdrop-blur-sm">
      {/* Subtle top accent */}
      <div className="h-0.5 bg-linear-to-r from-transparent via-blue-200/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left section */}
            <div className="flex items-center gap-3 group cursor-default">
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-r from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:to-indigo-500/5 rounded-lg blur-xs transition-all duration-500" />
                <p className="text-sm font-medium text-gray-700 relative">
                  © {new Date().getFullYear()} Bingo Admin
                </p>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-linear-to-r from-blue-400 to-indigo-400 opacity-60" />
            </div>

            {/* Right section */}
            <a
              href="https://t.me/AbolBingoGroup"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 px-4 py-2.5 bg-linear-to-br from-gray-50 to-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:border-gray-300 hover:from-gray-100 hover:to-gray-50 transition-all duration-250 shadow-xs hover:shadow-sm"
            >
              <span className="relative z-10">Go to Group</span>
              
              {/* Hover underline effect */}
              <span className="absolute bottom-2 left-4 right-4 h-px bg-linear-to-r from-blue-400/0 via-blue-400/50 to-blue-400/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
              
              {/* Hover glow */}
              <div className="absolute inset-0 bg-linear-to-r from-blue-500/0 via-blue-400/0 to-indigo-500/0 rounded-lg opacity-0 group-hover:opacity-5 transition-opacity duration-400" />
            </a>
          </div>
          
          {/* Bottom divider with subtle linear */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="text-center">
              <span className="text-xs text-gray-400 font-light tracking-wide">
                Secured with end-to-end encryption
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Very subtle bottom linear */}
      <div className="h-1 bg-linear-to-r from-blue-500/0 via-indigo-500/3 to-blue-500/0" />
    </footer>
  );
}