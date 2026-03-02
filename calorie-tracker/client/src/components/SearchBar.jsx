import React, { useState, useRef } from 'react';
import { Search, Camera, Loader2 } from 'lucide-react';
import axios from 'axios';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

// Cache the model so we only load it once
let cachedModel = null;

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsRecognizing(true);
    setQuery('Loading AI model...');

    try {
      // Load model (only downloads once, then cached)
      if (!cachedModel) {
        setQuery('Downloading AI model (first time only)...');
        cachedModel = await mobilenet.load({ version: 2, alpha: 1.0 });
      }

      setQuery('Identifying food...');

      // Create an img element from the uploaded file
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => { img.onload = resolve; });

      // Run inference
      const predictions = await cachedModel.classify(img);
      URL.revokeObjectURL(img.src);

      if (!predictions || predictions.length === 0) {
        throw new Error('No predictions returned');
      }

      // MobileNet returns labels like "Granny Smith" or "banana, Musa paradisiaca"
      // We clean it up: take the part before the comma, capitalize first letter
      const rawLabel = predictions[0].className;
      const cleanedLabel = rawLabel.split(',')[0].trim();
      const formattedLabel = cleanedLabel.charAt(0).toUpperCase() + cleanedLabel.slice(1);

      setQuery(formattedLabel);
      onSearch(formattedLabel); // Auto-search!
    } catch (error) {
      console.error('Error recognizing food:', error);
      setQuery('');
      alert('Could not identify the food. Please try a clearer image.');
    } finally {
      setIsRecognizing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="What did you eat today? (e.g. Banana)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
            disabled={isRecognizing}
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            disabled={isRecognizing}
          />
          <button
            type="button"
            onClick={triggerFileInput}
            className="search-camera-btn"
            disabled={isRecognizing}
            title="Upload food image to identify it with AI"
          >
            {isRecognizing ? <Loader2 size={20} className="spinning" /> : <Camera size={20} />}
          </button>
        </div>
        <button type="submit" className="search-btn" disabled={isRecognizing}>
          <Search size={18} style={{ marginRight: '8px' }} />
          Search
        </button>
      </form>
    </div>
  );
};

export default SearchBar;