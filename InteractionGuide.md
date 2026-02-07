# Interaction Guide - How It Works

This guide explains how the spatial text interaction system works from a user perspective, with technical details when needed to understand the behavior.

## Table of Contents

1. [Overview](#overview)
2. [Hand Tracking System](#hand-tracking-system)
3. [Interacting with Words](#interacting-with-words)
4. [Voice Input System](#voice-input-system)
5. [Editing Modes](#editing-modes)
6. [Settings & Configuration](#settings--configuration)
7. [Tips & Troubleshooting](#tips--troubleshooting)

---

## Overview

The system allows you to edit text using hand gestures and voice commands in a spatial interface. There are two main ways to interact:

1. **Physical Keyboard**: Hover over words with your mouse and use spacebar to activate voice input
2. **Hand Gestures**: Use hand tracking to control a virtual cursor and pinch gestures to interact

Both methods provide the same functionality and can be used interchangeably.

---

## Hand Tracking System

### How Hand Tracking Works

The system uses your device's camera to detect your hand in real-time:

- **What it tracks**: Your hand position and finger movements
- **Which hand to use**: You can choose left or right hand in settings (default: left hand)
- **How it sees your hand**: Uses MediaPipe AI model running at 30-60 frames per second
- **Privacy**: All processing happens locally on your device; video is never uploaded

### Virtual Cursor

Your hand movements control a virtual cursor on screen:

**Cursor Position**:
- Tracked from your **wrist** position (more stable during hand gestures)
- Smoothed to prevent jittery movement (20% smoothing factor means cursor "follows" your hand smoothly)

**Two Tracking Modes**:

1. **Center Mode** (default):
   - Cursor starts at the center of the screen
   - Moves relative to your hand's starting position
   - Good for: Limited camera field of view, precise control
   - How it works: Moving your hand up moves cursor up, moving left moves cursor left, etc.

2. **Relative Mode**:
   - Your hand position maps directly to screen position
   - Hand at top-left camera view = cursor at top-left screen
   - Good for: Intuitive direct manipulation
   - How it works: 25% padding added so you can reach screen edges

**Sensitivity Slider** (1-100):
- Low values (1): Slow, precise cursor movement (0.2x multiplier)
- High values (100): Fast, responsive cursor movement (10x multiplier)
- Default (25): Balanced precision and comfort (2.65x multiplier)
- Technical detail: Multiplies movement by 0.2x to 10x based on slider value
- Reduces arm fatigue by amplifying small hand movements

### Pinch Gesture

The core hand interaction is the **pinch gesture**: touching your index finger and thumb together.

**How Pinch is Detected**:
- Measures distance between index finger tip and thumb tip
- Considered "pinching" when distance < 0.05 in normalized coordinates
- Very sensitive and works even with light contact

**What Pinch Does**:

| Duration | Action | Cursor Behavior |
|----------|--------|-----------------|
| **Quick pinch** (< 300ms) | Click | Acts like mouse click - selects or deletes words |
| **Hold pinch** (> 300ms) | Voice input | Acts like holding spacebar - starts listening for voice |
| **While moving** | Drag | Moves virtual cursor (always active) |

---

## Interacting with Words

### How Text is Displayed

Your text is broken into individual **words** and **spaces**. Each word is a separate, interactive element that you can:
- Hover over to highlight
- Click to delete
- Select for voice editing

**Visual Feedback**:
- **Default state**: Words appear with normal opacity
- **Hover**: Word gets a subtle background glow (white/5% opacity)
- **Selected (focused)**: Blue text with blue background tint and slight scale-up animation
- **Active indicator**: Thick blue underline appears below active word

**Word Padding**:
- **Vertical padding** (py-1.5): Adds clickable area above and below each word, making them easier to target with hand gestures
- **No horizontal padding**: Words maintain natural spacing in sentences

### Selection States

Words can be in three states:

1. **Unfocused**: No selection, normal appearance
2. **Focused**: Hovering over the word (disappears when cursor leaves)
3. **Locked**: Selected word stays active even when cursor moves away

**How to Lock a Word**:
1. Hover over the word you want to edit
2. Click anywhere outside the text container (sidebar, empty space, etc.)
3. Word stays selected (blue) even when you move your cursor
4. Useful for: Adjusting settings before speaking, or keeping selection while repositioning hand

**How to Unlock**:
- Click anywhere inside the text container
- Click on any word

### Deleting Words

**Quick Method**: Click (or quick pinch) on any word to delete it.

**What happens**:
- Word is removed immediately
- Surrounding spaces are cleaned up
- Action is saved to history (can undo with Ctrl+Z or Undo button)

**Note**: You cannot delete while voice input is active.

---

## Voice Input System

### Two Ways to Activate

Both methods work identically:

| Method | Trigger | Visual | Release |
|--------|---------|--------|---------|
| **Keyboard** | Hold Spacebar | Green pulsing indicator appears | Release Spacebar |
| **Hand Gesture** | Hold pinch for 300ms | Same green indicator | Release pinch |

**Important**: Voice input requires being in the text area:
- **Word editing**: Must hover over a word (or have word locked)
- **Pure dictation**: Can activate anywhere in the text container (even empty space)

### The Listening Process

When you activate voice input:

**1. Activation** (you hold spacebar/pinch):
- Voice recognition starts immediately
- Green pulsing circle appears in the info panel
- Feedback shows: "Listening... (selected word: [word])"

**2. Speaking** (voice is being processed):
- Speak clearly and naturally
- Real-time transcript appears in the voice visualizer
- Works best with clear, single phrases
- Language: English (US) by default

**3. Processing** (when you release):
- Voice recognition finalizes the transcript
- System determines whether to edit or append
- Changes are applied immediately
- Edit is saved to history

**4. Completion**:
- Feedback shows what happened ("Word replaced" or "Text appended")
- Green indicator disappears
- System is ready for next interaction

### Voice Recognition Details

**How it works**:
- Uses browser's built-in Web Speech API (webkitSpeechRecognition / SpeechRecognition)
- Processes speech locally when possible (Chrome: cloud-based, Safari: on-device)
- Continuous mode disabled = stops after one utterance
- Interim results enabled = you see text as you speak

**Browser Support**:
- ✅ Chrome/Edge: Excellent (requires internet)
- ✅ Safari: Good (works offline on recent macOS/iOS)
- ❌ Firefox: Not supported

**Tips for Best Results**:
- Speak clearly and at moderate pace
- Use natural language (system handles grammar)
- Pause briefly before releasing to ensure recognition completes
- Avoid background noise

---

## Editing Modes

The system automatically chooses between two editing modes based on whether you have a word selected.

### Mode 1: Semantic Word Replacement

**When**: A word is focused or locked when you speak

**What happens**: The system **intelligently replaces the word and adjusts surrounding context**.

#### How Semantic Editing Works

The system doesn't just swap words - it understands grammar and context:

**Step 1: Classify Words**

Words are categorized by type:
- **Day**: Monday, Tuesday, tomorrow, today, etc.
- **Time**: 3pm, noon, midnight, 10:30am, etc.
- **Location**: Studio, office, conference room, online, etc.
- **Preposition**: at, in, on, for, with, to, by
- **Article**: the, a, an, this, that
- **Temporal**: next, last, this, coming, previous

**Step 2: Find Phrase Context**

The system looks at 2-3 words before and after the target to find related words (prepositions, articles, modifiers).

**Step 3: Apply Smart Transformations**

Based on word types, it adjusts the phrase:

| Original Phrase | You Say | Smart Result | What Changed |
|----------------|---------|--------------|--------------|
| "on Monday" | "tomorrow" | "tomorrow" | Removed "on" (not needed with "tomorrow") |
| "on Monday" | "next Tuesday" | "next Tuesday" | Changed "on" to "next" |
| "at the Studio" | "online" | "online" | Removed "at the" (online doesn't need location preposition) |
| "Studio" | "in the conference room" | "in the conference room" | Kept preposition from new content |
| "3pm" | "noon" | "noon" | Simple time replacement (no articles) |

**Step 4: Clean Up**

- Remove extra spaces
- Maintain punctuation
- Preserve capitalization when possible

**Example in Action**:

```
Original: "Meeting on Monday at 3pm"
              ↓ Select "Monday", say "tomorrow"
Result:   "Meeting tomorrow at 3pm"
    (note: "on" was automatically removed)

Original: "Meeting tomorrow at 3pm"
              ↓ Select "3pm", say "noon"
Result:   "Meeting tomorrow at noon"
```

The goal is **natural language editing** - you just say the new content, and the system handles the grammar.

### Mode 2: Pure Dictation (Append)

**When**: No word selected, but you're in the text container area

**What happens**: New text is **appended to the end** of existing text.

**How it works**:
1. System checks current text
2. Adds a space if needed (only if text doesn't already end with space)
3. Appends your spoken text
4. Updates display

**Example**:
```
Current text: "Meeting tomorrow at noon"
    ↓ Activate voice in empty area, say "bring laptop"
Result: "Meeting tomorrow at noon bring laptop"
```

**When to use**:
- Adding new content
- Building sentences incrementally
- Continuing thoughts

**When NOT to use**:
- Editing existing words (use word selection instead)
- Inserting in the middle (select a word first)
- Replacing content (select the word to replace)

---

## Settings & Configuration

### Hand Tracking Settings

Access via the gear icon in the hand tracking panel:

**Target Hand**:
- Left (default) or Right
- Choose your dominant hand or non-dominant based on preference
- Switching hands is instant

**Tracking Mode**:
- **Center** (default): Cursor starts at center, moves relative to hand delta
- **Relative**: Direct hand-to-screen position mapping
- Try both to see which feels more natural

**Sensitivity** (1-100):
- Adjusts cursor movement speed and reduces arm fatigue
- Default 25 = 2.65x multiplier (comfortable for extended use)
- Range: 0.2x (very precise) to 10x (very fast)
- Higher values = faster cursor with less hand movement

**Enable/Disable Tracking**:
- Toggle switch to pause hand tracking entirely
- Camera stays active but cursor stops updating
- Useful for: Taking breaks, preventing accidental input

**Show/Hide Camera**:
- Toggle camera feed visibility
- Camera still processes even when hidden
- Hides for privacy or cleaner interface

### Text Editor Features

**Undo/Redo**:
- Undo: Ctrl+Z (Cmd+Z on Mac) or click Undo button
- Redo: Ctrl+Shift+Z or click Redo button
- Tracks all changes: word edits, deletions, dictations
- History is preserved during session

**Clear All**:
- Button to delete all text
- Adds to history (can undo)

**Copy to Clipboard**:
- Click Copy button to copy current text
- Uses browser clipboard API

---

## Tips & Troubleshooting

### Hand Gesture Best Practices

**For Smooth Cursor Movement**:
- Keep your hand within camera view
- Don't move too fast (cursor has smoothing)
- Use wrist movements, not finger movements
- Adjust sensitivity if cursor feels too slow/fast

**For Reliable Pinch Detection**:
- Pinch firmly but not hard
- Hold steady for voice input (don't wiggle fingers)
- Quick pinch-release for clicks
- 300ms hold is about a third of a second

**For Comfortable Use**:
- Position camera at eye level or slightly below
- Ensure good lighting (no backlighting)
- Take breaks every 10-15 minutes
- Try both hands to see which is more comfortable

### Common Issues & Solutions

**"Hold keeps clicking instead of voice input"**:
- You're releasing pinch too quickly (< 300ms)
- Solution: Hold pinch more firmly for a full half-second
- Or use keyboard spacebar for reliability

**"Voice input doesn't start"**:
- Check: Are you hovering over a word or in the text container?
- Check: Browser supports speech recognition?
- Check: Microphone permissions granted?
- Try: Click inside text area first to ensure focus

**"Cursor is jittery"**:
- Hand might be moving too much
- Solution: Increase smoothing (currently fixed at 20%)
- Try: Use steadier hand movements, rest elbow on table

**"Wrong word gets edited"**:
- Selection might not be locked
- Solution: Click outside text container to lock word before speaking
- Visual check: Is the word you want highlighted in blue?

**"Dictation adds to wrong place"**:
- Pure dictation always appends to end
- Solution: To insert in middle, select a nearby word and use semantic edit

**"Can't reach screen edges with hand"**:
- In Relative mode: 25% padding might not be enough
- Solution: Switch to Center mode
- Or increase sensitivity

### Voice Recognition Tips

**For Better Accuracy**:
- Speak naturally (not too slow, not too fast)
- Use clear enunciation
- Minimize background noise
- Hold microphone to mouth if needed

**When It Doesn't Hear You**:
- Check: Green indicator is pulsing?
- Check: Microphone permissions in browser
- Try: Speaking louder or closer to mic
- Check: Browser console for errors

**When It Hears Wrong Words**:
- Try: Speaking more clearly
- Try: Shorter phrases
- Check: Interim results in visualizer to see what it's hearing
- Note: Some accents may have lower accuracy

### Performance Optimization

**If hand tracking is laggy**:
- Close other camera-using apps
- Reduce browser tabs
- Check: GPU acceleration enabled in browser
- Lower sensitivity might help perception

**If speech recognition is slow**:
- Chrome: Requires internet (cloud-based)
- Safari: Works offline but first use needs setup
- Clear browser cache if issues persist

**General**:
- Use recent browser versions
- Restart browser if system becomes unresponsive
- Check console (F12) for error messages

---

## Technical Summary

For developers or advanced users who want to understand the system architecture:

### System Flow

```
User Hand Movement
  ↓
Camera Capture (30-60 FPS)
  ↓
MediaPipe Hand Landmarker (GPU)
  ↓
Wrist Position Calculation
  ↓
Cursor Position (with smoothing)
  ↓
DOM Element Detection (elementFromPoint)
  ↓
Mouse Events Dispatched
  ↓
React Components Update
```

```
User Pinch Gesture (> 300ms)
  ↓
Pinch Detection (index-thumb distance < 0.05)
  ↓
Check: Over text container?
  ↓ Yes
Dispatch Spacebar KeyDown Event
  ↓
React Event Handler
  ↓
Speech Recognition Start
  ↓
User Speaks
  ↓
Web Speech API Processes
  ↓
Interim Results → Display
  ↓
User Releases Pinch
  ↓
Dispatch Spacebar KeyUp Event
  ↓
Speech Recognition Stop
  ↓
Final Transcript → Apply Edit
  ↓
Update Text State & History
```

### Key Timing Parameters

- **Pinch threshold**: 0.05 normalized units
- **Hold duration**: 300ms to trigger voice input
- **Release debounce**: 200ms to confirm pinch release
- **Click cooldown**: 300ms after hold to prevent accidental clicks
- **Cursor smoothing**: 20% (0.2 factor)
- **Sensitivity range**: 0.2x to 10x multiplier (default: 25 = 2.65x)

### State Management

**HandTrackingManager**:
- Refs for pinch state (avoids re-renders)
- State for settings (persisted in component)
- Cursor position smoothed via ref

**TextEditor**:
- State for text content and derived word array
- Refs for active word (avoids stale closures)
- History as state array with index pointer

### Browser APIs Used

- **MediaPipe Vision Tasks**: Hand landmark detection
- **Web Speech API**: Voice recognition
- **DOM Events**: MouseEvent, KeyboardEvent
- **React Hooks**: useState, useEffect, useCallback, useRef

---

## Future Enhancements

Planned improvements to the system:

1. **Instant Voice Activation**: Start recognition on pinch, show UI after 300ms (for snappier feel)
2. **Custom Word Types**: Allow user-defined categories (project names, technical terms)
3. **Multi-Word Selection**: Select and edit entire phrases
4. **Gesture Customization**: Remap pinch actions to different functions
5. **Better Error Recovery**: Retry logic for speech API failures
6. **Offline Mode**: Full offline support for all browsers
7. **Multi-Language Support**: Voice input in languages beyond English

---

*For technical implementation details, see the source code in `components/HandTrackingManager.tsx` and `components/TextEditor.tsx`.*

---

## Eye Tracking Integration

The system now supports **Eye Tracking** as an alternative cursor control method, offering a magical interaction model similar to VisionOS.

### Features

1.  **Foveated Rendering**: The area you are looking at remains clear, while the periphery is blurred. This effect dynamically adjusts based on your distance from the camera (Z-axis).
2.  **Gaze-Based Cursor**: Your eyes control the cursor position.
3.  **Multimodal Interaction**: While your eyes aim, you use the **Hand Pinch** gesture to click or hold-to-speak. This separation of "look" and "commit" prevents the "Midas Touch" problem.

### Setup & Usage

1.  Open the **Settings Panel** (gear icon).
2.  Navigate to the **Eye** tab.
3.  **Enable Eye Tracking**: Toggle the switch. You may see a permission prompt for the camera if not already granted.
4.  **Calibrate**: Click "Start Calibration".
    - 9 red dots will appear.
    - Click each dot 5 times while looking directly at it.
    - Keep your head relatively steady but move your eyes.
    - This creates a custom regression model for your face and environment.
5.  **Select Cursor Mode**: Switch "Cursor Control Mode" from **Hand** to **Eye**.
    *   **Hand Mode**: Hand moves cursor. Eye tracking only provides the foveated rendering visual (if enabled).
    *   **Eye Mode**: Eyes move cursor. Hand pinch performs clicks at the gaze location.

### Best Practices

*   **Lighting**: Ensure your face is well-lit from the front. Avoid strong backlighting or shadows on your face.
*   **Distance**: Sit at a normal working distance (roughly 50-80cm).
*   **Stability**: Keep your head relatively steady.
*   **Calibration**: If accuracy drifts or you change your sitting position significantly, recalibrate.
