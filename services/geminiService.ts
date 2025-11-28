import { GoogleGenAI, Type } from "@google/genai";
import { Player } from "../types";
import { BOARD_SIZE } from "../constants";

// Helper to format board for the prompt
const formatBoardForPrompt = (grid: Player[][]): string => {
  let s = "   " + Array.from({ length: BOARD_SIZE }, (_, i) => i.toString().padStart(2, '0')).join(' ') + "\n";
  for (let y = 0; y < BOARD_SIZE; y++) {
    s += y.toString().padStart(2, '0') + " ";
    for (let x = 0; x < BOARD_SIZE; x++) {
      const val = grid[y][x];
      const char = val === Player.None ? "." : val === Player.Black ? "B" : "W";
      s += ` ${char} `;
    }
    s += "\n";
  }
  return s;
};

export const getGeminiMove = async (grid: Player[][], player: Player): Promise<{ x: number; y: number; reasoning: string }> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const boardStr = formatBoardForPrompt(grid);
  const playerStr = player === Player.Black ? "Black (B)" : "White (W)";
  
  const prompt = `
    You are a Grandmaster Gomoku (Five-in-a-Row) player.
    The board size is 15x15.
    
    Current Board State:
    ${boardStr}

    You are playing as ${playerStr}.
    B (Black) always goes first.
    0,0 is the top-left corner.
    
    Analyze the board carefully.
    1. Look for any immediate threats (opponent has 3 or 4 in a row). Block them immediately.
    2. Look for winning moves (you have 3 or 4 in a row). Take them.
    3. Otherwise, play a strategic move to build a line or control the center.

    Return your move in JSON format strictly.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.INTEGER, description: "The x coordinate (column) 0-14" },
            y: { type: Type.INTEGER, description: "The y coordinate (row) 0-14" },
            reasoning: { type: Type.STRING, description: "Short strategic reasoning for the move" }
          },
          required: ["x", "y", "reasoning"]
        },
        temperature: 0.2 // Lower temperature for more logic-driven moves
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");

    const move = JSON.parse(text);
    return move;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    // Fallback random move if AI fails
    let x, y;
    do {
      x = Math.floor(Math.random() * BOARD_SIZE);
      y = Math.floor(Math.random() * BOARD_SIZE);
    } while (grid[y][x] !== Player.None);
    
    return { x, y, reasoning: "AI Service unavailable, playing random move." };
  }
};