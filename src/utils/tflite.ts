import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import { Asset } from 'expo-asset';
import { FlipType, SaveFormat, ImageManipulator } from 'expo-image-manipulator';
import { scanFaces } from 'vision-camera-face-detector';
import { Face } from 'react-native-vision-camera-face-detector';
import { Frame } from 'react-native-vision-camera';

let model: TensorflowModel | null = null;

export const initTFLite = async () => {
  if (model) return;
  try {
    const asset = await Asset.fromModule(require('../../assets/models/mobilefacenet.tflite')).downloadAsync();
    model = await loadTensorflowModel({ url: asset.localUri! });
    console.log('TFLite model loaded successfully');
  } catch (err) {
    console.error('Failed to load TFLite model:', err);
    throw new Error('Failed to initialize TFLite model');
  }
};

export const getFaceEmbedding = async (imagePath: string, frame?: Face): Promise<number[]> => {
  if (!model) throw new Error('TFLite model not initialized');

  let imageUri = imagePath;
  if (frame) {
    // Crop face based on detected bounds
    const { bounds } = frame;
    const manipResult = await ImageManipulator.manipulateAsync(
      imagePath,
      [
        { crop: { originX: bounds.x, originY: bounds.y, width: bounds.width, height: bounds.height } },
        { resize: { width: 112, height: 112 } },
        { flip: FlipType.Horizontal }, // Mirror for front camera
      ],
      { format: SaveFormat.JPEG, compress: 0.8 }
    );
    imageUri = manipResult.uri;
  } else {
    // Resize to 112x112
    const manipResult = await ImageManipulator.manipulateAsync(
      imagePath,
      [{ resize: { width: 112, height: 112 } }, { flip: FlipType.Horizontal }],
      { format: SaveFormat.JPEG, compress: 0.8 }
    );
    imageUri = manipResult.uri;
  }

  // Placeholder: Replace with native module or server-side imageToTensor
  console.warn('imageToTensor not fully implemented; returning mock embedding');
  const tensor = new Float32Array(112 * 112 * 3).fill(0.5); // Mock tensor
  const embedding = await model.run([tensor]);
  return Array.from(embedding[0] as Float32Array); // Convert TypedArray to number[]
};

export const useFaceDetection = () => {
  return (frame: Frame) => {
    'worklet';
    const faces = scanFaces(frame);
    return faces;
  };
};