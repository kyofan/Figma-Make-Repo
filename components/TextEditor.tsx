import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { motion } from "motion/react";
import { SpeechStatus } from "./VoiceVisualizer";

export interface TextEditorHandle {
  simulateVoiceInput: (input: string) => void;
}

interface TextEditorProps {
  initialText: string;
  onListeningChange?: (isListening: boolean, speechData?: SpeechStatus) => void;
}

export const TextEditor = forwardRef<TextEditorHandle, TextEditorProps>(({
  initialText,
  onListeningChange,
}, ref) => {
  const [text, setText] = useState(initialText);
  const [words, setWords] = useState<string[]>([]);
  const [focusedWordIndex, setFocusedWordIndex] = useState<number | null>(null);
  const [lockedWordIndex, setLockedWordIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [editHistory, setEditHistory] = useState<string[]>([initialText]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [spacebarHintVisible, setSpacebarHintVisible] = useState(false);

  // Use refs to avoid state updates that could cause render loops
  const textContainerRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const activeWordIndexRef = useRef<number | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false); // Race condition fix
  const stopRequestedRef = useRef<boolean>(false); // Queue stop request if starting
  const realTimeSpeechTextRef = useRef<string>("");

  // Refs to track current state for event handlers (avoiding stale closures)
  const textRef = useRef(text);
  const wordsRef = useRef(words);
  const editHistoryRef = useRef(editHistory);
  const historyIndexRef = useRef(historyIndex);

  // Update refs when state changes
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  useEffect(() => {
    editHistoryRef.current = editHistory;
  }, [editHistory]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // Expose simulation method via ref
  useImperativeHandle(ref, () => ({
    simulateVoiceInput: (input: string) => {
      simulateVoiceInput(input);
    }
  }));

  // Helper function to update activeWordIndexRef
  const updateActiveWordRef = useCallback(() => {
    activeWordIndexRef.current =
      focusedWordIndex !== null ? focusedWordIndex : lockedWordIndex;
    console.log(`Active word updated: ${activeWordIndexRef.current}`);
  }, [focusedWordIndex, lockedWordIndex]);


  // Initialize speech recognition once on mount
  useEffect(() => {
    // Check if browser supports speech recognition
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.log("Speech recognition not supported in this browser");
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      // Set up speech recognition handlers
      recognitionRef.current.onstart = () => {
        console.log("Speech recognition started");
        isListeningRef.current = true;
        isStartingRef.current = false; // Successfully started

        // Check if stop was requested while we were starting
        if (stopRequestedRef.current) {
          console.log("Aborting start due to queued stop request");
          stopListening();
          return;
        }

        setIsListening(true);
        setTranscript("");
        realTimeSpeechTextRef.current = "";
        setShowFeedback(true);

        // Make sure we have the latest active word at start
        console.log(`Active word at start: ${activeWordIndexRef.current}`);

        // Notify parent
        if (onListeningChange) {
          onListeningChange(true, { text: "", status: "listening" });
        }

        showTemporaryFeedback(
          `Listening... (selected word: ${wordsRef.current[activeWordIndexRef.current || 0]?.trim() || "none"})`,
        );
      };

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        console.log(`Recognized: "${transcriptText}"`);

        // Update the transcript ref without triggering re-renders
        realTimeSpeechTextRef.current = transcriptText;

        // Notify parent component for visualization
        if (onListeningChange) {
          onListeningChange(true, {
            text: transcriptText,
            status: "processing",
          });
        }

        // If this is a final result, store it in state
        if (event.results[current].isFinal) {
          setTranscript(transcriptText);
        }
      };

      recognitionRef.current.onend = () => {
        console.log("Speech recognition ended");

        // Get the current values from refs to avoid closure issues
        const currentActiveWord = activeWordIndexRef.current;
        const currentTranscript = realTimeSpeechTextRef.current || transcript;

        console.log(
          `Speech end - Word index: ${currentActiveWord}, Transcript: "${currentTranscript}"`,
        );

        // Apply the edit if we have a transcript
        if (currentTranscript) {
          if (currentActiveWord !== null) {
            console.log(
              `Applying edit to word ${currentActiveWord}: "${currentTranscript}"`,
            );
            applySemanticEdit(currentActiveWord, currentTranscript);
          } else {
            // Pure dictation (append or insert)
            console.log(`Pure dictation: "${currentTranscript}"`);
            appendDictation(currentTranscript);
          }
        } else {
          showTemporaryFeedback("No speech detected");
        }

        // Reset state
        isListeningRef.current = false;
        isStartingRef.current = false; // Safety reset
        setIsListening(false);
        setTranscript("");
        realTimeSpeechTextRef.current = "";

        // Notify parent component
        if (onListeningChange) {
          onListeningChange(false, { text: "", status: "idle" });
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error(`Speech recognition error: ${event.error}`);
        isListeningRef.current = false;
        isStartingRef.current = false; // Safety reset
        setIsListening(false);

        showTemporaryFeedback(`Error: ${event.error}`);

        if (onListeningChange) {
          onListeningChange(false, {
            text: "",
            status: "error",
            error: event.error,
          });
        }
      };
    }

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Update activeWordIndexRef whenever focusedWordIndex or lockedWordIndex changes
  useEffect(() => {
    updateActiveWordRef();
  }, [focusedWordIndex, lockedWordIndex, updateActiveWordRef]);

  // Split text into words when text changes
  useEffect(() => {
    // This regex keeps spaces in the resulting array
    const wordArray = text.match(/\S+|\s+/g) || [];
    setWords(wordArray);
  }, [text]);

  // Handle spacebar press/release for voice input (hold to listen, release to apply)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key repeat events (when holding down the key)
      if (e.repeat) return;

      console.log(
        `KeyDown: ${e.code}, isListening: ${isListening}, focusedWordIndex: ${focusedWordIndex}, lockedWordIndex: ${lockedWordIndex}`,
      );

      if (e.code === "Space" && !isListening) {
        // Prevent hijacking if user is typing elsewhere (though we don't have other inputs yet)
        // Only hijack if body is active OR we are explicitly over the text container
        // Also allow if it's a generated event from HandTrackingManager
        if (
          document.activeElement !== document.body &&
          !textContainerRef.current?.contains(document.activeElement)
        ) {
          return;
        }

        const hasWordSelected = focusedWordIndex !== null || lockedWordIndex !== null;
        console.log(`Spacebar pressed - hasWordSelected: ${hasWordSelected}`);

        // Always allow spacebar - HandTrackingManager validates text container before dispatch
        // The onend handler will route to semantic edit or dictation based on activeWordIndexRef
        e.preventDefault();
        console.log("Starting listening from spacebar...");
        startListening();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && isListening) {
        e.preventDefault();
        stopListening(true); // Apply edits when releasing spacebar
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isListening, focusedWordIndex, lockedWordIndex]);

  // Handle clicks outside the text container to lock/unlock focus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        textContainerRef.current &&
        !textContainerRef.current.contains(e.target as Node)
      ) {
        // Clicked outside the text container
        if (focusedWordIndex !== null && focusedWordIndex !== lockedWordIndex) {
          console.log(`Locking word: ${focusedWordIndex}`);
          setLockedWordIndex(focusedWordIndex);
          setFocusedWordIndex(null);
        }
      } else {
        // Clicked inside the text container, clear the locked word
        if (lockedWordIndex !== null) {
          console.log("Unlocking word");
          setLockedWordIndex(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [focusedWordIndex, lockedWordIndex]);

  // Show spacebar hint when word is focused or locked
  useEffect(() => {
    if (!isListening) {
      setSpacebarHintVisible(true);
    } else {
      setSpacebarHintVisible(false);
    }
  }, [focusedWordIndex, lockedWordIndex, isListening]);

  // Function to show temporary feedback toast
  const showTemporaryFeedback = useCallback((message: string) => {
    console.log(`Feedback: ${message}`);
    setFeedbackMessage(message);
    setShowFeedback(true);

    const timer = setTimeout(() => {
      setShowFeedback(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Start speech recognition
  const startListening = () => {
    // activeWordIndexRef.current can be null (pure dictation)

    // Make sure we're not already listening or in the process of starting
    if (isListeningRef.current || isStartingRef.current) {
      console.log("Already listening or starting, ignoring start request");
      return;
    }

    isStartingRef.current = true; // Set starting flag

    console.log(`Starting listening. Target word: ${activeWordIndexRef.current !== null ? activeWordIndexRef.current : "None (Pure Dictation)"}`);

    // If Web Speech API is not available, use simulation
    if (!recognitionRef.current) {
      console.log("Speech recognition not available, simulating");
      isListeningRef.current = true;
      isStartingRef.current = false; // Simulation starts immediately
      setIsListening(true);

      if (onListeningChange) {
        onListeningChange(true, { text: "", status: "listening" });
      }

      showTemporaryFeedback("Simulating voice recognition");
      return;
    }

    // Start recognition
    try {
      isStartingRef.current = true; // Mark as starting
      stopRequestedRef.current = false; // Reset stop request flag
      recognitionRef.current.start(); // Triggers onstart
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      showTemporaryFeedback("Error starting speech recognition");
      isListeningRef.current = false;
      setIsListening(false);
      isStartingRef.current = false; // Reset starting flag on error
    }
  };

  // Stop speech recognition
  const stopListening = (applyChanges = true) => {
    // Check if we are currently in the starting phase
    if (isStartingRef.current) {
      console.log("Stop requested while starting - queuing stop");
      stopRequestedRef.current = true;
      return;
    }

    if (!isListeningRef.current) {
      console.log("Not listening, ignoring stop request");
      return;
    }

    console.log(`Stopping listening, applyChanges: ${applyChanges}`);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping speech recognition:", e);
      }
    }

    // If we don't want to apply changes, reset state directly
    if (!applyChanges) {
      isListeningRef.current = false;
      setIsListening(false);
      setTranscript("");
      realTimeSpeechTextRef.current = "";

      if (onListeningChange) {
        onListeningChange(false, { text: "", status: "idle" });
      }
    }
  };

  // Simulate voice input for buttons
  const simulateVoiceInput = (input: string) => {
    const activeIndex = activeWordIndexRef.current;

    if (activeIndex === null) {
      showTemporaryFeedback("Please hover over a word first");
      return;
    }

    console.log(`Simulating voice input: "${input}" for word: ${activeIndex}`);

    // Update state to show we're listening
    isListeningRef.current = true;
    setIsListening(true);

    // Set the transcript
    realTimeSpeechTextRef.current = input;

    // Notify parent for visualization
    if (onListeningChange) {
      onListeningChange(true, { text: input, status: "processing" });
    }

    // Show feedback
    showTemporaryFeedback(`Simulated: "${input}"`);

    // Apply after a short delay
    setTimeout(() => {
      // Apply semantic edit
      applySemanticEdit(activeIndex, input);

      // Reset listening state
      isListeningRef.current = false;
      setIsListening(false);
      setFocusedWordIndex(null);
      setLockedWordIndex(null);
      realTimeSpeechTextRef.current = "";

      // Notify parent
      if (onListeningChange) {
        onListeningChange(false, { text: "", status: "idle" });
      }
    }, 1000);
  };

  // Improved semantic edit function that correctly handles context and grammar
  const applySemanticEdit = (wordIndex: number, newContent: string) => {
    // Shadow state variables with ref values to ensure fresh state in closures
    const words = wordsRef.current;
    const editHistory = editHistoryRef.current;
    const historyIndex = historyIndexRef.current;

    if (!newContent.trim()) {
      console.log("Not applying empty edit");
      return;
    }

    console.log(`Applying semantic edit to word ${wordIndex}: "${newContent}"`);

    // Get the current word and make a copy of the words array
    const targetWord = words[wordIndex]?.trim();

    // First, let's build an understanding of the sentence structure
    // We'll create word objects that include their index and type
    const structuredWords = [];
    for (let i = 0; i < words.length; i++) {
      if (words[i].trim() === "") {
        // Skip spaces for the analysis (we'll keep them for reconstruction)
        continue;
      }

      const word = words[i].trim().toLowerCase();
      let type = "other";

      // Classify word types
      if (
        /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(word)
      ) {
        type = "day";
      } else if (/\d+(:\d+)?\s*(am|pm)|noon|midnight/i.test(word)) {
        type = "time";
      } else if (/(studio|office|room|home|building)/i.test(word)) {
        type = "location";
      } else if (/at|in|on|for|with|to|by/i.test(word)) {
        type = "preposition";
      } else if (/the|a|an|this|that|these|those/i.test(word)) {
        type = "article";
      } else if (/next|last|this|coming|previous/i.test(word)) {
        type = "temporal";
      }

      structuredWords.push({
        index: i,
        word,
        type,
      });
    }

    // Find the target word in our structured representation
    const targetWordObj = structuredWords.find((w) => w.index === wordIndex);
    if (!targetWordObj) {
      console.error("Target word not found in structured representation");
      return;
    }

    // Classify the new content
    const newContentLower = newContent.trim().toLowerCase();
    let newType = "other";

    if (
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|yesterday/i.test(
        newContentLower,
      )
    ) {
      newType = "day";
    } else if (/\d+(:\d+)?\s*(am|pm)|noon|midnight/i.test(newContentLower)) {
      newType = "time";
    } else if (
      /(conference room|office|studio|building|online)/i.test(newContentLower)
    ) {
      newType = "location";
    }

    console.log(
      `Target word type: ${targetWordObj.type}, New content type: ${newType}`,
    );

    // Now determine what surrounding context might need to change
    // We need to find the phrase containing the target word
    const phraseMembers = findPhraseMembers(structuredWords, targetWordObj);
    console.log("Phrase members:", phraseMembers);

    // Create a copy of words for modification
    const newWords = [...words];

    // Handle specific semantic replacements based on word types
    if (targetWordObj.type === "day" && newType === "day") {
      // Example: "on Monday" -> "next Tuesday"
      const phrasePreposition = phraseMembers.find(
        (m) => m.type === "preposition",
      );
      const phraseTemporal = phraseMembers.find((m) => m.type === "temporal");

      if (
        phrasePreposition &&
        phrasePreposition.word === "on" &&
        newContentLower.includes("next")
      ) {
        // Change "on" to blank if "next" is in the new content
        newWords[phrasePreposition.index] = "next";
        // Remove 'next' from the replacement if it's already being added as a preposition
        newContent = newContent.replace(/^next\s+/i, "");
      } else if (phrasePreposition && !newContentLower.includes("tomorrow")) {
        // For days, generally keep the same preposition unless specifically
        // changing to "tomorrow" or similar
      } else if (newContentLower === "tomorrow" && phrasePreposition) {
        // For "tomorrow", remove prepositions like "on"
        newWords[phrasePreposition.index] = "";

        // Also remove any temporal modifiers like "this" or "next"
        if (phraseTemporal) {
          newWords[phraseTemporal.index] = "";
        }
      }
    } else if (targetWordObj.type === "location" && newType === "location") {
      // Handle location changes like "Studio" -> "in the conference room"
      const phrasePreposition = phraseMembers.find(
        (m) => m.type === "preposition",
      );

      if (!phrasePreposition && newContentLower.startsWith("in ")) {
        // No existing preposition, but new content starts with one
        // We'll keep the "in" from the new content
      } else if (phrasePreposition && newContentLower === "online") {
        // Remove preposition when changing to "online"
        newWords[phrasePreposition.index] = "";

        // Also remove any articles
        const phraseArticle = phraseMembers.find((m) => m.type === "article");
        if (phraseArticle) {
          newWords[phraseArticle.index] = "";
        }
      } else if (
        phrasePreposition &&
        newContentLower.startsWith("in ") &&
        phrasePreposition.word !== "in"
      ) {
        // Change preposition to match the new one
        newWords[phrasePreposition.index] = "in";
        // Remove 'in ' from the replacement since we're already adding it
        newContent = newContent.replace(/^in\s+/i, "");
      }
    } else if (targetWordObj.type === "time" && newType === "time") {
      // Handle time changes - typically we just replace the time itself
      // but keep prepositions like "at" intact
      const phrasePreposition = phraseMembers.find(
        (m) => m.type === "preposition",
      );

      if (!phrasePreposition && newContentLower.startsWith("at ")) {
        // No existing preposition, but new content starts with one
        // We'll keep the "at" from the new content
      } else if (
        phrasePreposition &&
        newContentLower.startsWith("at ") &&
        phrasePreposition.word !== "at"
      ) {
        // Change preposition to match the new one
        newWords[phrasePreposition.index] = "at";
        // Remove 'at ' from the replacement since we're already adding it
        newContent = newContent.replace(/^at\s+/i, "");
      }
    }

    // Apply the actual replacement to the target word
    newWords[wordIndex] = newContent;

    // Clean up: remove any empty entries and fix spacing
    const cleanedWords = [];
    let prevWasSpace = false;

    for (let i = 0; i < newWords.length; i++) {
      const word = newWords[i];
      if (word === "") continue; // Skip empty entries

      const isSpace = /^\s+$/.test(word);

      if (isSpace && prevWasSpace) continue; // Skip duplicate spaces

      cleanedWords.push(word);
      prevWasSpace = isSpace;
    }

    // Make sure we have proper spacing
    for (let i = 0; i < cleanedWords.length - 1; i++) {
      if (!/\s$/.test(cleanedWords[i]) && !/^\s/.test(cleanedWords[i + 1])) {
        cleanedWords[i] = cleanedWords[i] + " ";
      }
    }

    // Join the words back to form the new text
    const newText = cleanedWords.join("");

    // Add to history
    const newHistory = [...editHistory.slice(0, historyIndex + 1), newText];

    // Update state
    setText(newText);
    setEditHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    showTemporaryFeedback("Semantic edit applied");
  };

  // Helper function to find the members of a phrase containing a target word
  const findPhraseMembers = (structuredWords: any[], targetWord: any) => {
    const result = [targetWord];
    const targetIndex = structuredWords.findIndex(
      (w: any) => w.index === targetWord.index,
    );

    if (targetIndex === -1) return result;

    // Look backwards for prepositions, articles, and modifiers
    for (let i = targetIndex - 1; i >= 0; i--) {
      const word = structuredWords[i];

      if (["preposition", "article", "temporal"].includes(word.type)) {
        result.push(word);
      } else if (word.type !== targetWord.type) {
        // Stop if we hit a different content type
        break;
      }

      // Don't go too far back
      if (targetIndex - i > 3) break;
    }

    // Look forwards for additional parts of the phrase
    for (let i = targetIndex + 1; i < structuredWords.length; i++) {
      const word = structuredWords[i];

      if (word.type === targetWord.type || word.type === "article") {
        result.push(word);
      } else if (["preposition", "temporal"].includes(word.type)) {
        // Stop at a new preposition or temporal modifier
        break;
      }

      // Don't go too far forward
      if (i - targetIndex > 3) break;
    }

    return result;
  };

  // Undo function
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setText(editHistory[historyIndex - 1]);
      showTemporaryFeedback("Undo");
    }
  };

  // Redo function
  const redo = () => {
    if (historyIndex < editHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setText(editHistory[historyIndex + 1]);
      showTemporaryFeedback("Redo");
    }
  };

  // Pure dictation: Append text to the end
  const appendDictation = (transcript: string) => {
    if (!transcript.trim()) return;

    // Use ref to get fresh text value (avoid stale closure)
    const currentText = textRef.current;
    const currentHistory = editHistoryRef.current;
    const currentHistoryIndex = historyIndexRef.current;

    console.log(`appendDictation - Current text: "${currentText}", Adding: "${transcript}"`);

    // Check if we need a space prefix
    const needsSpace = currentText.trim().length > 0 && !/\s$/.test(currentText);
    const prefix = needsSpace ? " " : "";

    const newText = currentText + prefix + transcript.trim();

    console.log(`appendDictation - New text: "${newText}"`);

    // Update state (setText will trigger useEffect to update words)
    setText(newText);

    // History
    const newHistory = [...currentHistory.slice(0, currentHistoryIndex + 1), newText];
    setEditHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    showTemporaryFeedback("Text appended");
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      <div
        ref={textContainerRef}
        className="text-editor-container w-full max-w-3xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg rounded-3xl p-8 my-6"
      >
        <div className="text-content text-2xl font-light leading-relaxed tracking-wide text-white/90">
          {words.map((word, index) => {
            const isActive =
              index === focusedWordIndex || index === lockedWordIndex;
            return (
              <span
                key={index}
                className={`word-span relative ${word.trim() === "" ? "whitespace-pre" : "inline-block py-1.5 rounded-md cursor-pointer transition-all duration-150"} ${isActive && word.trim() !== "" ? "text-blue-400 font-normal bg-blue-500/10 scale-105" : word.trim() !== "" ? "hover:bg-white/5" : ""}`}
                onMouseEnter={() => {
                  if (
                    word.trim() === "" ||
                    lockedWordIndex !== null ||
                    isListening
                  )
                    return;
                  console.log(`Focusing word ${index}: "${word.trim()}"`);
                  setFocusedWordIndex(index);
                }}
                onMouseLeave={() => {
                  if (
                    word.trim() === "" ||
                    lockedWordIndex !== null ||
                    isListening
                  )
                    return;
                  console.log(`Unfocusing word ${index}`);
                  setFocusedWordIndex(null);
                }}
                onClick={() => {
                  if (word.trim() === "" || isListening) return;
                  console.log(`Deleting word ${index}: "${word.trim()}"`);
                  // Delete the word
                  const newWords = [...words];
                  newWords[index] = ""; // Remove the word
                  // Clean up and rebuild text
                  const cleanedWords = newWords.filter((w, i) => {
                    // Keep word if not empty, or if it's a space between two non-empty words
                    if (w.trim() !== "") return true;
                    if (w === "") return false;
                    // Check if space is needed
                    const prevNonEmpty = newWords.slice(0, i).some(w => w.trim() !== "");
                    const nextNonEmpty = newWords.slice(i + 1).some(w => w.trim() !== "");
                    return prevNonEmpty && nextNonEmpty;
                  });
                  const newText = cleanedWords.join("").replace(/\s+/g, " ").trim();
                  setText(newText);
                  // Add to history
                  const newHistory = [...editHistory.slice(0, historyIndex + 1), newText];
                  setEditHistory(newHistory);
                  setHistoryIndex(newHistory.length - 1);
                  setFocusedWordIndex(null);
                  setLockedWordIndex(null);
                  showTemporaryFeedback(`Deleted "${word.trim()}"`);
                }}
              >
                {word}
                {isActive && word.trim() !== "" && (
                  <motion.div
                    className="absolute bottom-0 left-0 w-full h-1 bg-blue-400/70 shadow-[0_0_8px_rgba(59,130,246,0.6)] rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Locked word indicator */}
      {lockedWordIndex !== null && words[lockedWordIndex] && (
        <motion.div
          className="fixed top-24 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-lg bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-white/90 font-light text-sm z-40"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          Word "{words[lockedWordIndex].trim()}" selected for editing
        </motion.div>
      )}

      <div className="controls-container flex flex-col items-center space-y-6 w-full max-w-3xl">
        <div className="flex space-x-4 w-full justify-center min-h-[110px] items-center">
          {isListening ? (
            <motion.div
              className="px-6 py-3 rounded-2xl bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-white text-center min-w-[250px]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-white/50 text-xs mb-1">Detected speech:</div>
              <div className="text-base font-light mb-2">
                {transcript || realTimeSpeechTextRef.current || (
                  <span className="text-white/40 italic">Listening...</span>
                )}
              </div>
              <div className="text-white/60 text-xs">
                Release space to apply
              </div>
            </motion.div>
          ) : spacebarHintVisible ? (
            <motion.div
              className="px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white/80 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-sm font-light">Hold space to speak</div>
            </motion.div>
          ) : (
            <motion.div
              className="px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-white/60 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-sm font-light">
                Hover over a word to simulate eye-tracking
              </div>
            </motion.div>
          )}
        </div>

        {/* Actions or Feedback */}
        <div className="flex space-x-4 w-full justify-center min-h-[50px] items-center">
          {showFeedback ? (
            <motion.div
              className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-6 py-2 rounded-2xl shadow-lg text-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {feedbackMessage}
            </motion.div>
          ) : (
            <>
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/80 font-light text-sm transition-all disabled:opacity-30 hover:bg-white/15"
              >
                Undo
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= editHistory.length - 1}
                className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/80 font-light text-sm transition-all disabled:opacity-30 hover:bg-white/15"
              >
                Redo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

TextEditor.displayName = "TextEditor";
