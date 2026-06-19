const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const puppeteer = require("puppeteer");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `
You are a senior FAANG interview coach.

You MUST generate a complete interview report.

RULES:
- Return ONLY valid JSON
- NEVER return empty arrays
- ALWAYS generate:
  - at least 5 technical questions
  - at least 5 behavioral questions
  - at least 5 skill gaps
  - 5 day preparation plan
- If data is missing, assume reasonable industry expectations

OUTPUT FORMAT:
{
  "title": "string",
  "matchScore": number,
  "technicalQuestions": [
    {
      "question": "string",
      "intention": "string",
      "answer": "string"
    }
  ],
  "behavioralQuestions": [
    {
      "question": "string",
      "intention": "string",
      "answer": "string"
    }
  ],
  "skillGaps": [
    {
      "skill": "string",
      "severity": "low | medium | high"
    }
  ],
  "preparationPlan": [
    {
      "day": number,
      "focus": "string",
      "tasks": ["string"]
    }
  ]
}

INPUT:
Resume:
${resume}

Self Description:
${selfDescription}

Job Description:
${jobDescription}
`;

    let text = "";
    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });
        text = response.text;
    } catch (err) {
        console.error("Gemini API Error:", err.message);
        throw new Error("Failed to generate AI response. Please check your Gemini API key or try again.");
    }

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (err) {
        console.error("RAW AI OUTPUT Parse Error:", text);
        parsed = null;
    }

    
    //  FALLBACK SYSTEM
    
    const fallback = {
        title: "Interview Report",
        matchScore: 50,

        technicalQuestions: [
            {
                question: "Explain your main project architecture",
                intention: "Check system design understanding",
                answer: "Explain frontend, backend, database flow clearly"
            }
        ],

        behavioralQuestions: [
            {
                question: "Tell me about a challenging situation you faced",
                intention: "Evaluate problem solving",
                answer: "Use STAR method (Situation, Task, Action, Result)"
            }
        ],

        skillGaps: [
            {
                skill: "System Design",
                severity: "medium"
            }
        ],

        preparationPlan: [
            {
                day: 1,
                focus: "Data Structures Basics",
                tasks: ["Arrays", "Strings", "Basic problems"]
            }
        ]
    };

    
    const sanitizeQuestions = (arr, fb) => {
        if (!Array.isArray(arr) || arr.length === 0) return fb;
        return arr.map(q => ({
            question: q?.question || "No question provided",
            intention: q?.intention || "General assessment",
            answer: q?.answer || "No specific answer expected"
        }));
    };

    const sanitizeSkillGaps = (arr, fb) => {
        if (!Array.isArray(arr) || arr.length === 0) return fb;
        return arr.map(g => ({
            skill: g?.skill || "General Technical Skills",
            severity: ["low", "medium", "high"].includes(g?.severity?.toLowerCase()) ? g.severity.toLowerCase() : "medium"
        }));
    };

    const sanitizePlan = (arr, fb) => {
        if (!Array.isArray(arr) || arr.length === 0) return fb;
        return arr.map((p, i) => ({
            day: Number(p?.day) || (i + 1),
            focus: p?.focus || "General Review",
            tasks: Array.isArray(p?.tasks) && p.tasks.length ? p.tasks : ["Review fundamentals"]
        }));
    };

    return {
        title: parsed?.title || fallback.title,
        matchScore: typeof parsed?.matchScore === 'number' ? parsed.matchScore : fallback.matchScore,
        technicalQuestions: sanitizeQuestions(parsed?.technicalQuestions, fallback.technicalQuestions),
        behavioralQuestions: sanitizeQuestions(parsed?.behavioralQuestions, fallback.behavioralQuestions),
        skillGaps: sanitizeSkillGaps(parsed?.skillGaps, fallback.skillGaps),
        preparationPlan: sanitizePlan(parsed?.preparationPlan, fallback.preparationPlan)
    };
}



//  PDF GENERATOR

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu"
        ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    });

    await browser.close();
    return pdfBuffer;
}



//  RESUME PDF GENERATOR

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const prompt = `
You are a professional resume builder.

Return ONLY JSON:
{
  "html": "<valid HTML resume>"
}

Rules:
- ATS friendly
- 1-2 pages max
- professional design
- human written tone
- clean HTML only

Resume:
${resume}

Self Description:
${selfDescription}

Job Description:
${jobDescription}
`;

    const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    let text = response.text;
    let jsonContent;

    try {
        jsonContent = JSON.parse(text);
    } catch (err) {
        throw new Error("Resume generation failed");
    }

    return await generatePdfFromHtml(jsonContent.html);
}


module.exports = {
    generateInterviewReport,
    generateResumePdf
};