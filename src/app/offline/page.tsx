"use client";

import { Wifi, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-lg text-center">
        <div className="mb-6">
          <WifiOff className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You&apos;re Offline
          </h1>
          <p className="text-gray-600">
            No internet connection detected. You can still browse cached content and make changes that will sync when you&apos;re back online.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Wifi className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">
                Offline Mode Active
              </span>
            </div>
            <p className="text-xs text-blue-600">
              Your changes are being saved locally and will sync automatically when connection is restored.
            </p>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          
          <button 
            onClick={() => window.history.back()}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}