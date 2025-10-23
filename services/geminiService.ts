
import { GoogleGenAI, Type } from "@google/genai";
import type { ProjectIdea } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ideaGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "A catchy and descriptive title for the project.",
        },
        description: {
            type: Type.STRING,
            description: "A detailed 150-word description of the project idea, explaining how it uses Hedera services."
        }
    },
    required: ["title", "description"]
};


export const generateProjectIdea = async (interests: string[], skillLevel: string): Promise<ProjectIdea> => {
    const prompt = `
        You are an expert creative assistant for blockchain hackathons. 
        A developer is applying for the Hedera Hackathon. 
        Their technical interests are: ${interests.join(', ')}.
        Their self-assessed skill level is: ${skillLevel}.

        Generate a unique and innovative project idea that is feasible for a hackathon. 
        The idea must leverage Hedera's key services, such as the Hedera Consensus Service (HCS), Hedera Token Service (HTS), or Smart Contracts on Hedera.
        
        The idea should be clearly explained.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: ideaGenerationSchema,
                temperature: 0.9,
            }
        });
        
        const jsonText = response.text.trim();
        const idea: ProjectIdea = JSON.parse(jsonText);
        return idea;
    } catch (error) {
        console.error("Error generating project idea:", error);
        throw new Error("Failed to communicate with the Gemini API.");
    }
};

export const generateTeamName = async (projectTitle: string, projectDescription: string): Promise<string> => {
    const prompt = `
        Based on the following Hedera Hackathon project idea, generate one creative, catchy, and tech-related team name. 
        The name should be short, memorable, and relevant to Hedera or blockchain technology.

        Project Title: "${projectTitle}"
        Project Description: "${projectDescription}"

        Return only the single best team name as a plain string, with no extra formatting or quotation marks.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 1.0,
            }
        });

        return response.text.trim().replace(/"/g, ''); // Clean up any quotes
    } catch (error) {
        console.error("Error generating team name:", error);
        throw new Error("Failed to communicate with the Gemini API.");
    }
};
