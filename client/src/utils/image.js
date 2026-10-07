// Cloudinary delivers resized, modern-format copies if we ask in the URL. Uploaded originals have no
// transformation segment ("/upload/v123/..."), so we can safely insert one. Anything else is left alone.
const RX = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/;

export function optimizeImage(url, width) {
  const m = typeof url === 'string' && RX.exec(url);
  return m ? `${m[1]}f_auto,q_auto,c_limit,w_${width}/${m[2]}` : url;
}

export function srcSet(url, widths = [480, 800, 1200]) {
  return RX.test(url || '') ? widths.map((w) => `${optimizeImage(url, w)} ${w}w`).join(', ') : undefined;
}

// Square, face-aware crop for the profile portrait (the frame is a circle, so we ask Cloudinary for a 1:1 image
// instead of shipping a wide photo and cropping it in CSS).
const SQUARE = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/;
export function avatarImage(url, width) {
  const m = typeof url === 'string' && SQUARE.exec(url);
  return m ? `${m[1]}f_auto,q_auto,c_fill,g_auto,ar_1:1,w_${width}/${m[2]}` : url;
}
export function avatarSrcSet(url, widths = [360, 560, 800]) {
  return SQUARE.test(url || '') ? widths.map((w) => `${avatarImage(url, w)} ${w}w`).join(', ') : undefined;
}
