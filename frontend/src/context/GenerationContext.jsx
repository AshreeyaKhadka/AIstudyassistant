import React, { createContext, useContext, useState, useCallback } from 'react';

const GenerationContext = createContext();

export const GenerationProvider = ({ children }) => {
    const [generationState, setGenerationState] = useState({
        flashcards: {
            generating: false,
            selectedUploadId: null,
            results: null,
            error: null,
            progress: 0,
        }
    });

    const generateFlashcards = useCallback(async (uploadId) => {
        setGenerationState(prev => ({
            ...prev,
            flashcards: {
                ...prev.flashcards,
                generating: true,
                selectedUploadId: uploadId,
                error: null,
                results: null,
                progress: 10,
            }
        }));

        try {
            // Small delay to simulate start
            const res = await fetch('/api/generate/flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ upload_id: uploadId, count: 15 }),
            });

            if (!res.ok) throw new Error('Generation failed');

            const data = await res.json();

            setGenerationState(prev => ({
                ...prev,
                flashcards: {
                    ...prev.flashcards,
                    generating: false,
                    results: data.flashcards || [],
                    progress: 100,
                }
            }));
        } catch (err) {
            setGenerationState(prev => ({
                ...prev,
                flashcards: {
                    ...prev.flashcards,
                    generating: false,
                    error: err.message,
                    progress: 0,
                }
            }));
        }
    }, []);

    const resetFlashcards = useCallback(() => {
        setGenerationState(prev => ({
            ...prev,
            flashcards: {
                generating: false,
                selectedUploadId: null,
                results: null,
                error: null,
                progress: 0,
            }
        }));
    }, []);

    return (
        <GenerationContext.Provider value={{
            flashcardState: generationState.flashcards,
            generateFlashcards,
            resetFlashcards
        }}>
            {children}
        </GenerationContext.Provider>
    );
};

export const useGeneration = () => {
    const context = useContext(GenerationContext);
    if (!context) {
        throw new Error('useGeneration must be used within a GenerationProvider');
    }
    return context;
};
