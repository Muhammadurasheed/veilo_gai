
import React from 'react';

const INTERESTS = ['DeFi', 'NFTs', 'Gaming', 'Sustainability', 'Identity', 'Supply Chain', 'AI'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

interface InterestSelectorProps {
    selectedInterests: string[];
    setSelectedInterests: React.Dispatch<React.SetStateAction<string[]>>;
    skillLevel: string;
    setSkillLevel: React.Dispatch<React.SetStateAction<string>>;
}

export const InterestSelector: React.FC<InterestSelectorProps> = ({ 
    selectedInterests, 
    setSelectedInterests,
    skillLevel,
    setSkillLevel
}) => {

    const toggleInterest = (interest: string) => {
        setSelectedInterests(prev => 
            prev.includes(interest) 
                ? prev.filter(i => i !== interest)
                : [...prev, interest]
        );
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 sm:p-8 shadow-2xl space-y-8 backdrop-blur-sm">
            <div>
                <h2 className="text-2xl font-bold text-teal-300 mb-4">1. Select Your Interests</h2>
                <div className="flex flex-wrap gap-3">
                    {INTERESTS.map(interest => (
                        <button
                            key={interest}
                            onClick={() => toggleInterest(interest)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-400 ${
                                selectedInterests.includes(interest)
                                    ? 'bg-teal-500 text-white shadow-lg'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            {interest}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-teal-300 mb-4">2. Choose Your Skill Level</h2>
                <div className="flex flex-col sm:flex-row bg-gray-700 rounded-full p-1">
                    {SKILL_LEVELS.map(level => (
                        <button
                            key={level}
                            onClick={() => setSkillLevel(level)}
                            className={`w-full sm:w-auto flex-1 text-center px-6 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ease-in-out focus:outline-none ${
                                skillLevel === level
                                    ? 'bg-teal-500 text-white shadow-md'
                                    : 'text-gray-300 hover:bg-gray-600/50'
                            }`}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
