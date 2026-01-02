import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => {
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
      ${className}`}
    >
      <ReactMarkdown>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
