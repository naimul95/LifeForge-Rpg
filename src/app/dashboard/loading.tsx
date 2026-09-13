import { LoaderCircle } from "lucide-react";

export default function DashboardLoading() {
  return <div className="loading-screen min-h-screen"><LoaderCircle className="animate-spin text-cyan-300" size={24} /><span>Loading your command deck...</span></div>;
}