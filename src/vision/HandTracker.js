/**
 * HandTracker.js - Extractor Biomecánico Robusto e Invariante a la Rotación
 * Evalúa los dedos mediante vectores relativos a la base de la palma y distancias euclidianas normalizadas.
 */

export class HandTracker {
  constructor(videoElement, onResultsCallback) {
    this.video = videoElement;
    this.onResults = onResultsCallback;
    this.hands = null;
    this.camera = null;
    this.isCameraReady = false;
  }

  async init() {
    const telemStatus = document.getElementById('telem-cam-status');

    if (!window.Hands || !window.Camera) {
      if (telemStatus) telemStatus.innerText = 'ERROR: MEDIA-PIPE CDN NO ENCONTRADO';
      return;
    }

    try {
      this.hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      // Modelo con confianza sólida para eliminar temblores
      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.72,
        minTrackingConfidence: 0.72
      });

      this.hands.onResults((results) => {
        const parsedHands = [];

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          results.multiHandLandmarks.forEach((landmarks, handIdx) => {
            // Coordenadas espejadas normalizadas y en espacio de pantalla
            const points = landmarks.map((lm, id) => ({
              id,
              x: (1 - lm.x) * window.innerWidth,
              y: lm.y * window.innerHeight,
              z: lm.z,
              rawX: 1 - lm.x,
              rawY: lm.y,
              rawZ: lm.z
            }));

            // Centro geométrico de la palma
            const palmCenter = {
              x: (points[0].x + points[5].x + points[17].x) / 3,
              y: (points[0].y + points[5].y + points[17].y) / 3
            };

            // Escala biométrica de la mano: distancia de la muñeca (0) a la base del dedo medio (9)
            // Esto permite que el sistema funcione igual si estás cerca o lejos de la cámara
            const handScale = Math.hypot(points[9].x - points[0].x, points[9].y - points[0].y);
            const safeScale = Math.max(handScale, 30);

            // Vector booleano estricto de dedos levantados [Pulgar, Índice, Medio, Anular, Meñique]
            const fingers = this.computeFingersBiometrics(points, safeScale);
            const [thumbUp, indexUp, middleUp, ringUp, pinkyUp] = fingers;

            const extendedFingersCount = indexUp + middleUp + ringUp + pinkyUp;

            // Distancia de pellizco normalizada (Yema Pulgar 4 <-> Yema Índice 8)
            const rawPinchDist = Math.hypot(points[4].x - points[8].x, points[4].y - points[8].y);
            const pinchRatio = rawPinchDist / safeScale;
            const isPinching = pinchRatio < 0.28; // Contacto físico seguro

            // Separación métrica entre las yemas del Índice (8) y el Medio (12)
            // Esencial para distinguir "Mi" (juntos) de "Si" (abiertos en V)
            const rawIndexMiddleDist = Math.hypot(points[8].x - points[12].x, points[8].y - points[12].y);
            const indexMiddleSeparation = rawIndexMiddleDist / safeScale;

            // Distancia promedio de las 4 puntas a la muñeca (para detectar puño cerrado inequívoco)
            const avgTipDistToWrist = (
              Math.hypot(points[8].x - points[0].x, points[8].y - points[0].y) +
              Math.hypot(points[12].x - points[0].x, points[12].y - points[0].y) +
              Math.hypot(points[16].x - points[0].x, points[16].y - points[0].y) +
              Math.hypot(points[20].x - points[0].x, points[20].y - points[0].y)
            ) / (4 * safeScale);

            const isFist = extendedFingersCount === 0 && avgTipDistToWrist < 1.15;
            const isPeaceSign = indexUp && middleUp && !ringUp && !pinkyUp && (indexMiddleSeparation > 0.42);

            // Envergadura métrica real (Punta 4 a Punta 20)
            const spanDist = Math.hypot(points[4].x - points[20].x, points[4].y - points[20].y);

            // =========================================================================
            // ÁRBOL DE DECISIÓN DIATÓNICO ESTRICTO Y MUTUAMENTE EXCLUYENTE
            // =========================================================================
            let detectedNote = 'Do';
            let gestureName = 'Puño Cerrado';

            // 1. Prioridad: Gesto de Pellizco de Precisión -> NOTA LA
            if (isPinching) {
              detectedNote = 'La';
              gestureName = 'Pellizco (Pulgar + Índice)';
            }
            // 2. Prioridad: Señal de Paz (Índice y Medio SEPARADOS en V) -> NOTA SI
            else if (isPeaceSign) {
              detectedNote = 'Si';
              gestureName = 'Señal de Paz / V (Separados)';
            }
            // 3. Prioridad: Mano completa abierta (4 o 5 dedos levantados)
            else if (extendedFingersCount === 4) {
              // Si la mano está en la parte superior de la pantalla -> DO' (Octava alta)
              if (palmCenter.y < window.innerHeight * 0.38) {
                detectedNote = "Do'";
                gestureName = 'Mano Abierta (Zona Alta)';
              } else {
                detectedNote = 'Sol';
                gestureName = 'Mano Abierta (5 Dedos)';
              }
            }
            // 4. Prioridad: 3 Dedos (Índice + Medio + Anular) -> NOTA FA
            else if (indexUp && middleUp && ringUp && !pinkyUp) {
              detectedNote = 'Fa';
              gestureName = '3 Dedos (Índice + Medio + Anular)';
            }
            // 5. Prioridad: 2 Dedos JUNTOS (Índice + Medio pegados, separación <= 0.42) -> NOTA MI
            else if (indexUp && middleUp && !ringUp && !pinkyUp && (indexMiddleSeparation <= 0.42)) {
              detectedNote = 'Mi';
              gestureName = '2 Dedos Juntos (Índice + Medio)';
            }
            // 6. Prioridad: Solo 1 Dedo (Índice extendido solitario) -> NOTA RE
            else if (indexUp && !middleUp && !ringUp && !pinkyUp) {
              detectedNote = 'Re';
              gestureName = '1 Dedo (Solo Índice)';
            }
            // 7. Prioridad: Puño cerrado o mano replegada -> NOTA DO
            else if (isFist || extendedFingersCount === 0) {
              detectedNote = 'Do';
              gestureName = 'Puño Cerrado (Mano Base)';
            }
            // 8. Caso de transición: no cambiar erráticamente
            else {
              detectedNote = indexUp ? 'Re' : 'Do';
              gestureName = 'Gesto de Transición';
            }

            const role = (results.multiHandLandmarks.length === 2 && handIdx === 0 && points[0].x < window.innerWidth * 0.5)
              ? 'LEFT_MODULATOR'
              : 'RIGHT_LEAD';

            parsedHands.push({
              landmarks: points,
              palmCenter,
              fingers,
              fingersCount: extendedFingersCount,
              hasThumb: thumbUp,
              spanDist,
              pinchDist: rawPinchDist,
              isFist,
              isPinching,
              isPeaceSign,
              detectedNote,
              gestureName,
              role,
              tagAnchor: {
                x: points[8].x + 35,
                y: points[8].y - 25
              }
            });
          });
        }

        this.onResults(parsedHands);
      });

      this.camera = new window.Camera(this.video, {
        onFrame: async () => {
          if (this.video.videoWidth > 0) {
            await this.hands.send({ image: this.video });
          }
        },
        width: 640,
        height: 480
      });

      await this.camera.start();
      this.isCameraReady = true;

      if (telemStatus) {
        telemStatus.innerText = 'CÁMARA CALIBRADA';
        telemStatus.className = 'green';
      }
    } catch (err) {
      console.error('Error al inicializar HandTracker:', err);
      if (telemStatus) {
        telemStatus.innerText = 'ERROR EN CÁMARA';
        telemStatus.className = 'warn';
      }
    }
  }

  /**
   * Biometría Invariante: evalúa si cada dedo está extendido calculando la relación
   * de distancia entre la punta (TIP) y la muñeca vs. la articulación intermedia (PIP) y la muñeca.
   */
  computeFingersBiometrics(pts, scale) {
    const fingers = [0, 0, 0, 0, 0];

    // --- PULGAR (Dedos 1 a 4) ---
    // Distancia de la punta del pulgar (4) al nudillo base del meñique (17) y al índice (5)
    const thumbTipDistToPinky = Math.hypot(pts[4].x - pts[17].x, pts[4].y - pts[17].y);
    const thumbPipDistToPinky = Math.hypot(pts[2].x - pts[17].x, pts[2].y - pts[17].y);
    if (thumbTipDistToPinky > thumbPipDistToPinky * 1.15) {
      fingers[0] = 1;
    }

    // --- LOS 4 DEDOS PRINCIPALES ---
    // Tips: 8 (Índice), 12 (Medio), 16 (Anular), 20 (Meñique)
    // PIPs: 6 (Índice), 10 (Medio), 14 (Anular), 18 (Meñique)
    // MCPs: 5 (Índice), 9  (Medio), 13 (Anular), 17 (Meñique)
    const fingerData = [
      { tip: 8,  pip: 6,  mcp: 5,  idx: 1 },
      { tip: 12, pip: 10, mcp: 9,  idx: 2 },
      { tip: 16, pip: 14, mcp: 13, idx: 3 },
      { tip: 20, pip: 18, mcp: 17, idx: 4 }
    ];

    fingerData.forEach(({ tip, pip, mcp, idx }) => {
      // 1. Distancia euclidiana de la punta a la muñeca (0)
      const distTipToWrist = Math.hypot(pts[tip].x - pts[0].x, pts[tip].y - pts[0].y);
      // 2. Distancia euclidiana de la articulación media a la muñeca
      const distPipToWrist = Math.hypot(pts[pip].x - pts[0].x, pts[pip].y - pts[0].y);
      // 3. Distancia de la punta al nudillo base (MCP)
      const distTipToMcp = Math.hypot(pts[tip].x - pts[mcp].x, pts[tip].y - pts[mcp].y);

      // Un dedo está verdaderamente extendido si su punta está significativamente más lejos
      // de la muñeca que su articulación media Y la distancia punta-nudillo supera el 65% de la escala de la palma
      const isExtendedFromWrist = distTipToWrist > (distPipToWrist * 1.12);
      const isPhysicallyLong = distTipToMcp > (scale * 0.62);

      if (isExtendedFromWrist && isPhysicallyLong) {
        fingers[idx] = 1;
      }
    });

    return fingers;
  }
}