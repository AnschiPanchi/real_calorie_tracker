import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, Loader2, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import api from '../api';

const BarcodeScanner = ({ onClose, onLog }) => {
    const scannerRef = useRef(null);
    const html5QrCode = useRef(null);
    const [status, setStatus] = useState('aim'); // aim | loading | found | error | notfound
    const [product, setProduct] = useState(null);
    const [error, setError] = useState('');
    const [logged, setLogged] = useState(false);

    useEffect(() => {
        // Initialize scanner
        html5QrCode.current = new Html5Qrcode("reader");

        const startScanning = async () => {
            try {
                await html5QrCode.current.start(
                    { facingMode: "environment" }, // use back camera
                    {
                        fps: 10,    // frames per second
                        qrbox: { width: 250, height: 150 } // optional scanning box
                    },
                    async (decodedText, decodedResult) => {
                        // On successful scan
                        if (html5QrCode.current.isScanning) {
                            html5QrCode.current.pause();
                            setStatus('loading');
                            try {
                                const res = await api.get(`/api/barcode/${decodedText}`);
                                setProduct(res.data);
                                setStatus('found');
                            } catch (e) {
                                if (e.response?.status === 404) {
                                    setError('Product not found in database. Try searching manually.');
                                    setStatus('notfound');
                                } else {
                                    setError('Network error looking up product.');
                                    setStatus('error');
                                }
                            }
                        }
                    },
                    (errorMessage) => {
                        // Suppress continuous scan errors (normal when no barcode found)
                    }
                );
            } catch (err) {
                console.error("Camera start error:", err);
                setError('Could not start camera. Please ensure camera permissions are granted.');
                setStatus('error');
            }
        };

        startScanning();

        // Cleanup
        return () => {
            if (html5QrCode.current) {
                if (html5QrCode.current.isScanning) {
                    html5QrCode.current.stop().catch(console.error);
                }
                html5QrCode.current.clear();
            }
        };
    }, []);

    const handleRescan = () => {
        setProduct(null);
        setError('');
        setLogged(false);
        setStatus('aim');
        if (html5QrCode.current) {
            html5QrCode.current.resume();
        }
    };

    const handleLog = () => {
        if (product && onLog) {
            onLog({ description: `${product.brand ? product.brand + ' - ' : ''}${product.name}`, calories: product.calories });
            setLogged(true);
        }
    };

    return (
        <div className="barcode-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="barcode-modal">
                {/* Header */}
                <div className="barcode-header">
                    <div>
                        <h2 className="barcode-title">📷 Barcode Scanner</h2>
                        <p className="barcode-sub">Barcode can be <strong>anywhere</strong> in the camera view</p>
                    </div>
                    <button className="barcode-close-btn" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Camera view */}
                <div className="barcode-video-wrapper">
                    {/* The div where html5-qrcode renders the video */}
                    <div id="reader" style={{ width: '100%', height: '260px', background: '#000', overflow: 'hidden' }}></div>

                    {/* Overlay Frame */}
                    <div className="barcode-frame" style={{ pointerEvents: 'none' }}>
                        <div className="barcode-corner tl" /><div className="barcode-corner tr" />
                        <div className="barcode-corner bl" /><div className="barcode-corner br" />
                    </div>

                    {status === 'loading' && (
                        <div className="barcode-scanning-overlay">
                            <Loader2 size={36} className="spinning" />
                            <span>Looking up product...</span>
                        </div>
                    )}
                    {status === 'aim' && (
                        <div className="barcode-hint">
                            <Camera size={14} /> Entire frame is active — no need to align precisely
                        </div>
                    )}
                </div>

                {/* Result */}
                {status === 'found' && product && (
                    <div className="barcode-result">
                        <div className="barcode-result-inner">
                            {product.imageUrl && (
                                <img src={product.imageUrl} alt={product.name} className="barcode-product-img" />
                            )}
                            <div className="barcode-product-info">
                                <div className="barcode-product-name">{product.name}</div>
                                {product.brand && <div className="barcode-product-brand">{product.brand} {product.quantity && `· ${product.quantity}`}</div>}
                                <div className="barcode-macros">
                                    <span className="bm-chip kcal">🔥 {product.calories} kcal</span>
                                    <span className="bm-chip">🥩 {product.protein}g protein</span>
                                    <span className="bm-chip">🌾 {product.carbs}g carbs</span>
                                    <span className="bm-chip">🧈 {product.fat}g fat</span>
                                </div>
                            </div>
                        </div>
                        <div className="barcode-actions">
                            <button className="barcode-rescan-btn" onClick={handleRescan}>
                                <RefreshCw size={14} /> Scan Again
                            </button>
                            <button className="barcode-log-btn" onClick={handleLog} disabled={logged}>
                                {logged ? <><CheckCircle size={14} /> Logged!</> : <><Plus size={14} /> Log This Food</>}
                            </button>
                        </div>
                    </div>
                )}

                {(status === 'notfound' || status === 'error') && (
                    <div className="barcode-error-state">
                        <AlertCircle size={28} style={{ color: 'var(--danger)' }} />
                        <p>{error}</p>
                        <button className="barcode-rescan-btn" onClick={handleRescan}>
                            <RefreshCw size={14} /> Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BarcodeScanner;

