import { useState, useRef, useEffect } from "react";
import "./tailwind.output.css";

export default function DitherApp() {
  const [image, setImage] = useState(null);
  const [algorithm, setAlgorithm] = useState("Floyd-Steinberg");
  const [intensity, setIntensity] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [lightness, setLightness] = useState(1);
  const [colorMode, setColorMode] = useState("color");
  const [patternSize, setPatternSize] = useState(1);
  const [blurAmount, setBlurAmount] = useState(0);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("No file selected");

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const applyFloydSteinberg = (imgData, width, height) => {
    const data = new Uint8ClampedArray(imgData.data);
    const isMonochrome = colorMode === "blackAndWhite";

    // Apply dithering with pattern size
    for (let y = 0; y < height; y += patternSize) {
      for (let x = 0; x < width; x += patternSize) {
        // Process a block of pixels at once for the pattern size
        const i = (y * width + x) * 4;

        if (isMonochrome) {
          // For monochrome: convert to grayscale first
          const grayValue = Math.round(
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          );
          const newValue = grayValue > 128 ? 255 : 0;

          // Calculate error
          const error = (grayValue - newValue) * intensity;

          // Apply the same value to the entire pattern block
          for (let dy = 0; dy < patternSize && y + dy < height; dy++) {
            for (let dx = 0; dx < patternSize && x + dx < width; dx++) {
              const blockIndex = ((y + dy) * width + (x + dx)) * 4;
              data[blockIndex] =
                data[blockIndex + 1] =
                data[blockIndex + 2] =
                  newValue;
            }
          }

          // Distribute error to neighboring pattern blocks (not individual pixels)
          if (x + patternSize < width) {
            const rightIndex = (y * width + (x + patternSize)) * 4;
            data[rightIndex] =
              data[rightIndex + 1] =
              data[rightIndex + 2] =
                Math.max(0, Math.min(255, data[rightIndex] + (error * 7) / 16));
          }

          if (y + patternSize < height) {
            if (x >= patternSize) {
              const leftDownIndex =
                ((y + patternSize) * width + (x - patternSize)) * 4;
              data[leftDownIndex] =
                data[leftDownIndex + 1] =
                data[leftDownIndex + 2] =
                  Math.max(
                    0,
                    Math.min(255, data[leftDownIndex] + (error * 3) / 16)
                  );
            }

            const downIndex = ((y + patternSize) * width + x) * 4;
            data[downIndex] =
              data[downIndex + 1] =
              data[downIndex + 2] =
                Math.max(0, Math.min(255, data[downIndex] + (error * 5) / 16));

            if (x + patternSize < width) {
              const rightDownIndex =
                ((y + patternSize) * width + (x + patternSize)) * 4;
              data[rightDownIndex] =
                data[rightDownIndex + 1] =
                data[rightDownIndex + 2] =
                  Math.max(
                    0,
                    Math.min(255, data[rightDownIndex] + (error * 1) / 16)
                  );
            }
          }
        } else {
          // For color: process each channel separately
          for (let c = 0; c < 3; c++) {
            const oldValue = data[i + c];
            const newValue = oldValue > 128 ? 255 : 0;

            // Calculate error
            const error = (oldValue - newValue) * intensity;

            // Apply the same value to the entire pattern block
            for (let dy = 0; dy < patternSize && y + dy < height; dy++) {
              for (let dx = 0; dx < patternSize && x + dx < width; dx++) {
                const blockIndex = ((y + dy) * width + (x + dx)) * 4;
                data[blockIndex + c] = newValue;
              }
            }

            // Distribute error to neighboring pattern blocks
            if (x + patternSize < width) {
              const rightIndex = (y * width + (x + patternSize)) * 4;
              data[rightIndex + c] += (error * 7) / 16;
            }

            if (y + patternSize < height) {
              if (x >= patternSize) {
                const leftDownIndex =
                  ((y + patternSize) * width + (x - patternSize)) * 4;
                data[leftDownIndex + c] += (error * 3) / 16;
              }

              const downIndex = ((y + patternSize) * width + x) * 4;
              data[downIndex + c] += (error * 5) / 16;

              if (x + patternSize < width) {
                const rightDownIndex =
                  ((y + patternSize) * width + (x + patternSize)) * 4;
                data[rightDownIndex + c] += (error * 1) / 16;
              }
            }
          }
        }
      }
    }

    imgData.data.set(data);
    return imgData;
  };

  const applyBayerDithering = (imgData, width, height) => {
    // 4x4 Bayer matrix for ordered dithering
    const bayerMatrix = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ];

    // Scale matrix values to 0-255 range
    const scaledMatrix = bayerMatrix.map((row) =>
      row.map((val) => Math.floor((val / 16) * 255 * intensity))
    );

    const data = new Uint8ClampedArray(imgData.data);
    const isMonochrome = colorMode === "blackAndWhite";

    // Apply dithering with pattern size
    for (let y = 0; y < height; y += patternSize) {
      for (let x = 0; x < width; x += patternSize) {
        const i = (y * width + x) * 4;

        // Get the threshold from Bayer matrix
        const threshold = scaledMatrix[y % 4][x % 4];

        if (isMonochrome) {
          // For monochrome: convert to grayscale first
          const grayValue = Math.round(
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          );
          const newValue = grayValue > threshold ? 255 : 0;

          // Apply the same value to the entire pattern block
          for (let dy = 0; dy < patternSize && y + dy < height; dy++) {
            for (let dx = 0; dx < patternSize && x + dx < width; dx++) {
              const blockIndex = ((y + dy) * width + (x + dx)) * 4;
              data[blockIndex] =
                data[blockIndex + 1] =
                data[blockIndex + 2] =
                  newValue;
            }
          }
        } else {
          // For color: process each channel separately
          const r = data[i] > threshold ? 255 : 0;
          const g = data[i + 1] > threshold ? 255 : 0;
          const b = data[i + 2] > threshold ? 255 : 0;

          // Apply the same values to the entire pattern block
          for (let dy = 0; dy < patternSize && y + dy < height; dy++) {
            for (let dx = 0; dx < patternSize && x + dx < width; dx++) {
              const blockIndex = ((y + dy) * width + (x + dx)) * 4;
              data[blockIndex] = r;
              data[blockIndex + 1] = g;
              data[blockIndex + 2] = b;
            }
          }
        }
      }
    }

    imgData.data.set(data);
    return imgData;
  };

  const applyAtkinson = (imgData, width, height) => {
    const data = new Uint8ClampedArray(imgData.data);
    const isMonochrome = colorMode === "blackAndWhite";

    // Apply dithering with pattern size
    for (let y = 0; y < height; y += patternSize) {
      for (let x = 0; x < width; x += patternSize) {
        const i = (y * width + x) * 4;

        if (isMonochrome) {
          // For monochrome: convert to grayscale first
          const grayValue = Math.round(
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          );
          const newValue = grayValue > 128 ? 255 : 0;

          // Apply the same value to the entire pattern block
          for (let dy = 0; dy < patternSize && y + dy < height; dy++) {
            for (let dx = 0; dx < patternSize && x + dx < width; dx++) {
              const blockIndex = ((y + dy) * width + (x + dx)) * 4;
              data[blockIndex] =
                data[blockIndex + 1] =
                data[blockIndex + 2] =
                  newValue;
            }
          }

          // Calculate error
          const error = (grayValue - newValue) * intensity;

          // Distribute 1/8 of error to neighboring pattern blocks
          const errorPixels = [
            [1, 0],
            [2, 0], // right, 2 right
            [-1, 1],
            [0, 1],
            [1, 1], // left down, down, right down
            [0, 2], // 2 down
          ];

          for (const [dx, dy] of errorPixels) {
            const nx = x + dx * patternSize;
            const ny = y + dy * patternSize;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const ni = (ny * width + nx) * 4;
              const errorVal = error / 8;
              data[ni] =
                data[ni + 1] =
                data[ni + 2] =
                  Math.max(0, Math.min(255, data[ni] + errorVal));
            }
          }
        } else {
          // For color: process each channel separately
          for (let c = 0; c < 3; c++) {
            const oldValue = data[i + c];
            const newValue = oldValue > 128 ? 255 : 0;

            // Apply the same value to the entire pattern block
            for (let dy = 0; dy < patternSize && y + dy < height; dy++) {
              for (let dx = 0; dx < patternSize && x + dx < width; dx++) {
                const blockIndex = ((y + dy) * width + (x + dx)) * 4;
                data[blockIndex + c] = newValue;
              }
            }

            // Calculate error
            const error = (oldValue - newValue) * intensity;

            // Distribute 1/8 of error to neighboring pattern blocks
            const errorPixels = [
              [1, 0],
              [2, 0], // right, 2 right
              [-1, 1],
              [0, 1],
              [1, 1], // left down, down, right down
              [0, 2], // 2 down
            ];

            for (const [dx, dy] of errorPixels) {
              const nx = x + dx * patternSize;
              const ny = y + dy * patternSize;

              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const ni = (ny * width + nx) * 4;
                data[ni + c] += error / 8;
              }
            }
          }
        }
      }
    }

    imgData.data.set(data);
    return imgData;
  };

  // Apply a box blur to the image data
  const applyBlur = (ctx, width, height, radius) => {
    if (radius <= 0) return;

    // Use the built-in canvas blur filter
    ctx.filter = `blur(${radius}px)`;

    // Need to redraw the image with the filter applied
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = width;
    tempCanvas.height = height;

    // Draw the original image to the temp canvas
    tempCtx.drawImage(ctx.canvas, 0, 0);

    // Clear and redraw with blur
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(tempCanvas, 0, 0);

    // Reset filter
    ctx.filter = "none";
  };

  // Apply effect every time state changes
  useEffect(() => {
    if (!image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // First draw the original image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Apply preprocessing effects

      // 1. Apply contrast and brightness
      const tempCanvas1 = document.createElement("canvas");
      const tempCtx1 = tempCanvas1.getContext("2d");
      tempCanvas1.width = canvas.width;
      tempCanvas1.height = canvas.height;
      tempCtx1.filter = `contrast(${contrast}) brightness(${lightness})`;
      tempCtx1.drawImage(canvas, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas1, 0, 0);

      // 2. Apply blur if needed
      if (blurAmount > 0) {
        applyBlur(ctx, canvas.width, canvas.height, blurAmount);
      }

      // Get image data for dithering
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Apply dithering algorithm
      let resultImgData;
      if (algorithm === "Floyd-Steinberg") {
        resultImgData = applyFloydSteinberg(
          imgData,
          canvas.width,
          canvas.height
        );
      } else if (algorithm === "Bayer Matrix") {
        resultImgData = applyBayerDithering(
          imgData,
          canvas.width,
          canvas.height
        );
      } else if (algorithm === "Atkinson") {
        resultImgData = applyAtkinson(imgData, canvas.width, canvas.height);
      }

      // Apply the final processed image data
      ctx.putImageData(resultImgData || imgData, 0, 0);
    };

    img.src = image;
  }, [
    image,
    algorithm,
    contrast,
    lightness,
    intensity,
    colorMode,
    patternSize,
    blurAmount,
  ]);

  const handleReset = () => {
    setAlgorithm("Floyd-Steinberg");
    setIntensity(1);
    setContrast(1);
    setLightness(1);
    setColorMode("color");
    setPatternSize(1);
    setBlurAmount(0);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");
    link.download = "dithered-image.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-purple-300 mb-2">
            Dither Effect Studio
          </h1>
          <p className="text-gray-400">
            Transform your images with adjustable dithering patterns
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Canvas Section */}
          <div className="lg:w-2/3 flex flex-col items-center">
            <div className="w-full bg-gray-800 p-4 rounded-lg shadow-lg mb-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-purple-300">
                  Image Preview
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    disabled={!image}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-md transition-colors font-medium text-sm"
                  >
                    Download
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors font-medium text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center">
                {!image && (
                  <div className="flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg w-full h-64 mb-4">
                    <p className="text-gray-500">Upload an image to begin</p>
                  </div>
                )}

                {image && (
                  <div className="mb-4 w-full overflow-auto bg-gray-950 p-2 rounded-lg">
                    <canvas
                      ref={canvasRef}
                      className="max-w-full mx-auto"
                    ></canvas>
                  </div>
                )}

                <div className="w-full">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      ref={inputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="w-full flex items-center justify-center py-3 px-4 bg-purple-600 hover:bg-purple-700 transition-colors rounded-md cursor-pointer font-medium"
                    >
                      Choose Image
                    </label>
                  </div>
                  {fileName !== "No file selected" && (
                    <p className="mt-2 text-sm text-gray-400 text-center">
                      {fileName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="lg:w-1/3">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full">
              <h2 className="text-xl font-semibold text-purple-300 mb-6">
                Dithering Controls
              </h2>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-300">
                    Algorithm
                  </label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value)}
                  >
                    <option>Floyd-Steinberg</option>
                    <option>Bayer Matrix</option>
                    <option>Atkinson</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-300">
                    Color Mode
                  </label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={colorMode}
                    onChange={(e) => setColorMode(e.target.value)}
                  >
                    <option value="color">Color (RGB)</option>
                    <option value="blackAndWhite">Black & White</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between">
                      <label className="block text-sm font-medium text-gray-300">
                        Pattern Size
                      </label>
                      <span className="text-sm text-purple-300">
                        {patternSize}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={patternSize}
                      onChange={(e) => setPatternSize(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <label className="block text-sm font-medium text-gray-300">
                        Effect Intensity
                      </label>
                      <span className="text-sm text-purple-300">
                        {intensity.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={intensity}
                      onChange={(e) => setIntensity(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <label className="block text-sm font-medium text-gray-300">
                        Contrast
                      </label>
                      <span className="text-sm text-purple-300">
                        {contrast.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={contrast}
                      onChange={(e) => setContrast(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <label className="block text-sm font-medium text-gray-300">
                        Lightness
                      </label>
                      <span className="text-sm text-purple-300">
                        {lightness.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={lightness}
                      onChange={(e) => setLightness(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <label className="block text-sm font-medium text-gray-300">
                        Blur
                      </label>
                      <span className="text-sm text-purple-300">
                        {blurAmount.toFixed(1)}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={blurAmount}
                      onChange={(e) =>
                        setBlurAmount(parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-2"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-700">
                <h3 className="text-md font-semibold text-gray-300 mb-2">
                  Algorithm Info
                </h3>
                <p className="text-gray-400 text-sm">
                  {algorithm === "Floyd-Steinberg" &&
                    "Floyd-Steinberg dithering uses error diffusion to approximate colors, distributing quantization errors to neighboring pixels."}
                  {algorithm === "Bayer Matrix" &&
                    "Bayer Matrix uses a deterministic pattern threshold map to create a regular, structured dithering pattern."}
                  {algorithm === "Atkinson" &&
                    "Atkinson dithering spreads error to fewer neighboring pixels, creating a cleaner look while preserving details."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
