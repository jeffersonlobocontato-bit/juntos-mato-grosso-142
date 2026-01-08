/**
 * Robust cross-reference results parser
 * Implements 3-layer parsing: JSON patterns → sanitization → free text extraction
 */

export interface CrossReferenceResult {
  type: 'convergence' | 'divergence' | 'gap' | 'opportunity';
  title: string;
  description: string;
  sources: string[];
  relevance: 'high' | 'medium' | 'low';
}

interface ParseResult {
  results: CrossReferenceResult[];
  method: 'json' | 'text' | 'none';
}

/**
 * Layer 1: Try to extract JSON from multiple patterns
 */
export function tryParseJsonFromMultiplePatterns(content: string): CrossReferenceResult[] | null {
  const jsonPatterns = [
    /```json\s*([\s\S]*?)\s*```/i,           // Standard ```json ... ```
    /```\s*([\s\S]*?)\s*```/,                 // Code block without language
    /\{[\s\S]*?"discoveries"[\s\S]*?\}/,      // Inline JSON with discoveries
  ];

  for (const pattern of jsonPatterns) {
    const match = content.match(pattern);
    if (match) {
      const jsonStr = match[1] || match[0];
      const sanitized = sanitizeJsonString(jsonStr);
      
      try {
        const parsed = JSON.parse(sanitized);
        const discoveries = parsed.discoveries || parsed;
        
        if (Array.isArray(discoveries)) {
          const valid = validateAndNormalizeDiscoveries(discoveries);
          if (valid.length > 0) {
            console.log(`✓ Parsed ${valid.length} discoveries via JSON pattern`);
            return valid;
          }
        }
      } catch (e) {
        // Continue to next pattern
        console.log('JSON parse attempt failed:', e);
      }
    }
  }

  return null;
}

/**
 * Layer 2: Sanitize problematic JSON before parsing
 */
export function sanitizeJsonString(json: string): string {
  return json
    // Remove JavaScript-style comments
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Fix trailing commas before ] or }
    .replace(/,\s*([\]}])/g, '$1')
    // Normalize line breaks inside strings
    .replace(/\n/g, '\\n')
    // Escape unescaped quotes inside values (risky but sometimes needed)
    .replace(/([^\\])"([^"]*)"([^,\]}])/g, '$1"$2"$3')
    // Trim whitespace
    .trim();
}

/**
 * Validate and normalize discoveries array
 */
function validateAndNormalizeDiscoveries(discoveries: any[]): CrossReferenceResult[] {
  const validTypes = ['convergence', 'divergence', 'gap', 'opportunity'];
  const validRelevance = ['high', 'medium', 'low'];

  return discoveries
    .filter((d: any) => {
      const hasValidType = validTypes.includes(d.type);
      const hasTitle = typeof d.title === 'string' && d.title.trim().length > 0;
      const hasDescription = typeof d.description === 'string' && d.description.trim().length > 0;
      return hasValidType && hasTitle && hasDescription;
    })
    .map((d: any) => ({
      type: d.type as CrossReferenceResult['type'],
      title: d.title.trim(),
      description: d.description.trim(),
      sources: Array.isArray(d.sources) ? d.sources.filter((s: any) => typeof s === 'string') : [],
      relevance: validRelevance.includes(d.relevance) ? d.relevance : inferRelevanceFromContext(d.description),
    }));
}

/**
 * Layer 3: Extract discoveries from free text using linguistic patterns
 */
