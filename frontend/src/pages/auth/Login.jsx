import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Hexagon } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        onLogin(data.user);
        navigate(data.user.role === 'admin' ? '/admin' : '/student');
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch (err) {
      setError("An error occurred during login.");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row relative overflow-hidden font-sans" style={{ backgroundColor: '#07070A' }}>
      
      {/* Aurora Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#7C3AED] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute top-20 -right-20 w-[500px] h-[500px] bg-[#2563EB] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-[pulse_12s_ease-in-out_infinite_1s]" />
        <div className="absolute -bottom-40 left-1/4 w-[700px] h-[700px] bg-[#06B6D4] rounded-full mix-blend-screen filter blur-[130px] opacity-15 animate-[pulse_14s_ease-in-out_infinite_2s]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#EC4899] rounded-full mix-blend-screen filter blur-[100px] opacity-10 animate-[pulse_11s_ease-in-out_infinite_3s]" />
      </div>

      {/* Left: Editorial / Branding */}
      <div className="relative z-10 w-full md:w-1/2 p-8 md:p-24 flex flex-col justify-between">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-1"
        >
          <div className="flex items-center gap-3">
            <Hexagon className="w-8 h-8 text-white fill-white/10" />
            <h1 className="font-bold text-xl tracking-[0.2em] text-white">PMS</h1>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 ml-[2.75rem] font-bold">Placement Management System</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-24 md:mt-0"
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tighter leading-[1.05] mb-6">
            FROM CAMPUS <br/> 
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4]">TO CAREER.</span>
          </h2>
          <p className="text-lg text-[#a1a1aa] font-light max-w-md leading-relaxed">
            One platform for every opportunity, application, and outcome. Navigate your future with precision.
          </p>
        </motion.div>
      </div>

      {/* Right: Glass Auth Form */}
      <div className="relative z-10 w-full md:w-1/2 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-md p-10 md:p-12 relative overflow-hidden"
          style={{
            background: 'rgba(18,18,26,0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px -10px rgba(124, 58, 237, 0.15)'
          }}
        >
          <h3 className="text-3xl font-extrabold text-white mb-2 tracking-tight">WELCOME BACK.</h3>
          <p className="text-sm text-white/60 mb-10 font-medium">Access your personalized dashboard.</p>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            {error && (
              <div className="p-4 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl text-[#ef4444] text-sm font-bold">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/70 tracking-widest uppercase ml-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#12121A]/50 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all placeholder:text-white/30 text-sm font-medium"
                placeholder="Enter your university ID"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/70 tracking-widest uppercase ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#12121A]/50 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all placeholder:text-white/30 text-sm font-medium tracking-widest"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-[#7C3AED] via-[#4F46E5] to-[#2563EB] text-white font-bold text-sm tracking-[0.15em] uppercase rounded-xl px-6 py-4 flex items-center justify-between hover:shadow-[0_0_30px_-5px_rgba(124,58,237,0.5)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? "AUTHENTICATING..." : "SIGN IN"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </motion.div>
      </div>

    </div>
  );
}
