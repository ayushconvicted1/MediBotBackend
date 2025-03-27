import { GoogleGenerativeAI } from "@google/generative-ai";
import express from "express";
import Chat from "../models/Chat.js";
import dotenv from "dotenv";
import generatePrescriptionPDF from "../utils/PrescriptionGenerator.js";

dotenv.config();

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const chat = async (req, res) => {
  const { prompt, chatId, userName } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-pro-exp-02-05" });
  const question =
    chatId === ""
      ? `
        You are a highly experienced and knowledgeable doctor. 
        Your job is to provide accurate and professional medical advice. 
        The user asks: "${prompt}". 
        
        Provide a clear, detailed, and medically sound response. 
        If it's about symptoms, suggest a possible diagnosis and treatment. 
        If it's about medicine, provide usage instructions and side effects. 
        If it's about general health, give expert guidance.
        
        Always include a note advising when to consult a real doctor if needed.
        Don't make it too long.
    `
      : prompt;
  try {
    const chat =
      chatId !== ""
        ? await Chat.findById(chatId)
        : new Chat({
            title: prompt.length > 20 ? prompt.slice(0, 20) + "..." : prompt,
            userName,
            messages: [],
          });
    chat.messages.push({ message: prompt, role: "user" });
    const sanitizedMessages = chat.messages.map((message, index) => ({
      parts: [{ text: index === 0 ? question : message.message }],
      role: message.role === "doctor" ? "user" : message.role,
    }));
    const result = await model.generateContent({ contents: sanitizedMessages });
    const response = result.response;
    const answer = response.text();
    chat.messages.push({ message: answer, role: "doctor" });
    await chat.save();
    res.json(chat);
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch response from Gemini API." });
  }
};

const chatHistory = async (req, res) => {
  const { userName } = req.body;
  try {
    const chat = await Chat.find({ userName: userName });
    console.log(chat);

    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const generateSymptomQuestions = async (req, res) => {
  const { symptom } = req.body;
  if (!symptom) {
    return res.status(400).json({ error: "Symptom is required" });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-pro-exp-02-05",
    });
    const prompt = `
      As a medical professional, generate 5-7 key questions to assess a patient reporting: "${symptom}".
      The questions should cover:
      - Symptom characteristics
      - Duration and progression
      - Associated symptoms
      - Medical history
      - Lifestyle factors
      
      Return as JSON array with question objects containing:
      - question (text)
      - key (short identifier like "duration", "severity", etc.)
      - category (characteristics, history, etc.)
      
      Format:
      {
        "questions": [
          {
            "key": "duration",
            "category": "characteristics",
            "question": "How long have you been experiencing this symptom?"
          },
          ...
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    const jsonString = text.slice(jsonStart, jsonEnd);

    const data = JSON.parse(jsonString);
    res.json(data);
  } catch (error) {
    console.error("Error generating symptom questions:", error);
    res.status(500).json({ error: "Failed to generate symptom questions." });
  }
};

const generatePrescriptionFromQnA = async (req, res) => {
  const { qna, userName } = req.body;

  if (!qna || !Array.isArray(qna)) {
    return res.status(400).json({ error: "QnA array is required" });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-pro-exp-02-05",
    });

    const qnaText = qna
      .map(
        (item) => `Q: ${item.question}\nA: ${item.answer || "Not specified"}`
      )
      .join("\n\n");

    const prompt = `
      Generate a medical assessment and prescription based on the following Q&A:
      
      ${qnaText}
      
      Your response should include:
      1. A brief summary of likely condition(s)
      2. Recommended medications with dosage
      3. General care instructions
      4. When to seek immediate medical attention
      
      Format the response as JSON with:
      {
        "summary": "Brief condition summary",
        "medications": [
          {
            "name": "Medication name",
            "dosage": "Dosage instructions",
            "purpose": "What it treats"
          }
        ],
        "instructions": "General care instructions",
        "warning": "When to seek immediate help",
        "disclaimer": "AI-generated disclaimer text"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    const jsonString = text.slice(jsonStart, jsonEnd);

    const prescriptionData = JSON.parse(jsonString);

    const prescriptionBlob = await generatePrescriptionPDF(prescriptionData);
    const prescriptionBuffer = await blobToBuffer(prescriptionBlob);
    const chat = new Chat({
      title: qnaText.length > 50 ? qnaText.slice(0, 50) + "..." : qnaText,
      userName: userName,
      messages: [
        { message: qnaText, role: "user" },
        {
          message: text,
          role: "doctor",
          pdfBlob: prescriptionBuffer,
          prescriptionData: prescriptionData,
        },
      ],
    });

    chat.save();

    res.json({
      pdfBase64: prescriptionBuffer.toString("base64"),
      prescriptionData,
    });
  } catch (error) {
    console.error("Error generating prescription:", error);
    res.status(500).json({ error: "Failed to generate prescription." });
  }
};

async function blobToBuffer(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

router.post("/", chat);
router.post("/history", chatHistory);
router.post("/questions", generateSymptomQuestions);
router.post("/prescription", generatePrescriptionFromQnA);

export default router;
