import * as tmImage from '@teachablemachine/image';

const URL = "https://teachablemachine.withgoogle.com/models/RefprrX4V/";

let model, maxPredictions;

// Map Teachable Machine class names to actual category names used in the app
const CATEGORY_MAPPING = {
    // Common mappings - adjust these based on your Teachable Machine model's actual class names
    "hostel essentials": "Hostel Essentials",
    "hostel_essentials": "Hostel Essentials",
    "Hostel Essentials": "Hostel Essentials",
    "books": "Books",
    "Books": "Books",
    "electronics": "Electronics",
    "Electronics": "Electronics",
    "stationery": "Stationery",
    "Stationery": "Stationery",
    "fashion": "Fashion & Accessories",
    "fashion & accessories": "Fashion & Accessories",
    "Fashion & Accessories": "Fashion & Accessories",
    "accessories": "Fashion & Accessories",
    "weapon / dangerous items": "Weapon / Dangerous Items",
    "weapon_dangerous_items": "Weapon / Dangerous Items",
    "Weapon / Dangerous Items": "Weapon / Dangerous Items",
    "Restricted Items": "Restricted Items",
    "restricted items": "Restricted Items",
    "restricted_items": "Restricted Items",
    "others": "Others",
    "Others": "Others",
    "other": "Others"
};

// Load the model from Google's servers
export const loadModel = async () => {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        console.log("AI Model loaded successfully. Classes:", maxPredictions);
        return true;
    } catch (error) {
        console.error("Error loading AI model:", error);
        return false;
    }
};

// Map the predicted class name to the actual category used in the app
const mapToCategory = (className) => {
    if (!className) return null;

    // Try exact match first
    if (CATEGORY_MAPPING[className]) {
        return CATEGORY_MAPPING[className];
    }

    // Try case-insensitive match
    const lowerClassName = className.toLowerCase().trim();
    for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
        if (key.toLowerCase() === lowerClassName) {
            return value;
        }
    }

    // If no match found, return the original class name (user can manually select)
    console.warn(`Category mapping not found for: ${className}. Using original.`);
    return className;
};

// Predict the class of an image
export const classifyImage = async (imageElement) => {
    try {
        if (!model) {
            const success = await loadModel();
            if (!success) {
                console.warn("Model failed to load. AI classification skipped.");
                return null;
            }
        }

        // Get predictions
        const predictions = await model.predict(imageElement);

        // Sort them so the highest confidence is first
        predictions.sort((a, b) => b.probability - a.probability);

        const topPrediction = predictions[0];

        // Only return prediction if confidence is above threshold (e.g., 50%)
        if (topPrediction.probability < 0.5) {
            console.log("Low confidence prediction:", topPrediction);
            return null;
        }

        // Map to actual category
        const mappedCategory = mapToCategory(topPrediction.className);

        return {
            className: mappedCategory || topPrediction.className,
            probability: topPrediction.probability,
            originalClassName: topPrediction.className
        };
    } catch (error) {
        console.error("Error classifying image:", error);
        return null;
    }
};