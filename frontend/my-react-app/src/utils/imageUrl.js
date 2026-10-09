export const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  return imagePath.startsWith("/")
    ? `${SERVER_URL}${imagePath}`
    : `${SERVER_URL}/${imagePath}`;
};
