require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

async function test() {
    try {
        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY || "dummy"
        });

        console.log("Testing Gemini API call...");
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Hello",
        });
        console.log("Response:", response.text);
    } catch (err) {
        console.error("Error encountered:", err.message);
    }
}

test();
