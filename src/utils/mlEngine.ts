import * as tf from '@tensorflow/tfjs';
import * as knnClassifier from '@tensorflow-models/knn-classifier';

// Global classifier instances
export const classifiers = {
  letter: knnClassifier.create(),
  word: knnClassifier.create()
};

export type MLMode = 'letter' | 'word';

const TEMPORAL_WINDOW = 10;
const LANDMARKS_PER_FRAME = 42; // 21 points * 2 (x,y)
export const NUM_FEATURES = TEMPORAL_WINDOW * LANDMARKS_PER_FRAME; // 420

let frameBuffer: {x: number, y: number}[][] = [];

// Process 21 MediaPipe landmarks into a flat normalized 420-element array capturing motion
export const processLandmarksToFeatures = (landmarks: any[]) => {
  const rawPoints = landmarks.map(l => ({ x: l.x, y: l.y }));
  
  frameBuffer.push(rawPoints);
  if (frameBuffer.length > TEMPORAL_WINDOW) {
    frameBuffer.shift(); // Keep only last 10 frames
  }

  // Pad if we don't have enough frames yet (e.g. first few frames)
  const paddedBuffer = [];
  while (paddedBuffer.length + frameBuffer.length < TEMPORAL_WINDOW) {
    paddedBuffer.push(frameBuffer[0]);
  }
  const fullBuffer = [...paddedBuffer, ...frameBuffer];

  // Calculate global bounding box for the entire temporal window to capture actual hand motion!
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  fullBuffer.forEach(frame => {
    frame.forEach(pt => {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    });
  });

  const width = Math.max(maxX - minX, 0.0001); // Prevent division by zero
  const height = Math.max(maxY - minY, 0.0001);

  // Normalize all points across all frames against this global bounding box
  const features: number[] = [];
  fullBuffer.forEach(frame => {
    frame.forEach(pt => {
      features.push((pt.x - minX) / width);
      features.push((pt.y - minY) / height);
    });
  });
  
  return tf.tensor1d(features);
};

export const clearTemporalBuffer = () => {
  frameBuffer = [];
};

// Generate multiple augmented samples from a single set of landmarks
// Uses jitter, scale, and slight rotation to create diverse training data
export const addAugmentedStaticExamples = (landmarks: any[], label: string, mode: MLMode, count: number = 50) => {
  const rawPoints = landmarks.map(l => ({ x: l.x, y: l.y }));

  const augment = (pts: {x: number, y: number}[], jitterAmt: number, scaleFactor: number, rotDeg: number) => {
    const angle = (rotDeg * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Center of hand (wrist point 0)
    const cx = pts[0].x;
    const cy = pts[0].y;

    return pts.map(pt => {
      // Rotate around wrist
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      // Scale + jitter
      return {
        x: cx + rx * scaleFactor + (Math.random() - 0.5) * jitterAmt,
        y: cy + ry * scaleFactor + (Math.random() - 0.5) * jitterAmt,
      };
    });
  };

  const makeFeatures = (pts: {x: number, y: number}[]): number[] => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach(pt => {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    });
    const width = Math.max(maxX - minX, 0.0001);
    const height = Math.max(maxY - minY, 0.0001);

    const features: number[] = [];
    for (let i = 0; i < TEMPORAL_WINDOW; i++) {
      pts.forEach(pt => {
        features.push((pt.x - minX) / width);
        features.push((pt.y - minY) / height);
      });
    }
    return features;
  };

  for (let s = 0; s < count; s++) {
    // Vary jitter, scale, and rotation per sample for rich diversity
    const jitter = 0.005 + Math.random() * 0.015;      // 0.005 - 0.020
    const scale  = 0.85 + Math.random() * 0.30;         // 0.85 - 1.15
    const rot    = -12 + Math.random() * 24;             // -12° to +12°

    const augmented = augment(rawPoints, jitter, scale, rot);
    const features  = makeFeatures(augmented);

    const tensor = tf.tensor1d(features);
    classifiers[mode].addExample(tensor, label);
    tensor.dispose();
  }
};

// Backwards-compat alias (kept for any old callers)
export const addStaticExample = (landmarks: any[], label: string, mode: MLMode) =>
  addAugmentedStaticExamples(landmarks, label, mode, 1);

// Feed a pre-computed feature vector (from asl_dataset.json) directly into KNN
export const addPrecomputedSample = (features: number[], label: string, mode: MLMode) => {
  const tensor = tf.tensor1d(features);
  classifiers[mode].addExample(tensor, label);
  tensor.dispose();
};

