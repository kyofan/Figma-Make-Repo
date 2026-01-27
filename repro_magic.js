
// Mock React state and functions
let text = "I will see you tomorrow";
let words = ["I", " ", "will", " ", "see", " ", "you", " ", "tomorrow"];

function log(msg) {
    console.log(msg);
}

// Re-implement applySemanticEdit logic
const applySemanticEdit = (wordIndex, newContent) => {
    if (!newContent.trim()) {
        console.log('Not applying empty edit');
        return;
    }

    console.log(`Applying semantic edit to word ${wordIndex}: "${newContent}"`);

    // Get the current word and make a copy of the words array
    const targetWord = words[wordIndex]?.trim();

    // First, let's build an understanding of the sentence structure
    // We'll create word objects that include their index and type
    const structuredWords = [];
    for (let i = 0; i < words.length; i++) {
        //   if (words[i].trim() === '') {
        //     // Skip spaces for the analysis (we'll keep them for reconstruction)
        //     continue;
        //   }
        // Wait! The original code skips spaces! Line 369: if (words[i].trim() === '') continue;
        // Let's match original code exactly.
        if (words[i].trim() === '') continue;


        const word = words[i].trim().toLowerCase();
        let type = 'other';

        // Classify word types
        if (/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(word)) {
            type = 'day';
        } else if (/\d+(:\d+)?\s*(am|pm)|noon|midnight/i.test(word)) {
            type = 'time';
        } else if (/(studio|office|room|home|building)/i.test(word)) {
            type = 'location';
        } else if (/at|in|on|for|with|to|by/i.test(word)) {
            type = 'preposition';
        } else if (/the|a|an|this|that|these|those/i.test(word)) {
            type = 'article';
        } else if (/next|last|this|coming|previous/i.test(word)) {
            type = 'temporal';
        }

        structuredWords.push({
            index: i,
            word,
            type
        });
    }

    // Find the target word in our structured representation
    const targetWordObj = structuredWords.find(w => w.index === wordIndex);
    if (!targetWordObj) {
        console.error('Target word not found in structured representation');
        return;
    }

    // Classify the new content
    const newContentLower = newContent.trim().toLowerCase();
    let newType = 'other';

    if (/monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|yesterday/i.test(newContentLower)) {
        newType = 'day';
    } else if (/\d+(:\d+)?\s*(am|pm)|noon|midnight/i.test(newContentLower)) {
        newType = 'time';
    } else if (/(conference room|office|studio|building|online)/i.test(newContentLower)) {
        newType = 'location';
    }

    console.log(`Target word type: ${targetWordObj.type}, New content type: ${newType}`);

    // Now determine what surrounding context might need to change
    // We need to find the phrase containing the target word
    const phraseMembers = findPhraseMembers(structuredWords, targetWordObj);
    console.log('Phrase members:', phraseMembers);

    // Create a copy of words for modification
    const newWords = [...words];

    // Handle specific semantic replacements based on word types
    if (targetWordObj.type === 'day' && newType === 'day') {
        // Example: "on Monday" -> "next Tuesday"
        const phrasePreposition = phraseMembers.find(m => m.type === 'preposition');
        const phraseTemporal = phraseMembers.find(m => m.type === 'temporal');

        if (phrasePreposition && phrasePreposition.word === 'on' && newContentLower.includes('next')) {
            // Change "on" to blank if "next" is in the new content
            newWords[phrasePreposition.index] = 'next';
            // Remove 'next' from the replacement if it's already being added as a preposition
            newContent = newContent.replace(/^next\s+/i, '');
        } else if (phrasePreposition && !newContentLower.includes('tomorrow')) {
            // For days, generally keep the same preposition unless specifically
            // changing to "tomorrow" or similar
        } else if (newContentLower === 'tomorrow' && phrasePreposition) {
            // For "tomorrow", remove prepositions like "on"
            newWords[phrasePreposition.index] = '';

            // Also remove any temporal modifiers like "this" or "next"
            if (phraseTemporal) {
                newWords[phraseTemporal.index] = '';
            }
        }
    }
    else if (targetWordObj.type === 'location' && newType === 'location') {
        // Handle location changes like "Studio" -> "in the conference room"
        const phrasePreposition = phraseMembers.find(m => m.type === 'preposition');

        if (!phrasePreposition && newContentLower.startsWith('in ')) {
            // No existing preposition, but new content starts with one
            // We'll keep the "in" from the new content
        }
        else if (phrasePreposition && newContentLower === 'online') {
            // Remove preposition when changing to "online"
            newWords[phrasePreposition.index] = '';

            // Also remove any articles
            const phraseArticle = phraseMembers.find(m => m.type === 'article');
            if (phraseArticle) {
                newWords[phraseArticle.index] = '';
            }
        }
        else if (phrasePreposition && newContentLower.startsWith('in ') && phrasePreposition.word !== 'in') {
            // Change preposition to match the new one
            newWords[phrasePreposition.index] = 'in';
            // Remove 'in ' from the replacement since we're already adding it
            newContent = newContent.replace(/^in\s+/i, '');
        }
    }
    else if (targetWordObj.type === 'time' && newType === 'time') {
        // Handle time changes - typically we just replace the time itself
        // but keep prepositions like "at" intact
        const phrasePreposition = phraseMembers.find(m => m.type === 'preposition');

        if (!phrasePreposition && newContentLower.startsWith('at ')) {
            // No existing preposition, but new content starts with one
            // We'll keep the "at" from the new content
        }
        else if (phrasePreposition && newContentLower.startsWith('at ') && phrasePreposition.word !== 'at') {
            // Change preposition to match the new one
            newWords[phrasePreposition.index] = 'at';
            // Remove 'at ' from the replacement since we're already adding it
            newContent = newContent.replace(/^at\s+/i, '');
        }
    }

    // Apply the actual replacement to the target word
    newWords[wordIndex] = newContent;

    // Clean up: remove any empty entries and fix spacing
    const cleanedWords = [];
    let prevWasSpace = false;

    for (let i = 0; i < newWords.length; i++) {
        const word = newWords[i];
        if (word === '') continue; // Skip empty entries

        const isSpace = /^\s+$/.test(word);

        if (isSpace && prevWasSpace) continue; // Skip duplicate spaces

        cleanedWords.push(word);
        prevWasSpace = isSpace;
    }

    // Make sure we have proper spacing
    for (let i = 0; i < cleanedWords.length - 1; i++) {
        if (!/\s$/.test(cleanedWords[i]) && !/^\s/.test(cleanedWords[i + 1])) {
            cleanedWords[i] = cleanedWords[i] + ' ';
        }
    }

    // Join the words back to form the new text
    const newText = cleanedWords.join('');

    console.log(`Original Text: "${text}"`);
    console.log(`New Text:      "${newText}"`);

    // update state (simulated)
    text = newText;
    words = newText.match(/\S+|\s+/g) || [];
};

