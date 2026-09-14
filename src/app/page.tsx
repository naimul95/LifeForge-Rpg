import { ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { LoginButton } from "@/components/auth/login-button";

export default async function Home() {
  if (await getSession()) redirect("/dashboard");
  return <main className="landing-shell"><div className="landing-grid" /><div className="landing-content"><div className="brand-lockup"><div className="brand-mark"><Sparkles size={19} /></div><span>LIFEFORGE <small>RPG</small></span></div><p className="eyebrow mt-20 text-cyan-300">Personal evolution system / 01</p><h1>Make your <em>life</em><br />worth playing.</h1><p className="landing-copy">A focused command deck for turning intention into momentum, one deliberate move at a time.</p><p className="mt-5 max-w-md text-sm leading-6 text-slate-400">Your journey is waiting.<br />Sign in and continue building your life, one step at a time.</p><LoginButton /><div className="mt-8 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={14} className="text-emerald-300" /> Your progress is ready when you return.</div></div><div className="landing-footer"><span>BUILD 01.0 / LIFEFORGE OS</span><span>AUTHENTICATED PROGRESS</span></div></main>;
}