const getStorageKey = (mode: MLMode) => `ml_dataset_${mode}_v2`; // Changed to v2 because shape changed!

// Returns number of samples per class
export const getClassCounts = (mode: MLMode) => {
  try {
    return classifiers[mode].getClassExampleCount();
  } catch (e) {
    return {};
  }
};

// Save dataset to localStorage
export const saveDatasetToStorage = (mode: MLMode) => {
  const dataset = classifiers[mode].getClassifierDataset();
  if (Object.keys(dataset).length === 0) return;
  
  const datasetObj: any = {};
  Object.keys(dataset).forEach((key) => {
    const data = dataset[key].dataSync();
    datasetObj[key] = Array.from(data);
  });
  
  localStorage.setItem(getStorageKey(mode), JSON.stringify(datasetObj));
};

// Load dataset from localStorage
export const loadDatasetFromStorage = (mode: MLMode) => {
  const jsonStr = localStorage.getItem(getStorageKey(mode));
  if (!jsonStr) return false;
  
  try {
    const datasetObj = JSON.parse(jsonStr);
    const dataset: any = {};
    Object.keys(datasetObj).forEach((key) => {
      const arr = datasetObj[key];
      // If the array is from an older version (not divisible by NUM_FEATURES), it will crash
      if (arr.length % NUM_FEATURES !== 0) {
        console.warn(`Dataset for ${key} is incompatible with v2 engine. Ignoring.`);
        return;
      }
      dataset[key] = tf.tensor2d(arr, [arr.length / NUM_FEATURES, NUM_FEATURES]); 
    });
    
    if (Object.keys(dataset).length > 0) {
      classifiers[mode].setClassifierDataset(dataset);
    }
    return true;
  } catch (e) {
    console.error("Gagal memuat dataset ML", e);
    return false;
  }
};

export const clearAllData = (mode: MLMode) => {
  if (classifiers[mode].getNumClasses() > 0) {
    classifiers[mode].clearAllClasses();
  }
  localStorage.removeItem(getStorageKey(mode));
};

// Export dataset to JSON file
export const downloadDataset = (mode: MLMode) => {
  const jsonStr = localStorage.getItem(getStorageKey(mode));
  if (!jsonStr) {
    alert("Belum ada data AI yang dilatih!");
    return;
  }
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alphabrain_ai_${mode}_model.json`;
  a.click();
};

// Export dataset to CSV file (For Python / Data Scientists)
export const downloadDatasetCSV = (mode: MLMode) => {
  const jsonStr = localStorage.getItem(getStorageKey(mode));
  if (!jsonStr) {
    alert("Belum ada data AI yang dilatih!");
    return;
  }
  
  const datasetObj = JSON.parse(jsonStr);
  let csvContent = "Label,";
  
  // Create CSV Headers
  for (let i = 0; i < NUM_FEATURES; i++) {
    csvContent += `Feature_${i}${i === NUM_FEATURES - 1 ? '' : ','}`;
  }
  csvContent += "\n";
  
  // Fill CSV Rows
  Object.keys(datasetObj).forEach(label => {
    const rawData = datasetObj[label];
    const numSamples = rawData.length / NUM_FEATURES;
    for (let i = 0; i < numSamples; i++) {
      const sample = rawData.slice(i * NUM_FEATURES, (i + 1) * NUM_FEATURES);
      csvContent += `${label},${sample.join(",")}\n`;
    }
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alphabrain_dataset_${mode}_raw.csv`;
  a.click();
};

// Import dataset from JSON string (used by file reader)
export const importDatasetFromJson = (jsonStr: string, mode: MLMode) => {
  if (loadDatasetFromStorageStr(jsonStr, mode)) {
    localStorage.setItem(getStorageKey(mode), jsonStr);
    return true;
  }
  return false;
};

const loadDatasetFromStorageStr = (jsonStr: string, mode: MLMode) => {
  try {
    const datasetObj = JSON.parse(jsonStr);
    const dataset: any = {};
    Object.keys(datasetObj).forEach((key) => {
      const arr = datasetObj[key];
      if (arr.length % NUM_FEATURES !== 0) throw new Error("Format fitur dataset tidak cocok dengan model V2 (Temporal Buffer)");
      dataset[key] = tf.tensor2d(arr, [arr.length / NUM_FEATURES, NUM_FEATURES]); 
    });
    classifiers[mode].setClassifierDataset(dataset);
    return true;
  } catch (e) {
    console.error("Gagal memuat dataset ML", e);
    alert("Gagal memuat dataset. Format file mungkin berasal dari model versi lama (tanpa motion tracker).");
    return false;
  }
};

