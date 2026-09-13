"use client";

import { ArrowRight, LogIn } from "lucide-react";

export function LoginButton() {
  return <form action="/api/auth/google" method="get"><button type="submit" className="google-button"><LogIn size={18} /> Continue with Google <ArrowRight size={17} /></button></form>;
}