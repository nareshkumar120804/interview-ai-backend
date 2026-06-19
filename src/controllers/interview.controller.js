const pdfParse = require("pdf-parse");
const {
    generateInterviewReport,
    generateResumePdf
} = require("../services/ai.service");

const interviewReportModel = require("../models/interviewReport.model");



//  Generate Interview Report

async function generateInterViewReportController(req, res) {
    try {

        if (!req.file) {
            return res.status(400).json({
                message: "Resume file is required."
            });
        }

        let resumeContent;
        try {
            resumeContent = await pdfParse(req.file.buffer);
        } catch (err) {
            return res.status(400).json({ message: "Failed to parse PDF. Please upload a valid PDF file." });
        }

        const { selfDescription, jobDescription } = req.body;

        if (!jobDescription) {
            return res.status(400).json({
                message: "Job description is required."
            });
        }

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeContent.text,
            selfDescription,
            jobDescription
        });

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            title: interViewReportByAi.title || jobDescription?.split("\n")[0] || "Interview Report",

            resume: resumeContent.text,
            selfDescription,
            jobDescription,

            matchScore: interViewReportByAi.matchScore || 0,
            technicalQuestions: interViewReportByAi.technicalQuestions || [],
            behavioralQuestions: interViewReportByAi.behavioralQuestions || [],
            skillGaps: interViewReportByAi.skillGaps || [],
            preparationPlan: interViewReportByAi.preparationPlan || []
        });

        return res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        });

    } catch (error) {
        console.error("generateInterViewReportController Error:", error);

        return res.status(400).json({
            success: false,
            message: error.message || "Something went wrong while generating the report. Please check your Gemini API Key in Render environment variables."
        });
    }
}



//  Get Interview Report by ID

async function getInterviewReportByIdController(req, res) {
    try {

        const { interviewId } = req.params;

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: req.user.id
        });

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            });
        }

        return res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: error.message
        });
    }
}



// Get All Interview Reports

async function getAllInterviewReportsController(req, res) {
    try {

        const interviewReports = await interviewReportModel.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v");

        return res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: error.message
        });
    }
}



// Generate Resume PDF

async function generateResumePdfController(req, res) {
    try {

        const { interviewReportId } = req.params;

        const interviewReport = await interviewReportModel.findById(interviewReportId);

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            });
        }

        const { resume, jobDescription, selfDescription } = interviewReport;

        const pdfBuffer = await generateResumePdf({
            resume,
            jobDescription,
            selfDescription
        });

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        });

        return res.send(pdfBuffer);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: error.message
        });
    }
}



// EXPORTS

module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController
};