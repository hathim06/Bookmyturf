import { useState } from 'react';
import Cropper from 'react-easy-crop';

function createCroppedFile(source, cropPixels) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cropPixels.width;
      canvas.height = cropPixels.height;
      const context = canvas.getContext('2d');
      context.drawImage(image, cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height, 0, 0, cropPixels.width, cropPixels.height);
      canvas.toBlob((blob) => blob ? resolve(new File([blob], source.name, { type: 'image/jpeg' })) : reject(new Error('Unable to crop image.')), 'image/jpeg', 0.9);
    };
    image.onerror = reject;
    image.src = source.preview;
  });
}

export default function TurfImageUploader({ onChange }) {
  const [items, setItems] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [cropTarget, setCropTarget] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [error, setError] = useState('');

  const selectFiles = (event) => {
    const files = Array.from(event.target.files || []);
    const invalid = files.find((file) => !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024);
    if (invalid) { setError('Use image files smaller than 5 MB.'); return; }
    setError('');
    const next = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    if (next[0]) { setCropTarget(next[0]); setPendingFiles(next.slice(1)); setCrop({ x: 0, y: 0 }); setZoom(1); }
    event.target.value = '';
  };

  const finishCrop = async () => {
    try {
      const file = await createCroppedFile(cropTarget, croppedArea);
      const next = [...items, { file, preview: URL.createObjectURL(file) }];
      setItems(next); onChange(next.map((item) => item.file));
      if (pendingFiles[0]) { setCropTarget(pendingFiles[0]); setPendingFiles(pendingFiles.slice(1)); setCrop({ x: 0, y: 0 }); setZoom(1); } else setCropTarget(null);
    } catch { setError('Unable to crop this image. Please choose another image.'); }
  };

  const remove = (index) => {
    const next = items.filter((_, itemIndex) => itemIndex !== index);
    URL.revokeObjectURL(items[index].preview); setItems(next); onChange(next.map((item) => item.file));
  };

  return <div className="turfImageUploader"><label>Images (up to 8, 5 MB each)<input type="file" accept="image/*" multiple onChange={selectFiles} /></label>{error && <p className="authError">{error}</p>}<div className="turfImageGrid">{items.map((item, index) => <div className="turfImagePreview" key={item.preview}><img src={item.preview} alt={`Turf preview ${index + 1}`} /><button type="button" onClick={() => remove(index)}>Remove</button>{index === 0 && <small>Primary image</small>}</div>)}</div>{cropTarget && <div className="cropModal"><div className="cropPanel"><div className="cropArea"><Cropper image={cropTarget.preview} crop={crop} zoom={zoom} aspect={16 / 9} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setCroppedArea(pixels)} /></div><label>Zoom<input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label><div><button type="button" onClick={() => setCropTarget(null)}>Cancel</button><button type="button" onClick={finishCrop}>Crop image</button></div></div></div>}</div>;
}
