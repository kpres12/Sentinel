/**
 * Map legend component.
 */

import React from 'react';
import { MapPin, Camera, Flame, AlertTriangle, Shield } from 'lucide-react';

export interface MapLegendProps {
  className?: string;
}

export function MapLegend({ className = '' }: MapLegendProps) {
  return (
    <div className={`absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 ${className}`}>
      <h3 className="font-semibold text-sm mb-3">Legend</h3>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Robot/Drone</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
          <span>Smoke Detection</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Flame Detection</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-600 rounded-full"></div>
          <span>Fire Line</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-300 rounded-full opacity-50"></div>
          <span>Camera FOV</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full opacity-50"></div>
          <span>Risk Heatmap</span>
        </div>
      </div>
    </div>
  );
}
