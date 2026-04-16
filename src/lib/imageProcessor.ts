export async function enhanceImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Simple contrast/brightness enhancement
      // Formula: (value - 128) * contrast + 128 + brightness
      const contrast = 1.2; 
      const brightness = 10;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = (data[i] - 128) * contrast + 128 + brightness;     // R
        data[i + 1] = (data[i + 1] - 128) * contrast + 128 + brightness; // G
        data[i + 2] = (data[i + 2] - 128) * contrast + 128 + brightness; // B
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = imageSrc;
  });
}
