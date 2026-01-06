
export const parseListString = (content: string): string[] => {
    if (!content) return [];
    const trimmed = content.trim();

    // Check for Python-style list string: ['Item 1', 'Item 2']
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const inner = trimmed.substring(1, trimmed.length - 1);
        // Robust regex to match single or double quoted strings, handling escaped quotes
        const matches = [...inner.matchAll(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g)];
        
        if (matches.length > 0) {
            return matches.map(m => {
                // Remove surrounding quotes and unescape
                return m[0].slice(1, -1).replace(/\\(['"])/g, '$1');
            });
        }
        
        // Fallback for simple JSON if regex fails but it looks like a list
        try {
            return JSON.parse(trimmed);
        } catch {
            // Ignore
        }
      } catch (e) {
        console.warn("Failed to parse list string", e);
      }
    }
    
    // Fallback to splitting by newline if it's not a detected list format
    return content.split('\n');
  };
