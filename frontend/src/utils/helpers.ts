export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const formatDate = (date: string | Date): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
};

export const capitalizeFirstLetter = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const extractTopSentences = (text: string, count: number = 3): string => {
  if (!text) return '';
  
  // First, remove all MediaWiki syntax and references
  let cleaned = text;
  
  // Remove citation templates
  cleaned = cleaned.replace(/\{\{Cite[^}]+\}\}/gi, '');
  cleaned = cleaned.replace(/\{\{cite[^}]+\}\}/gi, '');
  
  // Remove all other templates
  cleaned = cleaned.replace(/\{\{[^}]+\}\}/g, '');
  
  // Remove references
  cleaned = cleaned.replace(/<ref.*?>.*?<\/ref>/g, '');
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  
  // Remove internal links but keep the display text
  cleaned = cleaned.replace(/\[\[([^|]+)\|([^\]]+)\]\]/g, '$2');
  cleaned = cleaned.replace(/\[\[([^\]]+)\]\]/g, '$1');
  
  // Remove external links
  cleaned = cleaned.replace(/\[http[^\]]+\]/g, '');
  cleaned = cleaned.replace(/\[(https?:\/\/[^\s\]]+)([^\]]*)\]/g, '$2');
  
  // Remove tables
  cleaned = cleaned.replace(/\{\|[\s\S]*?\|\}/g, '');
  
  // Remove any remaining markup
  cleaned = cleaned.replace(/'''(.*?)'''/g, '$1'); // Bold
  cleaned = cleaned.replace(/''(.*?)''/g, '$1'); // Italic
  cleaned = cleaned.replace(/===+([^=]+)===+/g, ''); // Headers
  
  // Clean up extra whitespace and newlines
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Split into sentences using regex
  const sentences = cleaned.split(/[.!?]+/).filter(sentence => {
    const trimmed = sentence.trim();
    
    // Filter criteria for human-readable sentences
    if (trimmed.length < 20) return false; // Too short
    
    // Check if sentence contains mainly alphabetic characters
    const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
    const totalLength = trimmed.length;
    const letterRatio = letterCount / totalLength;
    
    // Sentence should be at least 60% letters
    if (letterRatio < 0.6) return false;
    
    // Exclude sentences with excessive markup punctuation
    const markupChars = (trimmed.match(/[{}[\]()=|*#:;]/g) || []).length;
    if (markupChars > 3) return false; // Too many markup characters
    
    // Exclude sentences that are mostly numbers or symbols
    const numbersAndSymbols = (trimmed.match(/[0-9@#$%^&*+=<>]/g) || []).length;
    if (numbersAndSymbols > totalLength * 0.3) return false; // More than 30% numbers/symbols
    
    // Exclude sentences that look like code or markup
    if (/^[A-Z_]+\s*[:=]/.test(trimmed)) return false; // Looks like code
    if (/^\d+\s*[.:]\s*/.test(trimmed)) return false; // Numbered lists
    if (/^[*-]\s+/.test(trimmed)) return false; // Bullet points
    
    // Must contain at least one common English word pattern
    const hasCommonWords = /\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by|from|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|can|this|that|these|those)\b/i.test(trimmed);
    if (!hasCommonWords) return false;
    
    return true;
  });
  
  // Take the first 'count' sentences that pass all filters
  const topSentences = sentences.slice(0, count);
  
  // Join them back with periods and clean up
  return topSentences
    .map(sentence => sentence.trim())
    .join('. ')
    .replace(/\.\s*$/, '') + '.'; // Ensure it ends with a single period
};

export const parseMediaWikiText = (text: string): string => {
  try {
    let html = text;
    
    // Handle highlighted content from search results first
    html = html.replace(/<mark>(.*?)<\/mark>/g, '<span class="highlight bg-yellow-200 dark:bg-yellow-800">$1</span>');
    
    // Handle bold and italic
    html = html.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
    html = html.replace(/''(.*?)''/g, '<em>$1</em>');
    
    // Convert line breaks to proper paragraphs
    html = html.replace(/\n{2,}/g, '</p><p>');
    
    // Wrap in paragraph if not already done
    if (!html.startsWith('<p>')) {
      html = '<p>' + html + '</p>';
    }
    
    return html;
  } catch (error) {
    console.error('Error parsing MediaWiki text:', error);
    return `<p>${text}</p>`;
  }
};