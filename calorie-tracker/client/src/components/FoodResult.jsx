import React from 'react';
import FoodCard from './FoodCard';

const FoodResult = ({ results, onAdd }) => {
  if (!results || results.length === 0) return null;

  // Deduplicate: keep only the first occurrence of each unique food description name
  const seen = new Set();
  const uniqueResults = results.filter(food => {
    // Normalize: lowercase, strip punctuation and extra spaces
    const key = food.description.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="results-grid">
      {uniqueResults.map((food, index) => (
        <FoodCard key={food.fdcId || index} food={food} onAdd={onAdd} />
      ))}
    </div>
  );
};

export default FoodResult;