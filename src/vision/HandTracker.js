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

      // Habilitamos el rastreo de 2 manos simultáneas
      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.65
      });

      this.hands.onResults((results) => {
        const parsedHands = [];

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          results.multiHandLandmarks.forEach((landmarks, handIdx) => {
            // Coordenadas espejadas
            const points = landmarks.map((lm, id) => ({
              id,
              x: (1 - lm.x) * window.innerWidth,
              y: lm.y * window.innerHeight,
              z: lm.z
            }));

            const palmCenter = {
              x: (points[0].x + points[5].x + points[17].x) / 3,
              y: (points[0].y + points[5].y + points[17].y) / 3
            };

            // Vector booleano: [Pulgar, Índice, Medio, Anular, Meñique]
            const fingers = this.getFingersUp(points);
            const fingersCount = fingers[1] + fingers[2] + fingers[3] + fingers[4];
            const hasThumb = fingers[0] === 1;

            // Envergadura métrica real
            const spanDist = Math.hypot(points[4].x - points[20].x, points[4].y - points[20].y);

            // Distancia de pellizco entre pulgar e índice
            const pinchDist = Math.hypot(points[4].x - points[8].x, points[4].y - points[8].y);
            const isPinching = pinchDist < 46;

            // Distancia entre las puntas del Índice (8) y el Medio (12)
            // Clave fundamental para distinguir "Mi" (juntos) de "Si" (abiertos en V)
            const indexMiddleSeparation = Math.hypot(points[8].x - points[12].x, points[8].y - points[12].y);
            const isPeaceSign = fingers[1] === 1 && fingers[2] === 1 && fingers[3] === 0 && fingers[4] === 0 && indexMiddleSeparation > 52;

            const avgFingerDistToWrist = (
              Math.hypot(points[8].x - points[0].x, points[8].y - points[0].y) +
              Math.hypot(points[12].x - points[0].x, points[12].y - points[0].y) +
              Math.hypot(points[16].x - points[0].x, points[16].y - points[0].y) +
              Math.hypot(points[20].x - points[0].x, points[20].y - points[0].y)
            ) / 4;

            const isFist = fingersCount === 0 && avgFingerDistToWrist < 155;

            // MAPEO DETERMINISTA DIATÓNICO ESTRICTO SIN COLISIONES
            let detectedNote = 'Do';
            let gestureName = 'Puño Cerrado';

            if (isPinching) {
              detectedNote = 'La';
              gestureName = 'Pellizco (Pulgar + Índice)';
            } else if (isPeaceSign) {
              // Condición exclusiva para Si: Índice y medio abiertos en V
              detectedNote = 'Si';
              gestureName = 'Señal de Paz / V (Separados)';
            } else if (fingersCount === 4 && hasThumb) {
              if (palmCenter.y < window.innerHeight * 0.38) {
                detectedNote = "Do'";
                gestureName = 'Mano Abierta (Zona Alta)';
              } else {
                detectedNote = 'Sol';
                gestureName = 'Mano Abierta (5 Dedos)';
              }
            } else if (fingersCount === 4) {
              detectedNote = 'Sol';
              gestureName = '4 Dedos Extendidos';
            } else if (fingers[1] === 1 && fingers[2] === 1 && fingers[3] === 1 && fingers[4] === 0) {
              detectedNote = 'Fa';
              gestureName = '3 Dedos (Índice + Medio + Anular)';
            } else if (fingers[1] === 1 && fingers[2] === 1 && fingers[3] === 0 && fingers[4] === 0 && indexMiddleSeparation <= 52) {
              // Condición inequívoca para Mi: Índice y Medio juntos (distancia <= 52px)
              detectedNote = 'Mi';
              gestureName = '2 Dedos Juntos (Índice + Medio)';
            } else if (fingers[1] === 1 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 0) {
              detectedNote = 'Re';
              gestureName = '1 Dedo (Solo Índice)';
            } else if (isFist || fingersCount === 0) {
              detectedNote = 'Do';
              gestureName = 'Puño Cerrado (Mano Base)';
            }

            // Estimación de lateralidad (Mano derecha / izquierda según posición en pantalla)
            const role = (results.multiHandLandmarks.length === 2 && handIdx === 0 && points[0].x < window.innerWidth * 0.5) 
              ? 'LEFT_MODULATOR' 
              : 'RIGHT_LEAD';

            parsedHands.push({
              landmarks: points,
              palmCenter,
              fingers,
              fingersCount,
              hasThumb,
              spanDist,
              pinchDist,
              indexMiddleSeparation,
              avgFingerDistToWrist,
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
        telemStatus.innerText = 'CÁMARA CONECTADA (2 MANOS)';
        telemStatus.className = 'green';
      }
    } catch (err) {
      console.error('Error cámara:', err);
      if (telemStatus) {
        telemStatus.innerText = 'ERROR AL ABRIR CÁMARA';
        telemStatus.className = 'warn';
      }
    }
  }

  getFingersUp(pts) {
    const fingers = [0, 0, 0, 0, 0];

    // Pulgar respecto a carpo
    const thumbDist = Math.hypot(pts[4].x - pts[17].x, pts[4].y - pts[17].y);
    const thumbPipDist = Math.hypot(pts[2].x - pts[17].x, pts[2].y - pts[17].y);
    if (thumbDist > thumbPipDist * 1.12) fingers[0] = 1;

    // Dedos: 8 (Índice), 12 (Medio), 16 (Anular), 20 (Meñique)
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];

    tips.forEach((tipIdx, i) => {
      const pipIdx = pips[i];
      const distTip = Math.hypot(pts[tipIdx].x - pts[0].x, pts[tipIdx].y - pts[0].y);
      const distPip = Math.hypot(pts[pipIdx].x - pts[0].x, pts[pipIdx].y - pts[0].y);

      if (distTip > distPip * 1.08) {
        fingers[i + 1] = 1;
      }
    });

    return fingers;
  }
}