import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { normalizeMarkdownTables } from '@/utils/markdownTableNormalizer';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const stripExportSourcesJson = (content: string) => {
  return content.replace(/```json\s*([\s\S]*?)\s*```/gi, (fullMatch, jsonContent) => {
    try {
      const parsed = JSON.parse(String(jsonContent).trim());
      if (parsed && Array.isArray(parsed.sources)) {
        return '';
      }
    } catch {
      return fullMatch;
    }

    return fullMatch;
  }).trim();
};

const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => {
  // Pre-process content to fix malformed tables
  const normalizedContent = useMemo(() => {
    return normalizeMarkdownTables(stripExportSourcesJson(content));
  }, [content]);

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none 
      prose-p:mb-2 prose-p:last:mb-0
      prose-ul:list-disc prose-ul:pl-4 prose-ul:mb-2
      prose-ol:list-decimal prose-ol:pl-4 prose-ol:mb-2
      prose-li:text-sm prose-li:my-0.5
      prose-strong:font-semibold
      prose-headings:font-semibold
      prose-h1:text-lg prose-h1:mt-4 prose-h1:mb-2
      prose-h2:text-base prose-h2:mt-3 prose-h2:mb-2
      prose-h3:text-sm prose-h3:mt-2 prose-h3:mb-1
      prose-blockquote:border-l-2 prose-blockquote:border-primary/50 prose-blockquote:pl-3
      prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
      prose-table:w-full prose-table:border-collapse prose-table:my-3
      prose-thead:bg-muted/50 prose-thead:border-b-2 prose-thead:border-border
      prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-xs prose-th:border prose-th:border-border
      prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-border prose-td:text-xs
      prose-tr:border-b prose-tr:border-border
      prose-hr:border-border prose-hr:my-4 prose-hr:border-t-2
      ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
