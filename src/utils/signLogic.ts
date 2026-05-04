
export interface Landmark {
  x: number; y: number; z: number;
}

export const detectHandSign = (landmarks: Landmark[], handedness: string): string => {
  if (!landmarks || landmarks.length < 21) return "";

  // Helper jarak (Euclidean) untuk mengukur jarak antar dua titik (sangat stabil)
  const dist = (p1: Landmark, p2: Landmark) => Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);

  // Status Jari Terbuka/Tertutup (berdasarkan posisi ujung jari vs buku jari)
  const isIndexOpen = landmarks[8].y < landmarks[6].y;
  const isMiddleOpen = landmarks[12].y < landmarks[10].y;
  const isRingOpen = landmarks[16].y < landmarks[14].y;
  const isPinkyOpen = landmarks[20].y < landmarks[18].y;

  // Menghitung ukuran telapak tangan sebagai acuan skala jarak (relatif) agar berfungsi tidak peduli sedekat/sejauh apa user dari kamera
  const palmSize = dist(landmarks[0], landmarks[9]);

  // Status Jempol yang jauh lebih akurat (menggunakan skala telapak tangan)
  // Jempol direntangkan jauh dari telapak tangan (Sangat efektif untuk mendeteksi L dan Y)
  const isThumbOut = dist(landmarks[4], landmarks[17]) > (palmSize * 1.2) && landmarks[4].x < landmarks[5].x === (handedness === "Left"); // "Left" di MediaPipe = Tangan Kanan asli
  
  // Cek jika jari berdekatan (Touching) - gunakan toleransi berdasarkan palmSize
  const thumbTouchesIndex = dist(landmarks[4], landmarks[8]) < (palmSize * 0.3);
  const thumbTouchesMiddle = dist(landmarks[4], landmarks[12]) < (palmSize * 0.3);
  const indexTouchesMiddle = dist(landmarks[8], landmarks[12]) < (palmSize * 0.25);

  // Semua jari utama tertutup
  const isFolded = !isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen;

  // ================= LOGIKA A-Z YANG DIPERKUAT =================

  // L: Telunjuk terbuka, jempol direntangkan ke samping, sisanya tertutup
  if (isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen && dist(landmarks[4], landmarks[17]) > (palmSize * 1.2)) return "L";

  // Y: Hanya kelingking dan jempol terbuka, sisanya tertutup
  if (!isIndexOpen && !isMiddleOpen && !isRingOpen && isPinkyOpen && dist(landmarks[4], landmarks[17]) > (palmSize * 1.2)) return "Y";

  // U: Telunjuk dan tengah terbuka rapat, sisanya tertutup
  if (isIndexOpen && isMiddleOpen && !isRingOpen && !isPinkyOpen && indexTouchesMiddle) return "U";

  // V (Peace): Telunjuk dan tengah terbuka tapi terpisah (membentuk V)
  if (isIndexOpen && isMiddleOpen && !isRingOpen && !isPinkyOpen && !indexTouchesMiddle) return "V";

  // W: Tiga jari tengah terbuka
  if (isIndexOpen && isMiddleOpen && isRingOpen && !isPinkyOpen) return "W";

  // I: Hanya kelingking yang tegak berdiri
  if (!isIndexOpen && !isMiddleOpen && !isRingOpen && isPinkyOpen && !isThumbOut) return "I";

  // D: Hanya telunjuk terbuka, jempol menyentuh jari tengah
  if (isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen && thumbTouchesMiddle) return "D";

  // F: Tiga jari terbuka, jempol menyentuh telunjuk (OK sign)
  if (!isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen && thumbTouchesIndex) return "F";

  // O: Semua jari melengkung dan jempol menyentuh telunjuk/tengah
  if (isFolded && thumbTouchesIndex) return "O";

  // B: Semua 4 jari tegak rapat, jempol ditekuk ke dalam telapak
  if (isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen && dist(landmarks[4], landmarks[17]) < 0.15) return "B";

  // A: Semua tertutup, jempol tegak di samping telunjuk (tidak melipat ke dalam)
  if (isFolded && !thumbTouchesIndex && dist(landmarks[4], landmarks[5]) < 0.1) return "A";

  // E: Semua tertutup sangat rapat (jempol melipat ke dalam telapak)
  if (isFolded && dist(landmarks[4], landmarks[17]) < 0.1) return "E";

  // K: V sign tapi jempol ada di antara telunjuk dan tengah
  if (isIndexOpen && isMiddleOpen && !isRingOpen && !isPinkyOpen && thumbTouchesMiddle && !indexTouchesMiddle) return "K";

  // Tambahan default untuk mencegah error
  return "";
};
