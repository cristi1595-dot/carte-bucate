// Parser for detecting culinary cooking timers in instruction texts

export interface TextSegment {
  type: 'text' | 'timer';
  content: string;
  seconds?: number;
}

/**
 * Searches an instruction text for time expressions and breaks it into segments of plain text and interactive timer triggers.
 */
export function parseInstructionTimers(text: string): TextSegment[] {
  if (!text) return [];

  // Regex to match patterns like:
  // - "1 ora si 30 minute", "2 ore si 15 min"
  // - "20-25 minute", "20 la 25 de minute"
  // - "15 minute", "10 min"
  // - "1 ora", "2 ore"
  // - "30 secunde", "45 sec"
  const timerRegex = /\b(?:(\d+)\s*(?:ore|oră|h)\s*(?:și|\+)?\s*(\d+)\s*(?:minute|min)|(\d+)\s*(?:-|–|la)\s*(\d+)\s*(?:de\s*)?(?:minute|min)|(\d+)\s*(?:de\s*)?(?:minute|min)|(\d+)\s*(?:ore|oră|h\b)|(\d+)\s*(?:de\s*)?(?:secunde|sec))\b/gi;

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = timerRegex.exec(text)) !== null) {
    // Add text preceding the match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const matchedText = match[0];
    let seconds = 0;

    if (match[1] !== undefined && match[2] !== undefined) {
      // Hours and minutes (e.g. "1 oră și 30 minute")
      seconds = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60;
    } else if (match[3] !== undefined && match[4] !== undefined) {
      // Range minutes (e.g. "20-25 minute") -> use the upper bound or safe default
      seconds = parseInt(match[4], 10) * 60;
    } else if (match[5] !== undefined) {
      // Single minutes (e.g. "15 minute", "10 min")
      seconds = parseInt(match[5], 10) * 60;
    } else if (match[6] !== undefined) {
      // Hours (e.g. "1 oră", "2 ore")
      seconds = parseInt(match[6], 10) * 3600;
    } else if (match[7] !== undefined) {
      // Seconds (e.g. "45 secunde")
      seconds = parseInt(match[7], 10);
    }

    if (seconds > 0) {
      segments.push({
        type: 'timer',
        content: matchedText,
        seconds,
      });
    } else {
      segments.push({
        type: 'text',
        content: matchedText,
      });
    }

    lastIndex = match.index + matchedText.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Format total seconds into MM:SS or HH:MM:SS
 */
export function formatTimerSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    const hh = String(hours);
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}
