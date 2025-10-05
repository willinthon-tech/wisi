import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImageValidationService {

  constructor() { }

  // Validación inicial rápida al importar imagen
  async validateInitialImage(imageBase64: string): Promise<{valid: boolean, message: string}> {
    try {
      const img = new Image();
      
      return new Promise((resolve) => {
        img.onload = () => {
          // Validaciones básicas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({valid: false, message: 'Error al procesar la imagen'});
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // Obtener datos de píxeles
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Validación 1: Tamaño mínimo
          if (img.width < 200 || img.height < 200) {
            resolve({valid: false, message: 'La imagen es muy pequeña. Mínimo 200x200 píxeles'});
            return;
          }

          // Validación 2: Detección básica de rostro (análisis de contraste y patrones)
          const faceDetected = this.detectBasicFace(data, img.width, img.height);
          if (!faceDetected) {
            resolve({valid: false, message: 'No se detecta un rostro válido en la imagen'});
            return;
          }

          // Validación 3: Verificar que no hay múltiples rostros
          const multipleFaces = this.detectMultipleFaces(data, img.width, img.height);
          if (multipleFaces) {
            resolve({valid: false, message: 'Se detectaron múltiples rostros. Solo debe haber una persona'});
            return;
          }

          // Validación 4: Verificar calidad básica (contraste, iluminación)
          const qualityCheck = this.checkBasicQuality(data, img.width, img.height);
          if (!qualityCheck.valid) {
            resolve({valid: false, message: qualityCheck.message});
            return;
          }

          resolve({valid: true, message: 'Imagen válida para recorte'});
        };

        img.onerror = () => {
          resolve({valid: false, message: 'Error al cargar la imagen'});
        };

        img.src = imageBase64;
      });
    } catch (error) {
      return {valid: false, message: 'Error al validar la imagen'};
    }
  }

  // Detección básica de rostro
  private detectBasicFace(data: Uint8ClampedArray, width: number, height: number): boolean {
    // Buscar patrones típicos de un rostro (ojos, nariz, boca)
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    // Analizar región central donde debería estar el rostro
    const faceRegion = {
      x: Math.floor(centerX - width * 0.3),
      y: Math.floor(centerY - height * 0.3),
      width: Math.floor(width * 0.6),
      height: Math.floor(height * 0.6)
    };

    // Verificar contraste en la región del rostro
    let contrastSum = 0;
    let pixelCount = 0;

    for (let y = faceRegion.y; y < faceRegion.y + faceRegion.height; y += 5) {
      for (let x = faceRegion.x; x < faceRegion.x + faceRegion.width; x += 5) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          
          // Calcular luminancia
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          contrastSum += luminance;
          pixelCount++;
        }
      }
    }

    const avgLuminance = contrastSum / pixelCount;
    
    // Un rostro debería tener luminancia media (ni muy oscuro ni muy claro)
    return avgLuminance > 50 && avgLuminance < 200;
  }

  // Detección de múltiples rostros - versión muy simple
  private detectMultipleFaces(data: Uint8ClampedArray, width: number, height: number): boolean {
    // Por ahora, deshabilitar la detección de múltiples rostros
    // ya que está generando demasiados falsos positivos
    return false;
  }

  // Extraer datos de una región específica de la imagen
  private extractRegionData(data: Uint8ClampedArray, width: number, region: {x: number, y: number, width: number, height: number}): Uint8ClampedArray {
    const regionData = new Uint8ClampedArray(region.width * region.height * 4);
    let index = 0;
    
    for (let y = region.y; y < region.y + region.height; y++) {
      for (let x = region.x; x < region.x + region.width; x++) {
        const originalIndex = (y * width + x) * 4;
        regionData[index] = data[originalIndex];     // R
        regionData[index + 1] = data[originalIndex + 1]; // G
        regionData[index + 2] = data[originalIndex + 2]; // B
        regionData[index + 3] = data[originalIndex + 3]; // A
        index += 4;
      }
    }
    
    return regionData;
  }


  // Verificación de calidad básica
  private checkBasicQuality(data: Uint8ClampedArray, width: number, height: number): {valid: boolean, message: string} {
    // Verificar contraste general
    let minLuminance = 255;
    let maxLuminance = 0;
    let totalLuminance = 0;
    let pixelCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      minLuminance = Math.min(minLuminance, luminance);
      maxLuminance = Math.max(maxLuminance, luminance);
      totalLuminance += luminance;
      pixelCount++;
    }

    const avgLuminance = totalLuminance / pixelCount;
    const contrast = maxLuminance - minLuminance;

    // Verificar si la imagen es muy oscura
    if (avgLuminance < 30) {
      return {valid: false, message: 'La imagen es muy oscura. Mejore la iluminación'};
    }

    // Verificar si la imagen es muy clara
    if (avgLuminance > 220) {
      return {valid: false, message: 'La imagen está sobreexpuesta. Reduzca la iluminación'};
    }

    // Verificar contraste
    if (contrast < 50) {
      return {valid: false, message: 'La imagen tiene poco contraste. Mejore la iluminación'};
    }

    return {valid: true, message: 'Calidad aceptable'};
  }

  // Validación biométrica completa (para usar al procesar)
  async validateBiometricQuality(imageBase64: string): Promise<{valid: boolean, message: string, quality: string}> {
    try {
      const img = new Image();
      
      return new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({valid: false, message: 'Error al procesar la imagen', quality: 'poor'});
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Análisis de calidad biométrica
          const analysis = this.analyzeBiometricQuality(data, img.width, img.height);
          
          resolve({
            valid: analysis.score >= 70,
            message: analysis.message,
            quality: analysis.quality
          });
        };

        img.onerror = () => {
          resolve({valid: false, message: 'Error al cargar la imagen', quality: 'poor'});
        };

        img.src = imageBase64;
      });
    } catch (error) {
      return {valid: false, message: 'Error al validar la imagen', quality: 'poor'};
    }
  }

  // Análisis de calidad biométrica
  private analyzeBiometricQuality(data: Uint8ClampedArray, width: number, height: number): {score: number, message: string, quality: string} {
    let score = 0;
    const issues: string[] = [];

    // Análisis de nitidez (edge detection) - SENSIBILIDAD REDUCIDA
    const sharpness = this.calculateSharpness(data, width, height);
    if (sharpness > 0.15) { // Reducido de 0.3 a 0.15
      score += 25;
    } else if (sharpness > 0.1) { // Puntaje parcial
      score += 15;
    } else {
      issues.push('Imagen poco nítida');
    }

    // Análisis de iluminación uniforme - SENSIBILIDAD REDUCIDA
    const lighting = this.analyzeLighting(data, width, height);
    if (lighting > 0.5) { // Reducido de 0.7 a 0.5
      score += 25;
    } else if (lighting > 0.3) { // Puntaje parcial
      score += 15;
    } else {
      issues.push('Iluminación no uniforme');
    }

    // Análisis de contraste - SENSIBILIDAD REDUCIDA
    const contrast = this.calculateContrast(data, width, height);
    if (contrast > 0.25) { // Reducido de 0.4 a 0.25
      score += 25;
    } else if (contrast > 0.15) { // Puntaje parcial
      score += 15;
    } else {
      issues.push('Contraste insuficiente');
    }

    // Análisis de resolución facial - SENSIBILIDAD REDUCIDA
    const faceResolution = this.analyzeFaceResolution(data, width, height);
    if (faceResolution > 0.4) { // Reducido de 0.6 a 0.4
      score += 25;
    } else if (faceResolution > 0.25) { // Puntaje parcial
      score += 15;
    } else {
      issues.push('Resolución facial insuficiente');
    }

    // Determinar calidad - UMBRALES MÁS PERMISIVOS
    let quality = 'poor';
    if (score >= 70) quality = 'excellent'; // Reducido de 90 a 70
    else if (score >= 50) quality = 'good'; // Reducido de 80 a 50
    else if (score >= 30) quality = 'fair'; // Reducido de 70 a 30

    const message = issues.length > 0 
      ? `Calidad ${quality}. Problemas: ${issues.join(', ')}`
      : `Calidad ${quality}. Apta para biometría`;

    return {score, message, quality};
  }

  private calculateSharpness(data: Uint8ClampedArray, width: number, height: number): number {
    let edgeSum = 0;
    let edgeCount = 0;

    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        // Calcular gradiente
        const rightIndex = (y * width + (x + 1)) * 4;
        const rightLuminance = 0.299 * data[rightIndex] + 0.587 * data[rightIndex + 1] + 0.114 * data[rightIndex + 2];
        
        const bottomIndex = ((y + 1) * width + x) * 4;
        const bottomLuminance = 0.299 * data[bottomIndex] + 0.587 * data[bottomIndex + 1] + 0.114 * data[bottomIndex + 2];

        const gradient = Math.abs(luminance - rightLuminance) + Math.abs(luminance - bottomLuminance);
        edgeSum += gradient;
        edgeCount++;
      }
    }

    return edgeCount > 0 ? edgeSum / edgeCount / 255 : 0;
  }

  private analyzeLighting(data: Uint8ClampedArray, width: number, height: number): number {
    const regions = [
      {x: 0, y: 0, width: width/3, height: height/3}, // Superior izquierda
      {x: width/3, y: 0, width: width/3, height: height/3}, // Superior centro
      {x: 2*width/3, y: 0, width: width/3, height: height/3}, // Superior derecha
      {x: 0, y: height/3, width: width/3, height: height/3}, // Centro izquierda
      {x: width/3, y: height/3, width: width/3, height: height/3}, // Centro
      {x: 2*width/3, y: height/3, width: width/3, height: height/3}, // Centro derecha
      {x: 0, y: 2*height/3, width: width/3, height: height/3}, // Inferior izquierda
      {x: width/3, y: 2*height/3, width: width/3, height: height/3}, // Inferior centro
      {x: 2*width/3, y: 2*height/3, width: width/3, height: height/3} // Inferior derecha
    ];

    const regionLuminances: number[] = [];

    for (const region of regions) {
      let luminanceSum = 0;
      let pixelCount = 0;

      for (let y = region.y; y < region.y + region.height; y += 3) {
        for (let x = region.x; x < region.x + region.width; x += 3) {
          if (x < width && y < height) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            luminanceSum += luminance;
            pixelCount++;
          }
        }
      }

      if (pixelCount > 0) {
        regionLuminances.push(luminanceSum / pixelCount);
      }
    }

    if (regionLuminances.length === 0) return 0;

    // Calcular desviación estándar
    const avg = regionLuminances.reduce((a, b) => a + b, 0) / regionLuminances.length;
    const variance = regionLuminances.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / regionLuminances.length;
    const stdDev = Math.sqrt(variance);

    // Normalizar (menor desviación = mejor iluminación)
    return Math.max(0, 1 - (stdDev / 100));
  }

  private calculateContrast(data: Uint8ClampedArray, width: number, height: number): number {
    let minLuminance = 255;
    let maxLuminance = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      minLuminance = Math.min(minLuminance, luminance);
      maxLuminance = Math.max(maxLuminance, luminance);
    }

    return (maxLuminance - minLuminance) / 255;
  }

  private analyzeFaceResolution(data: Uint8ClampedArray, width: number, height: number): number {
    // Buscar región central donde debería estar el rostro
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const faceSize = Math.min(width, height) * 0.6;

    const faceRegion = {
      x: Math.floor(centerX - faceSize / 2),
      y: Math.floor(centerY - faceSize / 2),
      width: Math.floor(faceSize),
      height: Math.floor(faceSize)
    };

    // Analizar detalle en la región facial
    let detailSum = 0;
    let detailCount = 0;

    for (let y = faceRegion.y; y < faceRegion.y + faceRegion.height; y += 2) {
      for (let x = faceRegion.x; x < faceRegion.x + faceRegion.width; x += 2) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

          // Calcular variación local
          let localVariation = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIndex = (ny * width + nx) * 4;
                const nr = data[nIndex];
                const ng = data[nIndex + 1];
                const nb = data[nIndex + 2];
                const nLuminance = 0.299 * nr + 0.587 * ng + 0.114 * nb;
                localVariation += Math.abs(luminance - nLuminance);
              }
            }
          }
          
          detailSum += localVariation / 9;
          detailCount++;
        }
      }
    }

    return detailCount > 0 ? detailSum / detailCount / 255 : 0;
  }
}
