const axios = require('axios');
const logger = require('../utils/logger');

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MODEL = 'phi3'; // Selected installed tactical model

/**
 * Handles mission-critical Tactical AI chat requests using Local Ollama Engine.
 * Injects real-time local telemetry to ground responses in reality.
 */
const handleTacticalChat = async (userMessage, chatHistory, localTelemetry) => {
  try {
    // 1. Construct the System Prompt using live telemetry
    // This grounds the local offline LLM to provide hyper-local, accurate advice instead of generic
    const liveContext = `
CURRENT MISSION TELEMETRY:
- Location Coordinates: [${localTelemetry.lat || 'UNKNOWN'}, ${localTelemetry.lon || 'UNKNOWN'}]
- Risk Assessment: ${localTelemetry.risk_level || 'LOW'} (${localTelemetry.disaster_type || 'None'})
- Action Context: ${localTelemetry.message || 'Standard Operating Procedure'}
- Rainfall (1h): ${localTelemetry.weather?.rain_1h || 0}mm
- Wind Speed: ${localTelemetry.weather?.wind_speed || 0} m/s
    `;

    const systemPrompt = `
You are the NEURIX Tactical Command AI, an advanced, highly pragmatic disaster response unit and intelligent assistant running completely offline.
Your primary directive is to provide life-saving, concise, and highly accurate tactical advice, but you are also fully capable of answering any general knowledge questions the user asks.
You have access to real-time telemetry. Do NOT make up weather or disaster data; base your assessments heavily on the CURRENT MISSION TELEMETRY provided below.

${liveContext}

Guidelines:
1. Speak in a concise, tactical, and authoritative but calm tone.
2. If Risk Assessment is HIGH, heavily prioritize survival instructions over general chatter.
3. If the user asks a general knowledge question, answer it accurately and intelligently.
4. If asked about current weather, refer strictly to the telemetry data provided.
5. If the user speaks in Hindi or Hinglish, YOU MUST REPLY IN HINDI or HINGLISH.
    `;

    // 2. Format History for Ollama Payload
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map(m => ({ 
        role: m.role === 'assistant' ? 'assistant' : 'user', 
        content: m.text || m.content || '' 
      })),
      { role: 'user', content: userMessage }
    ];

    // 3. Call Local Ollama AI Engine
    // Note: Local execution might take significantly longer depending on hardware.
    const response = await axios.post(OLLAMA_URL, {
      model: OLLAMA_MODEL,
      messages: messages,
      stream: false,
      options: {
        temperature: 0.3, // Lower temperature for more deterministic, tactical responses
      }
    }, { timeout: 35000 }); 

    const reply = response.data.message?.content;
    return { reply: reply || "NEURAL_LINK_EMPTY_RESPONSE" };

  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      logger.error(`Ollama Error: Local LLM Engine unreachable at ${OLLAMA_URL}. Ensure Ollama is actively running in the background.`);
      return { reply: "OFFLINE_MODE :: TACTICAL LOCAL AI UNAVAILABLE. PLEASE START OLLAMA NODE (e.g., 'ollama run llama3')." };
    }
    logger.error(`Local AI Integration Error: ${error.message}`);
    return { reply: "SYSTEM_ERROR :: LOCAL COGNITIVE ENGINE FAULT. FALLING BACK TO STANDARD PROCEDURES." };
  }
};

module.exports = { handleTacticalChat };
