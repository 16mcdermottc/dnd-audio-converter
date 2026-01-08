import React, { useEffect, useState } from 'react';

interface MasonryGridProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  gap?: number;
}

export function MasonryGrid<T>({ items, renderItem, gap = 24, maxColumns = 4 }: MasonryGridProps<T> & { maxColumns?: number }) {
  const [columns, setColumns] = useState<T[][]>([]);

  useEffect(() => {
    const calculateColumns = () => {
      const width = window.innerWidth;
      let colCount = 1;
      
      // Matches Tailwind breakpoints loosely
      if (width >= 1280) colCount = 4;      // xl
      else if (width >= 1024) colCount = 3; // lg
      else if (width >= 768) colCount = 2;  // md
      
      // Enforce max columns
      colCount = Math.min(colCount, maxColumns);
      
      const newColumns: T[][] = Array.from({ length: colCount }, () => []);
      
      items.forEach((item, index) => {
        newColumns[index % colCount].push(item);
      });
      
      setColumns(newColumns);
    };

    calculateColumns();
    window.addEventListener('resize', calculateColumns);
    return () => window.removeEventListener('resize', calculateColumns);
  }, [items, maxColumns]);

  return (
    <div className="flex" style={{ gap: `${gap}px` }}>
      {columns.map((col, colIndex) => (
        <div key={colIndex} className="flex-1 flex flex-col" style={{ gap: `${gap}px` }}>
          {col.map((item, itemIndex) => (
            <div key={itemIndex}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