export function extractDiscoveriesFromText(content: string): CrossReferenceResult[] {
  const discoveries: CrossReferenceResult[] = [];

  // Pattern definitions for each discovery type
  const typePatterns: Record<CrossReferenceResult['type'], { 
    sectionPatterns: RegExp[];
    itemPatterns: RegExp[];
  }> = {
    convergence: {
      sectionPatterns: [
        /(?:#{1,4}\s*)?(?:\*{0,2})?\s*(?:convergência|convergencias|pontos?\s+(?:de\s+)?(?:convergência|em\s+comum|concordantes))[s]?\s*(?:\*{0,2})?[:\s]*\n([\s\S]*?)(?=\n#{1,4}|divergência|lacuna|oportunidade|$)/gi,
      ],
      itemPatterns: [
        /[•\-\*]\s*\*{0,2}([^:\n]+)\*{0,2}[:\s]+([^\n]+)/g,
        /[•\-\*]\s+([^\n]+)/g,
        /\d+\.\s*\*{0,2}([^:\n]+)\*{0,2}[:\s]+([^\n]+)/g,
      ],
    },
    divergence: {
      sectionPatterns: [
        /(?:#{1,4}\s*)?(?:\*{0,2})?\s*(?:divergência|divergencias|conflito|conflitos|contradição|contradicoes)[s]?\s*(?:\*{0,2})?[:\s]*\n([\s\S]*?)(?=\n#{1,4}|convergência|lacuna|oportunidade|$)/gi,
      ],
      itemPatterns: [
        /[•\-\*]\s*\*{0,2}([^:\n]+)\*{0,2}[:\s]+([^\n]+)/g,
        /[•\-\*]\s+([^\n]+)/g,
      ],
    },
    gap: {
      sectionPatterns: [
        /(?:#{1,4}\s*)?(?:\*{0,2})?\s*(?:lacuna|lacunas|ausência|gaps?)[s]?\s*(?:\*{0,2})?[:\s]*\n([\s\S]*?)(?=\n#{1,4}|convergência|divergência|oportunidade|$)/gi,
      ],
      itemPatterns: [
        /[•\-\*]\s*\*{0,2}([^:\n]+)\*{0,2}[:\s]+([^\n]+)/g,
        /[•\-\*]\s+([^\n]+)/g,
        /(?:falta|ausência|não\s+(?:há|existe|contempla))[:\s]+([^\n]+)/gi,
      ],
    },
    opportunity: {
      sectionPatterns: [
        /(?:#{1,4}\s*)?(?:\*{0,2})?\s*(?:oportunidade|oportunidades|potencial|potenciais)[s]?\s*(?:\*{0,2})?[:\s]*\n([\s\S]*?)(?=\n#{1,4}|convergência|divergência|lacuna|$)/gi,
      ],
      itemPatterns: [
        /[•\-\*]\s*\*{0,2}([^:\n]+)\*{0,2}[:\s]+([^\n]+)/g,
        /[•\-\*]\s+([^\n]+)/g,
        /💡\s*([^\n]+)/g,
      ],
    },
  };

  // Process each type
  for (const [type, patterns] of Object.entries(typePatterns) as [CrossReferenceResult['type'], typeof typePatterns[keyof typeof typePatterns]][]) {
    for (const sectionPattern of patterns.sectionPatterns) {
      let sectionMatch;
      const regexCopy = new RegExp(sectionPattern.source, sectionPattern.flags);
      
      while ((sectionMatch = regexCopy.exec(content)) !== null) {
        const sectionContent = sectionMatch[1] || sectionMatch[0];
        
        // Try to extract items from this section
        for (const itemPattern of patterns.itemPatterns) {
          let itemMatch;
          const itemRegex = new RegExp(itemPattern.source, itemPattern.flags);
          
          while ((itemMatch = itemRegex.exec(sectionContent)) !== null) {
            const title = (itemMatch[1] || '').trim().replace(/\*{1,2}/g, '');
            const description = (itemMatch[2] || itemMatch[1] || '').trim().replace(/\*{1,2}/g, '');
            
            if (title.length > 5 && !isDuplicateDiscovery(discoveries, title)) {
              discoveries.push({
                type,
                title: title.length > 80 ? title.substring(0, 77) + '...' : title,
                description: description || title,
                sources: extractSourcesFromText(sectionContent),
                relevance: inferRelevanceFromContext(description || title),
              });
            }
          }
        }
      }
    }
  }

  // If no structured discoveries found, try to find inline mentions
  if (discoveries.length === 0) {
    const inlineDiscoveries = extractInlineDiscoveries(content);
    discoveries.push(...inlineDiscoveries);
  }

  console.log(`✓ Extracted ${discoveries.length} discoveries from text`);
  return discoveries;
}

/**
 * Extract inline discoveries when no clear section structure exists
 */
function extractInlineDiscoveries(content: string): CrossReferenceResult[] {
  const discoveries: CrossReferenceResult[] = [];
  
  const inlinePatterns: { type: CrossReferenceResult['type']; pattern: RegExp }[] = [
    { type: 'convergence', pattern: /(?:há\s+)?(?:uma\s+)?convergência\s+(?:entre|em)[:\s]+([^.]+\.)/gi },
    { type: 'convergence', pattern: /(?:ponto[s]?\s+(?:de\s+)?(?:convergência|em\s+comum))[:\s]+([^.]+\.)/gi },
    { type: 'divergence', pattern: /(?:há\s+)?(?:uma\s+)?(?:divergência|conflito)\s+(?:entre|em)[:\s]+([^.]+\.)/gi },
    { type: 'gap', pattern: /(?:identifica(?:da|mos)?\s+(?:uma\s+)?lacuna|falta\s+de|ausência\s+de)[:\s]+([^.]+\.)/gi },
    { type: 'opportunity', pattern: /(?:há\s+)?(?:uma\s+)?oportunidade\s+(?:de|para)[:\s]+([^.]+\.)/gi },
  ];

  for (const { type, pattern } of inlinePatterns) {
    let match;
    const regexCopy = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regexCopy.exec(content)) !== null) {
      const text = (match[1] || '').trim();
      
      if (text.length > 10 && !isDuplicateDiscovery(discoveries, text)) {
        discoveries.push({
          type,
          title: text.length > 80 ? text.substring(0, 77) + '...' : text,
          description: text,
          sources: [],
          relevance: inferRelevanceFromContext(text),
        });
      }
    }
  }

  return discoveries;
}

/**
 * Check if a discovery with similar title already exists
 */
function isDuplicateDiscovery(discoveries: CrossReferenceResult[], title: string): boolean {
  const normalizedTitle = title.toLowerCase().replace(/[^a-záàâãéèêíìîóòôõúùûç0-9]/gi, '');
  
  return discoveries.some(d => {
    const normalizedExisting = d.title.toLowerCase().replace(/[^a-záàâãéèêíìîóòôõúùûç0-9]/gi, '');
    // Check for significant overlap
    return normalizedExisting.includes(normalizedTitle.substring(0, 20)) ||
           normalizedTitle.includes(normalizedExisting.substring(0, 20));
  });
}

/**
 * Extract source mentions from text
 */
function extractSourcesFromText(text: string): string[] {
  const sources: string[] = [];
  
  const sourcePatterns = [
    /(?:fonte|source|origem)[:\s]+([^\n,]+)/gi,
    /(?:sugestão|proposta|documento)\s+(?:de\s+)?([A-Z][a-záàâãéèêíìîóòôõúùûç\s]+)/g,
    /\[([^\]]+)\]/g, // Bracketed sources
  ];

  for (const pattern of sourcePatterns) {
    let match;
    const regexCopy = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regexCopy.exec(text)) !== null) {
      const source = match[1]?.trim();
      if (source && source.length > 2 && source.length < 100 && !sources.includes(source)) {
        sources.push(source);
      }
    }
  }

  // Limit to 5 sources
  return sources.slice(0, 5);
}

