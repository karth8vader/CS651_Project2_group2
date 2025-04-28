/**
 * Resizes and compresses an image from base64 data
 * 
 * @param {string} base64Data - The base64-encoded image data without data URL prefix
 * @param {number} maxWidth - Maximum width of the resized image (default: 800px)
 * @param {number} quality - JPEG compression quality between 0 and 1 (default: 0.7)
 * @returns {Promise<string>} - Promise resolving to compressed base64 data without data URL prefix
 * 
 * This function takes a base64-encoded image, resizes it to maintain aspect ratio
 * while not exceeding maxWidth, and compresses it to reduce file size.
 * Used for optimizing images before sending to the server.
 */
export const resizeAndCompressImage = async (base64Data, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        try {
            // Create an image element to load the original image
            const img = new Image();
            img.onload = () => {
                // Calculate new dimensions while maintaining aspect ratio
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                // Create a canvas element for drawing the resized image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                // Draw the image on the canvas at the new dimensions
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert canvas to compressed base64 data using specified quality
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

                // Remove the data URL prefix to get just the base64 data
                const base64Data = compressedBase64.split(',')[1];

                resolve(base64Data);
            };

            img.onerror = (error) => {
                console.error('Error loading image for compression:', error);
                reject(error);
            };

            // Set the source of the image (assuming PNG format, but works with JPEG too)
            img.src = `data:image/png;base64,${base64Data}`;
        } catch (error) {
            console.error('Error in image compression:', error);
            reject(error);
        }
    });
};

/**
 * Draws an image and its bounding boxes on a canvas element
 * 
 * @param {Object} selectedPhoto - The photo object containing URL information
 * @param {Object} selectedData - Data from Vision API containing bounding polygons
 * @param {React.RefObject} canvasRef - React reference to the canvas element
 * @returns {void}
 * 
 * This function loads the selected image onto a canvas and draws black boxes over
 * detected faces, labels, and text based on the bounding polygon data from the
 * Google Vision API. This is used for privacy protection and visualization of
 * detected elements in the image.
 */
export const drawImageAndBoxes = (selectedPhoto, selectedData, canvasRef) => {
    // Return early if any required parameters are missing
    if (!selectedPhoto || !selectedData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
        // Set canvas dimensions to match the loaded image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the original image on the canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Draw bounding boxes if available in the data
        if (selectedData.boundingPolys) {
            // Set fill style to black for all bounding boxes
            ctx.fillStyle = 'black';

            // Draw black boxes over detected faces for privacy
            if (selectedData.boundingPolys.faces) {
                selectedData.boundingPolys.faces.forEach(poly => {
                    if (poly.vertices && poly.vertices.length >= 4) {
                        ctx.beginPath();
                        ctx.moveTo(poly.vertices[0].x, poly.vertices[0].y);
                        for (let i = 1; i < poly.vertices.length; i++) {
                            ctx.lineTo(poly.vertices[i].x, poly.vertices[i].y);
                        }
                        ctx.closePath();
                        ctx.fill();
                    }
                });
            }

            // Draw boxes for detected object labels
            if (selectedData.boundingPolys.labels) {
                selectedData.boundingPolys.labels.forEach(item => {
                    const poly = item.boundingPoly;
                    if (poly && poly.vertices && poly.vertices.length >= 4) {
                        ctx.beginPath();
                        ctx.moveTo(poly.vertices[0].x, poly.vertices[0].y);
                        for (let i = 1; i < poly.vertices.length; i++) {
                            ctx.lineTo(poly.vertices[i].x, poly.vertices[i].y);
                        }
                        ctx.closePath();
                        ctx.fill();
                    }
                });
            }

            // Draw boxes for detected text elements
            if (selectedData.boundingPolys.text) {
                selectedData.boundingPolys.text.forEach(item => {
                    const poly = item.boundingPoly;
                    if (poly && poly.vertices && poly.vertices.length >= 4) {
                        ctx.beginPath();
                        ctx.moveTo(poly.vertices[0].x, poly.vertices[0].y);
                        for (let i = 1; i < poly.vertices.length; i++) {
                            ctx.lineTo(poly.vertices[i].x, poly.vertices[i].y);
                        }
                        ctx.closePath();
                        ctx.fill();
                    }
                });
            }
        }
    };

    // Load the image with width parameter for Google Photos API
    img.src = `${selectedPhoto.url}=w400`;
};
