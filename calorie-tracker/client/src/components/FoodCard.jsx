import React, { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';

// Extracts the core food name from messy USDA descriptions
// "Babyfood, Banana No Tapioca, Strained" → "banana"
// "Granny Smith Apples, Granny Smith"     → "Granny Smith apples"
// "Chicken Breast, Roasted"               → "chicken breast"
const getCoreKeyword = (description) => {
  const modifiers = new Set([
    'raw', 'cooked', 'canned', 'dried', 'frozen', 'plain', 'fresh', 'organic',
    'added', 'no', 'without', 'unsalted', 'salted', 'sweetened', 'unsweetened',
    'whole', 'ground', 'sliced', 'diced', 'chopped', 'baked', 'roasted', 'fried',
    'boiled', 'steamed', 'strained', 'pureed', 'dehydrated', 'powdered', 'mixed',
    'stage', 'toddler', 'junior', 'baby', 'babyfood', 'prepared', 'homemade', 'fat',
    'low', 'reduced', 'free', 'and', 'with', 'or', 'the', 'nfs', 'upc', 'usda',
    'brand', 'generic', 'restaurant', 'fast', 'food', 'percent', 'all', 'purpose',
  ]);

  // Take first comma segment only ("Babyfood" part is skipped if the second part is more specific)
  const segments = description.split(',').map(s => s.trim());

  // If first segment is a category word (like "Babyfood"), use the second
  const categoryWords = new Set(['babyfood', 'restaurant', 'fast food', 'snacks', 'beverages', 'cereals']);
  const firstSeg = segments[0].toLowerCase();
  const segment = categoryWords.has(firstSeg) && segments[1] ? segments[1] : segments[0];

  // Filter out modifier words
  const meaningful = segment
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !modifiers.has(w));

  return meaningful.slice(0, 3).join(' ') || segment.split(' ')[0].toLowerCase();
};

// In-memory cache to avoid repeated API calls for the same keyword
const imageCache = {};

const FoodCard = ({ food, onAdd }) => {
  const nutrient = food.foodNutrients?.find(n => n.unitName === 'KCAL');
  const calories = nutrient ? Math.round(nutrient.value) : 0;

  const [imgSrc, setImgSrc] = useState(null); // null = loading, 'FALLBACK' = hide card

  useEffect(() => {
    let cancelled = false;
    const keyword = getCoreKeyword(food.description);

    if (imageCache[keyword] !== undefined) {
      setImgSrc(imageCache[keyword]);
      return;
    }

    // Use Wikipedia's search API with "food" appended so it finds the right article
    // e.g. searching "banana food" → "Banana" Wikipedia page with the fruit photo
    const searchQuery = encodeURIComponent(`${keyword} food`);
    const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${searchQuery}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=400&format=json&origin=*`;

    fetch(wikiSearchUrl)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;

        const pages = Object.values(data?.query?.pages || {});
        // Find first page that has a thumbnail
        const page = pages.find(p => p.thumbnail?.source);

        if (page) {
          imageCache[keyword] = page.thumbnail.source;
          setImgSrc(page.thumbnail.source);
        } else {
          imageCache[keyword] = 'FALLBACK';
          setImgSrc('FALLBACK');
        }
      })
      .catch(() => {
        if (!cancelled) {
          imageCache[keyword] = 'FALLBACK';
          setImgSrc('FALLBACK');
        }
      });

    return () => { cancelled = true; };
  }, [food.description]);

  // Still loading — show skeleton
  if (imgSrc === null) {
    return (
      <div className="food-card">
        <div className="card-image-wrapper">
          <div className="food-image food-image-skeleton" />
        </div>
        <div className="card-info">
          <h4 className="food-title">{food.description.toLowerCase()}</h4>
          <button className="add-btn-full" onClick={() => onAdd(food, calories)}>
            <PlusCircle size={18} />
            Add to Log
          </button>
        </div>
      </div>
    );
  }

  // No image found — hide the card entirely
  if (imgSrc === 'FALLBACK') return null;

  return (
    <div className="food-card">
      <div className="card-image-wrapper">
        <img
          src={imgSrc}
          alt={food.description}
          className="food-image"
          onError={() => setImgSrc('FALLBACK')}
        />
        <div className="image-overlay">
          <span className="cal-tag">{calories} kcal</span>
        </div>
      </div>

      <div className="card-info">
        <h4 className="food-title">{food.description.toLowerCase()}</h4>
        <button className="add-btn-full" onClick={() => onAdd(food, calories)}>
          <PlusCircle size={18} />
          Add to Log
        </button>
      </div>
    </div>
  );
};

export default FoodCard;