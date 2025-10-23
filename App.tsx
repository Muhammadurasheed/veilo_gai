
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { InterestSelector } from './components/InterestSelector';
import { ResultCard } from './components/ResultCard';
import { Button } from './components/Button';
import { Spinner } from './components/Spinner';
import { generateProjectIdea, generateTeamName } from './services/geminiService';
import type { ProjectIdea } from './types';
import { SparklesIcon, UsersIcon, CheckCircleIcon } from './components/Icons';

const App: React.FC = () => {
  const [step, setStep] = useState<'interests' | 'ideaGenerated' | 'nameGenerated' | 'applied'>('interests');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState<string>('Beginner');
  const [projectIdea, setProjectIdea] = useState<ProjectIdea | null>(null);
  const [teamName, setTeamName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleGenerateIdea = useCallback(async () => {
    if (selectedInterests.length === 0) {
      setError('Please select at least one interest.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const idea = await generateProjectIdea(selectedInterests, skillLevel);
      setProjectIdea(idea);
      setStep('ideaGenerated');
    } catch (err) {
      setError('Failed to generate project idea. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedInterests, skillLevel]);

  const handleGenerateTeamName = useCallback(async () => {
    if (!projectIdea) return;
    setIsLoading(true);
    setError('');
    try {
      const name = await generateTeamName(projectIdea.title, projectIdea.description);
      setTeamName(name);
      setStep('nameGenerated');
    } catch (err) {
      setError('Failed to generate team name. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [projectIdea]);
  
  const handleApply = () => {
    setStep('applied');
  };
  
  const handleReset = () => {
    setStep('interests');
    setSelectedInterests([]);
    setSkillLevel('Beginner');
    setProjectIdea(null);
    setTeamName('');
    setError('');
  };


  return (
    <div className="min-h-screen bg-gray-900 font-sans text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl mx-auto">
        <Header />

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6 text-center" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {step === 'interests' && (
          <>
            <InterestSelector 
              selectedInterests={selectedInterests}
              setSelectedInterests={setSelectedInterests}
              skillLevel={skillLevel}
              setSkillLevel={setSkillLevel}
            />
            <div className="mt-8 text-center">
              <Button onClick={handleGenerateIdea} disabled={isLoading || selectedInterests.length === 0}>
                {isLoading ? <Spinner /> : <><SparklesIcon /> Generate My Idea</>}
              </Button>
            </div>
          </>
        )}

        {(step === 'ideaGenerated' || step === 'nameGenerated') && projectIdea && (
          <div className="space-y-8">
            <ResultCard title="Your Hackathon Project Idea" icon={<SparklesIcon />}>
              <h3 className="text-2xl font-bold text-teal-300 mb-2">{projectIdea.title}</h3>
              <p className="text-gray-300">{projectIdea.description}</p>
            </ResultCard>

            {step === 'ideaGenerated' && (
              <div className="text-center">
                 <Button onClick={handleGenerateTeamName} disabled={isLoading}>
                    {isLoading ? <Spinner /> : <><UsersIcon /> Generate a Team Name</>}
                 </Button>
              </div>
            )}
            
            {step === 'nameGenerated' && teamName && (
              <>
                <ResultCard title="Your Team Name" icon={<UsersIcon />}>
                  <p className="text-4xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-cyan-400 py-2">
                    {teamName}
                  </p>
                </ResultCard>
                <div className="text-center">
                    <Button onClick={handleApply}>
                        <CheckCircleIcon /> Apply Now
                    </Button>
                </div>
              </>
            )}
          </div>
        )}
        
        {step === 'applied' && (
             <ResultCard title="Application Submitted!" icon={<CheckCircleIcon />}>
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-teal-300 mb-2">Congratulations!</h3>
                    <p className="text-gray-300 mb-6">Your idea is ready for the Hedera Hackathon. Good luck!</p>
                    {projectIdea && <p className="text-lg font-semibold">Project: <span className="font-normal text-teal-400">{projectIdea.title}</span></p>}
                    {teamName && <p className="text-lg font-semibold">Team: <span className="font-normal text-teal-400">{teamName}</span></p>}
                    <div className="mt-8">
                      <Button onClick={handleReset}>Start Over</Button>
                    </div>
                </div>
            </ResultCard>
        )}
      </div>
    </div>
  );
};

export default App;
