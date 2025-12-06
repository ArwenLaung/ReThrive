import * as tmImage from '@teachablemachine/image';

const URL = "https://teachablemachine.withgoogle.com/models/RefprrX4V/";

let model, maxPredictions;

// Load the model from Google's servers
export const loadModel = async () => {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        return true;
    } catch (error) {
        console.error("Error loading AI model:", error);
        return false;
    }
};

// Predict the class of an image
export const classifyImage = async (imageElement) => {
    if (!model) {
        const success = await loadModel();
        if (!success) return null;
    }
    
    // Get predictions
    const prediction = await model.predict(imageElement);
    
    // Sort them so the highest confidence is first
    prediction.sort((a, b) => b.probability - a.probability);

    // Return the best guess
    return prediction[0];
};