/**
 * Infer relevance from context keywords
 */
export function inferRelevanceFromContext(text: string): 'high' | 'medium' | 'low' {
  const lowercaseText = text.toLowerCase();
  
  const highKeywords = [
    'crítico', 'urgente', 'prioritário', 'fundamental', 'essencial', 'importante',
    'significativo', 'principal', 'alto impacto', 'alta prioridade', 'imediato',
    'crítica', 'urgência', 'prioridade', 'alta relevância'
  ];
  
  const lowKeywords = [
    'menor', 'secundário', 'complementar', 'opcional', 'adicional', 'baixo impacto',
    'baixa prioridade', 'futuro', 'eventual', 'possível', 'longo prazo'
  ];

  if (highKeywords.some(kw => lowercaseText.includes(kw))) {
    return 'high';
  }
  
  if (lowKeywords.some(kw => lowercaseText.includes(kw))) {
    return 'low';
  }
  
  return 'medium';
}

/**
 * Main parser function - tries all layers in order
 */
export function parseCrossReferenceContent(content: string): ParseResult {
  // Layer 1: Try JSON patterns
  const jsonResult = tryParseJsonFromMultiplePatterns(content);
  if (jsonResult && jsonResult.length > 0) {
    return { results: jsonResult, method: 'json' };
  }

  // Layer 3: Extract from free text (Layer 2 is integrated into Layer 1)
  const textResult = extractDiscoveriesFromText(content);
  if (textResult.length > 0) {
    return { results: textResult, method: 'text' };
  }

  console.warn('⚠ No structured discoveries found in response');
  return { results: [], method: 'none' };
}
