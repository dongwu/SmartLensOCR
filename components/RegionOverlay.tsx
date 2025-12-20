
import React from 'react';
import { TextRegion } from '../types';

interface RegionOverlayProps {
  regions: TextRegion[];
  onToggleRegion: (id: string) => void;
  onSetSelected: (id: string | null) => void;
  selectedId: string | null;
}

const RegionOverlay: React.FC<RegionOverlayProps> = ({ regions, onToggleRegion, onSetSelected, selectedId }) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        {regions.map((region) => {
          if (!region.isActive) return null;
          
          const isSelected = selectedId === region.id;
          const { ymin, xmin, ymax, xmax } = region.box;
          const width = xmax - xmin;
          const height = ymax - ymin;

          return (
            <g 
              key={region.id} 
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSetSelected(region.id);
              }}
            >
              <rect
                x={xmin}
                y={ymin}
                width={width}
                height={height}
                fill={isSelected ? "rgba(59, 130, 246, 0.2)" : "transparent"}
                stroke={isSelected ? "#2563eb" : "#3b82f6"}
                strokeWidth="4"
                className="transition-all duration-200"
              />
              <rect
                x={xmin}
                y={ymin - 25 > 0 ? ymin - 25 : ymin}
                width="30"
                height="25"
                fill={isSelected ? "#2563eb" : "#3b82f6"}
              />
              <text
                x={xmin + 15}
                y={ymin - 25 > 0 ? ymin - 7 : ymin + 18}
                fill="white"
                fontSize="16"
                fontWeight="bold"
                textAnchor="middle"
              >
                {region.order}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default RegionOverlay;