// Helper function to find the members of a phrase containing a target word
const findPhraseMembers = (structuredWords, targetWord) => {
    const result = [targetWord];
    const targetIndex = structuredWords.findIndex(w => w.index === targetWord.index);

    if (targetIndex === -1) return result;

    // Look backwards for prepositions, articles, and modifiers
    for (let i = targetIndex - 1; i >= 0; i--) {
        const word = structuredWords[i];

        if (['preposition', 'article', 'temporal'].includes(word.type)) {
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

        if (word.type === targetWord.type || word.type === 'article') {
            result.push(word);
        } else if (['preposition', 'temporal'].includes(word.type)) {
            // Stop at a new preposition or temporal modifier
            break;
        }

        // Don't go too far forward
        if (i - targetIndex > 3) break;
    }

    return result;
};

// TEST CASE 1: Replace "tomorrow" with "next Tuesday"
console.log("--- TEST CASE 1: 'tomorrow' -> 'next Tuesday' ---");
text = "I will see you tomorrow";
words = text.match(/\S+|\s+/g) || [];
// "tomorrow" is at index 8 of words array which includes spaces
// ["I", " ", "will", " ", "see", " ", "you", " ", "tomorrow"]
// 0, 1, 2, 3, 4, 5, 6, 7, 8
applySemanticEdit(8, "next Tuesday");

// TEST CASE 2: Replace "tomorrow" (now "next Tuesday") with "at 3 PM" (bad edit?)
// Wait, if I replace "Tuesday" with "at 3 PM"?
console.log("\n--- TEST CASE 2: 'Tuesday' -> 'at 3 PM' ---");
// Text is now "I will see you next Tuesday"
// Words: ["I", " ", "will", " ", "see", " ", "you", " ", "next", " ", "Tuesday"]
// 0..8 is "next", 9 is " ", 10 is "Tuesday"
applySemanticEdit(10, "at 3 PM");
// Expected: "I will see you next at 3 PM"? Or logic handles time differently.

// TEST CASE 3: Replace "Studio" with "in the conference room"
console.log("\n--- TEST CASE 3: 'Studio' -> 'in the conference room' ---");
text = "Meet me at the Studio";
words = text.match(/\S+|\s+/g) || [];
// ["Meet", " ", "me", " ", "at", " ", "the", " ", "Studio"]
// 0..4 "at" (prep), 5 " ", 6 "the" (art), 7 " ", 8 "Studio" (loc)
applySemanticEdit(8, "in the conference room");

// TEST CASE 4: The suspected "replacing whole sentence" issue
console.log("\n--- TEST CASE 4: Weird spacing or punctuation ---");
text = "Hello-world";
words = text.match(/\S+|\s+/g) || [];
// ["Hello-world"] index 0
applySemanticEdit(0, "Hi");
// Should result in "Hi" completely replacing "Hello-world". This IS replacing whole sentence if sentence is one word.

// TEST CASE 5: Empty text?
console.log("\n--- TEST CASE 5: Empty text ---");
text = "";
words = [];
applySemanticEdit(0, "Hello"); // Should fail/log error

console.log("\n--- TEST CASE 6: Space issues ---");
text = "Hello world";
words = ["Hello", " ", "world"];
applySemanticEdit(0, "Hi");
// Expected: "Hi world"

console.log("\n--- TEST CASE 7: Missing spaces in join logic? ---");
// If cleanedWords fails to add spaces
text = "A B";
words = ["A", " ", "B"];
applySemanticEdit(0, "C");
// Expected "C B"

