import React, { useRef, useState } from 'react';
import './ImageUploader.css';

const ImageUploader = ({ value, onChange, multiple = false, label = 'Upload Photos', maxFiles = 5, maxSizeMB = 2 }) => {
    const fileRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState('');

    // value can be a string (single) or array of strings (multiple)
    const images = multiple
        ? (Array.isArray(value) ? value : (value ? [value] : []))
        : (value ? [value] : []);

    const processFiles = (files) => {
        setError('');
        const fileArr = Array.from(files);

        // Validate
        for (const f of fileArr) {
            if (!f.type.startsWith('image/')) {
                setError('Only image files are allowed (JPG, PNG, WEBP).');
                return;
            }
            if (f.size > maxSizeMB * 1024 * 1024) {
                setError(`File "${f.name}" exceeds ${maxSizeMB}MB limit.`);
                return;
            }
        }

        if (multiple && images.length + fileArr.length > maxFiles) {
            setError(`Maximum ${maxFiles} images allowed.`);
            return;
        }

        // Read each file as base64 data URL
        const readers = fileArr.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(readers).then(results => {
            if (multiple) {
                onChange([...images, ...results].slice(0, maxFiles));
            } else {
                onChange(results[0]);
            }
        });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.length) {
            processFiles(e.dataTransfer.files);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };

    const handleFileSelect = (e) => {
        if (e.target.files?.length) {
            processFiles(e.target.files);
        }
    };

    const removeImage = (index) => {
        if (multiple) {
            const updated = images.filter((_, i) => i !== index);
            onChange(updated.length > 0 ? updated : []);
        } else {
            onChange('');
        }
    };

    const markPrimary = (index) => {
        if (multiple && index > 0) {
            const updated = [...images];
            const [item] = updated.splice(index, 1);
            updated.unshift(item);
            onChange(updated);
        }
    };

    return (
        <div className="img-uploader">
            <label className="img-uploader-label">{label}</label>

            {/* Drop zone */}
            <div
                className={`img-dropzone ${dragActive ? 'drag-active' : ''} ${images.length > 0 ? 'has-images' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
            >
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple={multiple}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
                <div className="img-dropzone-content">
                    <span className="img-dropzone-icon">📷</span>
                    <p className="img-dropzone-text">
                        {dragActive
                            ? 'Drop your images here...'
                            : 'Click or drag & drop images here'
                        }
                    </p>
                    <span className="img-dropzone-hint">
                        JPG, PNG, WEBP — Max {maxSizeMB}MB{multiple ? ` — Up to ${maxFiles} images` : ''}
                    </span>
                </div>
            </div>

            {error && <p className="img-uploader-error">❌ {error}</p>}

            {/* Image previews */}
            {images.length > 0 && (
                <div className="img-preview-grid">
                    {images.map((src, index) => (
                        <div key={index} className={`img-preview-item ${index === 0 && multiple ? 'primary' : ''}`}>
                            <img src={src} alt={`Upload ${index + 1}`} />
                            <div className="img-preview-overlay">
                                {index === 0 && multiple && (
                                    <span className="img-primary-badge">Primary</span>
                                )}
                                {index !== 0 && multiple && (
                                    <button
                                        type="button"
                                        className="img-action-btn"
                                        title="Set as primary"
                                        onClick={(e) => { e.stopPropagation(); markPrimary(index); }}
                                    >
                                        ⭐
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="img-action-btn danger"
                                    title="Remove"
                                    onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                >
                                    ✕
                                </button>
                            </div>
                            {multiple && <span className="img-preview-count">{index + 1}/{images.length}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageUploader;