'use client';

import React from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-pneutral-50 p-6 select-none font-body">
      <p className="text-center text-2xl font-bold text-pneutral-900 mb-6 font-heading">
        Welcome to Tiameds Pharma Inventory Module
      </p>
      
      <div className="flex gap-4">
        <button 
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer" 
          onClick={() => router.push("/login")}
        >
          Login
        </button>
        <button 
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer" 
          onClick={() => router.push("/registration")}
        >
          Register
        </button>
      </div>
    </div>
  );
}
