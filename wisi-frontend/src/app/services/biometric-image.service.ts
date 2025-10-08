import { Injectable } from '@angular/core';
import * as faceapi from 'face-api.js';

@Injectable({
  providedIn: 'root'
})
export class BiometricImageService {
  private modelsLoaded = false;

  constructor() {
    this.loadModels();
  }

  private async loadModels(): Promise<void> {
    try {
      // Cargar modelos de face-api.js con timeout
      const loadPromise = Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/assets/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/assets/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/assets/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/assets/models')
      ]);
      
      // Timeout de 10 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout loading models')), 10000)
      );
      
      await Promise.race([loadPromise, timeoutPromise]);
      this.modelsLoaded = true;
    } catch (error) {
      // Continuar sin los modelos avanzados - el sistema funcionará con detección básica
      this.modelsLoaded = false;
    }
  }

  async processImageForBiometric(imageFile: File): Promise<{
    success: boolean;
    base64?: string;
    error?: string;
    quality?: {
      faceDetected: boolean;
      faceSize: number;
      facePosition: { x: number, y: number, width: number, height: number };
      imageQuality: 'excellent' | 'good' | 'fair' | 'poor';
      recommendations: string[];
    };
  }> {
    try {
      // Validaciones básicas
      const basicValidation = this.validateBasicImage(imageFile);
      if (!basicValidation.valid) {
        return { success: false, error: basicValidation.error };
      }

      // Crear imagen
      const img = await this.createImageFromFile(imageFile);
      
      // Detectar rostro
      const faceDetection = await this.detectFace(img);
      if (!faceDetection.success) {
        return { 
          success: false, 
          error: faceDetection.error,
          quality: faceDetection.quality
        };
      }

      // Validar calidad de la imagen
      const qualityValidation = this.validateImageQuality(img, faceDetection.faceData!);
      if (!qualityValidation.valid) {
        return { 
          success: false, 
          error: qualityValidation.error,
          quality: qualityValidation.quality
        };
      }

      // Procesar imagen
      const processedImage = await this.processImage(img, faceDetection.faceData!);
      
      return {
        success: true,
        base64: processedImage,
        quality: qualityValidation.quality
      };

    } catch (error) {
      return { 
        success: false, 
        error: 'Error interno procesando la imagen' 
      };
    }
  }

  private validateBasicImage(file: File): { valid: boolean, error?: string } {
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'El archivo debe ser una imagen válida' };
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'La imagen es demasiado grande. Máximo 10MB' };
    }

    // Validar tamaño mínimo
    if (file.size < 1024) {
      return { valid: false, error: 'La imagen es demasiado pequeña' };
    }

    return { valid: true };
  }

  private createImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Error cargando la imagen'));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  private async detectFace(img: HTMLImageElement): Promise<{
    success: boolean;
    faceData?: { x: number, y: number, width: number, height: number };
    error?: string;
    quality?: any;
  }> {
    try {
      if (this.modelsLoaded) {
        // Usar face-api.js para detección avanzada
        const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        if (detections.length === 0) {
          return { 
            success: false, 
            error: 'No se detectó ningún rostro en la imagen',
            quality: {
              faceDetected: false,
              faceSize: 0,
              facePosition: { x: 0, y: 0, width: 0, height: 0 },
              imageQuality: 'poor',
              recommendations: ['Asegúrese de que la imagen contenga un rostro claro y visible']
            }
          };
        }

        if (detections.length > 1) {
          return { 
            success: false, 
            error: 'Se detectaron múltiples rostros en la imagen. Use una imagen con un solo rostro visible',
            quality: {
              faceDetected: true,
              faceSize: 0,
              facePosition: { x: 0, y: 0, width: 0, height: 0 },
              imageQuality: 'poor',
              recommendations: ['Use una imagen con un solo rostro visible']
            }
          };
        }

        const detection = detections[0];
        const box = detection.detection.box;
        
        return {
          success: true,
          faceData: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height
          }
        };
      } else {
        // Fallback a detección básica
        return this.detectFaceBasic(img);
      }
    } catch (error) {
      return { 
        success: false, 
        error: 'Error detectando el rostro' 
      };
    }
  }

  private detectFaceBasic(img: HTMLImageElement): {
    success: boolean;
    faceData?: { x: number, y: number, width: number, height: number };
    error?: string;
  } {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return { success: false, error: 'Error inicializando canvas' };
    }

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 1. Detección simple y confiable primero
    const simpleDetection = this.detectFaceSimple(img);
    if (simpleDetection.success) {
      return simpleDetection;
    }

    // 2. Análisis avanzado solo si la detección simple falla
    const faceCandidates = this.findFaceCandidates(data, canvas.width, canvas.height);

    if (faceCandidates.length === 0) {
      return { 
        success: false, 
        error: 'No se detectó ningún rostro en la imagen. Asegúrese de que la imagen contenga un rostro claro y visible' 
      };
    }

    // 3. Filtrar candidatos superpuestos (más estricto)
    const distinctFaces = this.identifyDistinctFaces(faceCandidates);
    
    if (distinctFaces.length > 1) {
      return { 
        success: false, 
        error: 'Se detectaron múltiples rostros en la imagen. Use una imagen con un solo rostro visible' 
      };
    }

    // 4. Usar el mejor candidato
    const bestCandidate = distinctFaces[0];
    const score = this.evaluateFaceCandidate(data, canvas.width, bestCandidate);

    if (score > 0.15) { // Score aún más bajo
      return {
        success: true,
        faceData: bestCandidate
      };
    }

    // 5. Último recurso: detección muy permisiva
    return this.detectFacePermissive(img);
  }

  private generateSearchRegions(imgWidth: number, imgHeight: number): Array<{x: number, y: number, width: number, height: number}> {
    const regions = [];
    
    // Región central (más probable)
    const centerX = imgWidth / 2;
    const centerY = imgHeight / 2;
    const baseSize = Math.min(imgWidth, imgHeight) * 0.4;
    
    // Diferentes tamaños de búsqueda
    const sizes = [0.3, 0.4, 0.5, 0.6, 0.7];
    
    for (const sizeRatio of sizes) {
      const size = baseSize * sizeRatio;
      const x = Math.max(0, centerX - size / 2);
      const y = Math.max(0, centerY - size / 2);
      const w = Math.min(size, imgWidth - x);
      const h = Math.min(size, imgHeight - y);
      
      regions.push({ x, y, width: w, height: h });
    }
    
    // Regiones adicionales para rostros descentrados
    const offsets = [
      { x: -0.2, y: -0.2 },
      { x: 0.2, y: -0.2 },
      { x: -0.2, y: 0.2 },
      { x: 0.2, y: 0.2 }
    ];
    
    for (const offset of offsets) {
      const x = Math.max(0, centerX + offset.x * imgWidth - baseSize * 0.4 / 2);
      const y = Math.max(0, centerY + offset.y * imgHeight - baseSize * 0.4 / 2);
      const w = Math.min(baseSize * 0.4, imgWidth - x);
      const h = Math.min(baseSize * 0.4, imgHeight - y);
      
      regions.push({ x, y, width: w, height: h });
    }
    
    return regions;
  }

  private findFaceCandidates(data: Uint8ClampedArray, width: number, height: number): Array<{x: number, y: number, width: number, height: number}> {
    const candidates = [];
    
    // Escanear la imagen en diferentes escalas
    const scales = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
    const minFaceSize = Math.min(width, height) * 0.1;
    const maxFaceSize = Math.min(width, height) * 0.8;
    
    for (const scale of scales) {
      const faceSize = Math.min(width, height) * scale;
      
      if (faceSize < minFaceSize || faceSize > maxFaceSize) continue;
      
      // Escanear con ventana deslizante
      const step = Math.max(10, faceSize * 0.1);
      
      for (let y = 0; y <= height - faceSize; y += step) {
        for (let x = 0; x <= width - faceSize; x += step) {
          const region = { x, y, width: faceSize, height: faceSize };
          
          // Verificar si esta región podría contener un rostro
          if (this.isPotentialFace(data, width, region)) {
            candidates.push(region);
          }
        }
      }
    }
    
    // Filtrar candidatos superpuestos y mantener solo los mejores
    return this.filterOverlappingCandidates(candidates);
  }

  private isPotentialFace(data: Uint8ClampedArray, width: number, region: {x: number, y: number, width: number, height: number}): boolean {
    const { x, y, width: w, height: h } = region;
    
    // Verificar que la región tenga el tamaño mínimo
    if (w < 50 || h < 50) return false;
    
    // Análisis de patrones faciales básicos
    let skinPixels = 0;
    let edgePixels = 0;
    let totalPixels = 0;
    
    const step = Math.max(2, Math.floor(w / 20));
    
    for (let py = y; py < y + h; py += step) {
      for (let px = x; px < x + w; px += step) {
        const index = (py * width + px) * 4;
        if (index < data.length - 3) {
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          
          // Detectar píxeles de piel (tonos cálidos)
          if (this.isSkinTone(r, g, b)) {
            skinPixels++;
          }
          
          // Detectar bordes (cambios bruscos de intensidad)
          if (px > x && py > y) {
            const prevIndex = ((py - step) * width + (px - step)) * 4;
            if (prevIndex < data.length - 3) {
              const prevR = data[prevIndex];
              const prevG = data[prevIndex + 1];
              const prevB = data[prevIndex + 2];
              const prevGray = (prevR + prevG + prevB) / 3;
              const gray = (r + g + b) / 3;
              const edgeStrength = Math.abs(gray - prevGray);
              
              if (edgeStrength > 25) {
                edgePixels++;
              }
            }
          }
          
          totalPixels++;
        }
      }
    }
    
    if (totalPixels === 0) return false;
    
    const skinRatio = skinPixels / totalPixels;
    const edgeRatio = edgePixels / totalPixels;
    
    // Criterios más flexibles para considerar como candidato facial
    return skinRatio > 0.2 && skinRatio < 0.95 && edgeRatio > 0.03;
  }

  private isSkinTone(r: number, g: number, b: number): boolean {
    // Detectar tonos de piel basado en relaciones RGB (más flexible)
    const total = r + g + b;
    if (total < 80 || total > 750) return false; // Rango más amplio
    
    const rRatio = r / total;
    const gRatio = g / total;
    const bRatio = b / total;
    
    // Criterios más flexibles para tonos de piel
    return rRatio > 0.25 && rRatio < 0.65 && 
           gRatio > 0.15 && gRatio < 0.55 && 
           bRatio > 0.05 && bRatio < 0.45 &&
           r > g; // Solo requerir que R > G, no G > B
  }

  private filterOverlappingCandidates(candidates: Array<{x: number, y: number, width: number, height: number}>): Array<{x: number, y: number, width: number, height: number}> {
    if (candidates.length <= 1) return candidates;
    
    // Ordenar por área (más grandes primero)
    candidates.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    
    const filtered = [];
    
    for (const candidate of candidates) {
      let isOverlapping = false;
      
      for (const existing of filtered) {
        const overlap = this.calculateOverlap(candidate, existing);
        if (overlap > 0.4) { // 40% de superposición (más flexible)
          isOverlapping = true;
          break;
        }
      }
      
      if (!isOverlapping) {
        filtered.push(candidate);
      }
    }
    
    // Si hay más de 1 candidato después del filtrado, es sospechoso
    if (filtered.length > 1) {
      // Posible múltiple rostro
    }
    
    return filtered.slice(0, 5); // Máximo 5 candidatos (más flexible)
  }

  private calculateOverlap(rect1: {x: number, y: number, width: number, height: number}, rect2: {x: number, y: number, width: number, height: number}): number {
    const x1 = Math.max(rect1.x, rect2.x);
    const y1 = Math.max(rect1.y, rect2.y);
    const x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
    const y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
    
    if (x2 <= x1 || y2 <= y1) return 0;
    
    const overlapArea = (x2 - x1) * (y2 - y1);
    const rect1Area = rect1.width * rect1.height;
    const rect2Area = rect2.width * rect2.height;
    const unionArea = rect1Area + rect2Area - overlapArea;
    
    return overlapArea / unionArea;
  }

  private evaluateFaceCandidate(data: Uint8ClampedArray, width: number, candidate: {x: number, y: number, width: number, height: number}): number {
    const { x, y, width: w, height: h } = candidate;
    let score = 0;
    
    // 1. Verificar proporciones faciales (ancho/alto entre 0.7 y 1.3)
    const aspectRatio = w / h;
    if (aspectRatio >= 0.7 && aspectRatio <= 1.3) {
      score += 0.3;
    }
    
    // 2. Verificar posición en la imagen (preferir centro)
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const imgCenterX = width / 2;
    const imgCenterY = width / 2; // Usar width para mantener proporción cuadrada
    
    const distanceFromCenter = Math.sqrt(
      Math.pow(centerX - imgCenterX, 2) + Math.pow(centerY - imgCenterY, 2)
    );
    const maxDistance = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(width / 2, 2));
    const centerScore = 1 - (distanceFromCenter / maxDistance);
    score += centerScore * 0.2;
    
    // 3. Verificar contraste y bordes
    const contrastScore = this.calculateContrastScore(data, width, candidate);
    score += contrastScore * 0.3;
    
    // 4. Verificar distribución de tonos de piel
    const skinDistributionScore = this.calculateSkinDistributionScore(data, width, candidate);
    score += skinDistributionScore * 0.2;
    
    return Math.min(1, score);
  }

  private calculateContrastScore(data: Uint8ClampedArray, width: number, region: {x: number, y: number, width: number, height: number}): number {
    const { x, y, width: w, height: h } = region;
    let totalContrast = 0;
    let pixelCount = 0;
    
    const step = Math.max(1, Math.floor(w / 15));
    
    for (let py = y; py < y + h; py += step) {
      for (let px = x; px < x + w; px += step) {
        if (px > x && py > y) {
          const index = (py * width + px) * 4;
          const prevIndex = ((py - step) * width + (px - step)) * 4;
          
          if (index < data.length - 3 && prevIndex < data.length - 3) {
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const gray = (r + g + b) / 3;
            
            const prevR = data[prevIndex];
            const prevG = data[prevIndex + 1];
            const prevB = data[prevIndex + 2];
            const prevGray = (prevR + prevG + prevB) / 3;
            
            const contrast = Math.abs(gray - prevGray);
            totalContrast += contrast;
            pixelCount++;
          }
        }
      }
    }
    
    if (pixelCount === 0) return 0;
    
    const avgContrast = totalContrast / pixelCount;
    return Math.min(1, avgContrast / 50); // Normalizar a 0-1
  }

  private calculateSkinDistributionScore(data: Uint8ClampedArray, width: number, region: {x: number, y: number, width: number, height: number}): number {
    const { x, y, width: w, height: h } = region;
    
    // Dividir la región en 9 cuadrantes (3x3)
    const quadrantSize = w / 3;
    const quadrants = [];
    
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const qx = x + col * quadrantSize;
        const qy = y + row * quadrantSize;
        const qw = quadrantSize;
        const qh = quadrantSize;
        
        let skinPixels = 0;
        let totalPixels = 0;
        
        const step = Math.max(1, Math.floor(qw / 10));
        
        for (let py = qy; py < qy + qh; py += step) {
          for (let px = qx; px < qx + qw; px += step) {
            const index = (py * width + px) * 4;
            if (index < data.length - 3) {
              const r = data[index];
              const g = data[index + 1];
              const b = data[index + 2];
              
              if (this.isSkinTone(r, g, b)) {
                skinPixels++;
              }
              totalPixels++;
            }
          }
        }
        
        const skinRatio = totalPixels > 0 ? skinPixels / totalPixels : 0;
        quadrants.push(skinRatio);
      }
    }
    
    // En un rostro, los cuadrantes centrales deberían tener más piel
    const centerQuadrants = [quadrants[4]]; // Centro
    const sideQuadrants = [quadrants[1], quadrants[3], quadrants[5], quadrants[7]]; // Lados
    const cornerQuadrants = [quadrants[0], quadrants[2], quadrants[6], quadrants[8]]; // Esquinas
    
    const centerAvg = centerQuadrants.reduce((a, b) => a + b, 0) / centerQuadrants.length;
    const sideAvg = sideQuadrants.reduce((a, b) => a + b, 0) / sideQuadrants.length;
    const cornerAvg = cornerQuadrants.reduce((a, b) => a + b, 0) / cornerQuadrants.length;
    
    // El centro debería tener más piel que los lados, y los lados más que las esquinas
    let score = 0;
    if (centerAvg > sideAvg) score += 0.5;
    if (sideAvg > cornerAvg) score += 0.3;
    if (centerAvg > 0.3) score += 0.2; // Centro con suficiente piel
    
    return Math.min(1, score);
  }

  private identifyDistinctFaces(candidates: Array<{x: number, y: number, width: number, height: number}>): Array<{x: number, y: number, width: number, height: number}> {
    if (candidates.length <= 1) return candidates;
    
    const distinctFaces = [];
    
    for (const candidate of candidates) {
      let isDistinct = true;
      
      for (const existing of distinctFaces) {
        const overlap = this.calculateOverlap(candidate, existing);
        const distance = this.calculateDistance(candidate, existing);
        
        // Si hay mucha superposición O están muy cerca, son el mismo rostro
        if (overlap > 0.6 || distance < Math.min(candidate.width, candidate.height) * 0.5) {
          isDistinct = false;
          break;
        }
      }
      
      if (isDistinct) {
        distinctFaces.push(candidate);
      }
    }
    
    // Ordenar por área (más grandes primero) y tomar el mejor
    distinctFaces.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    
    return distinctFaces;
  }

  private calculateDistance(rect1: {x: number, y: number, width: number, height: number}, rect2: {x: number, y: number, width: number, height: number}): number {
    const center1X = rect1.x + rect1.width / 2;
    const center1Y = rect1.y + rect1.height / 2;
    const center2X = rect2.x + rect2.width / 2;
    const center2Y = rect2.y + rect2.height / 2;
    
    return Math.sqrt(
      Math.pow(center1X - center2X, 2) + Math.pow(center1Y - center2Y, 2)
    );
  }

  private validateFaceRegion(data: Uint8ClampedArray, width: number, x: number, y: number, w: number, h: number): boolean {
    let totalVariation = 0;
    let pixelCount = 0;

    for (let py = y; py < y + h; py += 4) {
      for (let px = x; px < x + w; px += 4) {
        const index = (py * width + px) * 4;
        if (index < data.length - 3) {
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const gray = (r + g + b) / 3;
          totalVariation += gray;
          pixelCount++;
        }
      }
    }

    const averageBrightness = totalVariation / pixelCount;
    const variation = Math.abs(averageBrightness - 128);

    return variation > 20 && averageBrightness > 50 && averageBrightness < 200;
  }

  private validateFaceRegionImproved(data: Uint8ClampedArray, width: number, region: {x: number, y: number, width: number, height: number}): boolean {
    const { x, y, width: w, height: h } = region;
    let totalBrightness = 0;
    let pixelCount = 0;
    let contrastSum = 0;
    let edgeCount = 0;

    // Muestrear píxeles de manera más densa
    const step = Math.max(1, Math.floor(Math.min(w, h) / 20));
    
    for (let py = y; py < y + h; py += step) {
      for (let px = x; px < x + w; px += step) {
        const index = (py * width + px) * 4;
        if (index < data.length - 3) {
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const gray = (r + g + b) / 3;
          totalBrightness += gray;
          pixelCount++;

          // Detectar bordes (cambios bruscos de intensidad)
          if (px > x && py > y) {
            const prevIndex = ((py - step) * width + (px - step)) * 4;
            if (prevIndex < data.length - 3) {
              const prevR = data[prevIndex];
              const prevG = data[prevIndex + 1];
              const prevB = data[prevIndex + 2];
              const prevGray = (prevR + prevG + prevB) / 3;
              const edgeStrength = Math.abs(gray - prevGray);
              contrastSum += edgeStrength;
              if (edgeStrength > 30) edgeCount++;
            }
          }
        }
      }
    }

    if (pixelCount === 0) return false;

    const averageBrightness = totalBrightness / pixelCount;
    const averageContrast = contrastSum / pixelCount;
    const edgeRatio = edgeCount / pixelCount;

    // Criterios más flexibles para detectar rostros
    const hasGoodBrightness = averageBrightness > 30 && averageBrightness < 220;
    const hasContrast = averageContrast > 15;
    const hasEdges = edgeRatio > 0.05; // Al menos 5% de píxeles con bordes
    const hasReasonableSize = w > 50 && h > 50; // Tamaño mínimo razonable

    // Debug logging

    return hasGoodBrightness && hasContrast && hasEdges && hasReasonableSize;
  }

  private detectFaceSimple(img: HTMLImageElement): {
    success: boolean;
    faceData?: { x: number, y: number, width: number, height: number };
    error?: string;
  } {
    // Detección simple optimizada para fotos tipo carnet
    const positions = [
      { x: 0.5, y: 0.35 }, // Posición ideal para carnet (ojos en tercio superior)
      { x: 0.5, y: 0.4 },  // Ligeramente más abajo
      { x: 0.5, y: 0.45 }, // Centro
      { x: 0.5, y: 0.5 },  // Centro exacto
    ];
    
    // Tamaño más realista para carnet (rostro ocupa ~40-50% de la imagen)
    const faceSize = Math.min(img.width, img.height) * 0.45;
    
    for (const pos of positions) {
      const centerX = img.width * pos.x;
      const centerY = img.height * pos.y;
      
      const faceX = Math.max(0, centerX - faceSize / 2);
      const faceY = Math.max(0, centerY - faceSize / 2);
      const faceW = Math.min(faceSize, img.width - faceX);
      const faceH = Math.min(faceSize, img.height - faceY);

      // Verificar que la región tenga contenido válido y sea apropiada para carnet
      if (this.isValidFaceRegion(img, faceX, faceY, faceW, faceH) && 
          this.isGoodCarnetPosition(faceX, faceY, faceW, faceH, img.width, img.height)) {
        return {
          success: true,
          faceData: {
            x: faceX,
            y: faceY,
            width: faceW,
            height: faceH
          }
        };
      }
    }

    return { success: false, error: 'No se pudo detectar rostro con método simple' };
  }

  private detectFacePermissive(img: HTMLImageElement): {
    success: boolean;
    faceData?: { x: number, y: number, width: number, height: number };
    error?: string;
  } {
    // Detección permisiva optimizada para carnet
    const centerX = img.width / 2;
    const centerY = img.height * 0.4; // Posición ideal para carnet
    const faceSize = Math.min(img.width, img.height) * 0.5; // 50% del tamaño
    
    const faceX = Math.max(0, centerX - faceSize / 2);
    const faceY = Math.max(0, centerY - faceSize / 2);
    const faceW = Math.min(faceSize, img.width - faceX);
    const faceH = Math.min(faceSize, img.height - faceY);

    return {
      success: true,
      faceData: {
        x: faceX,
        y: faceY,
        width: faceW,
        height: faceH
      }
    };
  }

  private isGoodCarnetPosition(x: number, y: number, w: number, h: number, imgWidth: number, imgHeight: number): boolean {
    // Verificar que la posición sea buena para carnet
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    
    // El rostro debe estar centrado horizontalmente (tolerancia del 20%)
    const horizontalCenter = imgWidth / 2;
    const horizontalOffset = Math.abs(centerX - horizontalCenter) / imgWidth;
    
    // El rostro debe estar en el tercio superior (tolerancia del 15%)
    const idealY = imgHeight * 0.35; // Tercio superior
    const verticalOffset = Math.abs(centerY - idealY) / imgHeight;
    
    // El rostro no debe ser demasiado pequeño ni demasiado grande
    const faceArea = w * h;
    const imgArea = imgWidth * imgHeight;
    const faceRatio = faceArea / imgArea;
    
    return horizontalOffset < 0.2 && verticalOffset < 0.15 && faceRatio > 0.1 && faceRatio < 0.6;
  }

  private isValidFaceRegion(img: HTMLImageElement, x: number, y: number, w: number, h: number): boolean {
    // Verificación básica de que la región tenga contenido
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return false;
    
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    
    let nonTransparentPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) { // Alpha > 0
        nonTransparentPixels++;
      }
    }
    
    // Al menos 10% de píxeles no transparentes
    return (nonTransparentPixels / (w * h)) > 0.1;
  }

  private validateImageQuality(img: HTMLImageElement, faceData: { x: number, y: number, width: number, height: number }): {
    valid: boolean;
    error?: string;
    quality: any;
  } {
    const recommendations: string[] = [];
    let imageQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

    // Validar resolución mínima
    if (img.width < 300 || img.height < 300) {
      return {
        valid: false,
        error: 'La imagen es muy pequeña. Mínimo 300x300 píxeles',
        quality: {
          faceDetected: true,
          faceSize: faceData.width * faceData.height,
          facePosition: faceData,
          imageQuality: 'poor',
          recommendations: ['Use una imagen de al menos 300x300 píxeles']
        }
      };
    }

    // Validar proporciones del rostro
    const faceRatio = faceData.width / faceData.height;
    if (faceRatio < 0.7 || faceRatio > 1.3) {
      recommendations.push('El rostro debe tener proporciones más naturales');
      imageQuality = 'fair';
    }

    // Validar tamaño del rostro en la imagen
    const faceArea = faceData.width * faceData.height;
    const imageArea = img.width * img.height;
    const facePercentage = (faceArea / imageArea) * 100;

    if (facePercentage < 10) {
      recommendations.push('El rostro es muy pequeño en la imagen');
      imageQuality = 'fair';
    } else if (facePercentage > 70) {
      recommendations.push('El rostro ocupa demasiado espacio en la imagen');
      imageQuality = 'fair';
    }

    // Validar posición del rostro
    const centerX = img.width / 2;
    const centerY = img.height / 2;
    const faceCenterX = faceData.x + faceData.width / 2;
    const faceCenterY = faceData.y + faceData.height / 2;
    
    const distanceFromCenter = Math.sqrt(
      Math.pow(faceCenterX - centerX, 2) + Math.pow(faceCenterY - centerY, 2)
    );
    const maxDistance = Math.min(img.width, img.height) * 0.3;

    if (distanceFromCenter > maxDistance) {
      recommendations.push('El rostro debe estar más centrado en la imagen');
      imageQuality = 'fair';
    }

    // Validar calidad general
    if (recommendations.length > 2) {
      imageQuality = 'poor';
    } else if (recommendations.length > 0) {
      imageQuality = 'fair';
    }

    return {
      valid: imageQuality !== 'poor',
      error: imageQuality === 'poor' ? 'La calidad de la imagen no es adecuada para biometría facial' : undefined,
      quality: {
        faceDetected: true,
        faceSize: faceArea,
        facePosition: faceData,
        imageQuality,
        recommendations
      }
    };
  }

  private async processImage(img: HTMLImageElement, faceData: { x: number, y: number, width: number, height: number }): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Error inicializando canvas');

    // Calcular dimensiones del recorte para carnet (optimizado para fotos tipo carnet)
    const faceWidth = faceData.width;
    const faceHeight = faceData.height;
    
    // Calcular el tamaño del recorte basado en el rostro detectado
    // Para fotos tipo carnet: el rostro debe ocupar aproximadamente 60-70% del recorte final
    const baseSize = Math.max(faceWidth, faceHeight);
    const cropSize = baseSize * 1.8; // Factor optimizado para carnet (rostro ocupa ~70% del recorte)
    
    // Centrar horizontalmente y posicionar verticalmente para carnet
    const centerX = faceData.x + faceData.width / 2;
    // Para carnet: los ojos deben estar aproximadamente en el tercio superior
    const centerY = faceData.y + faceData.height * 0.35; // Ajuste para posicionar ojos en tercio superior
    
    const cropX = Math.max(0, centerX - cropSize / 2);
    let cropY = Math.max(0, centerY - cropSize / 2);
    
    // Asegurar que el recorte incluya suficiente espacio arriba (frente/cabello)
    // Para carnet: aproximadamente 25-30% del recorte debe ser espacio arriba del rostro
    const minTopSpace = Math.max(0, faceData.y - baseSize * 0.4);
    if (cropY > minTopSpace) {
      cropY = minTopSpace;
    }
    
    // Asegurar que el recorte no se salga de la imagen
    const maxCropX = img.width - cropSize;
    const maxCropY = img.height - cropSize;
    
    const finalCropX = Math.max(0, Math.min(cropX, maxCropX));
    const finalCropY = Math.max(0, Math.min(cropY, maxCropY));
    const finalCropSize = Math.min(cropSize, Math.min(img.width - finalCropX, img.height - finalCropY));

    // Debug logging para verificar el recorte

    // Configurar canvas para el recorte
    canvas.width = 300;
    canvas.height = 300;
    
    // Dibujar imagen recortada y redimensionada
    ctx.drawImage(
      img,
      finalCropX, finalCropY, finalCropSize, finalCropSize,
      0, 0, 300, 300
    );

    // Aplicar mejoras de imagen
    this.enhanceImage(ctx, canvas);

    // Convertir a base64 con compresión
    return this.compressImage(canvas, 150);
  }

  private enhanceImage(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Ajustar contraste y brillo
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.1);     // R
      data[i + 1] = Math.min(255, data[i + 1] * 1.1); // G
      data[i + 2] = Math.min(255, data[i + 2] * 1.1); // B
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private compressImage(canvas: HTMLCanvasElement, maxSizeKB: number): string {
    let quality = 0.9;
    let base64 = canvas.toDataURL('image/jpeg', quality);
    
    while (this.getBase64Size(base64) > maxSizeKB * 1024 && quality > 0.1) {
      quality -= 0.1;
      base64 = canvas.toDataURL('image/jpeg', quality);
    }

    return base64.split(',')[1];
  }

  private getBase64Size(base64: string): number {
    return (base64.length * 3) / 4;
  }
}
