import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink } from 'lucide-react';

const MessageRenderer = ({ content, onFileClick }) => {
  // Process content to detect file names and convert to markdown links
  const processContent = (text) => {
    if (!text) return '';
    
    // Detect file names in format: filename.ext
    // Matches: passport.pdf, ielts_result.docx, photo-2024.jpg, etc.
    const filePattern = /\b([a-zA-Z0-9_-]+\.(pdf|doc|docx|jpg|jpeg|png|txt|csv|xlsx|xls))\b/gi;
    
    return text.replace(filePattern, (match) => {
      // Only convert if not already part of a markdown link
      const beforeMatch = text.substring(0, text.indexOf(match));
      if (beforeMatch.endsWith('[') || beforeMatch.endsWith('](')) {
        return match;
      }
      return `[${match}](file://${match})`;
    });
  };

  // Custom renderers for markdown components
  const components = {
    // Link renderer - handles both file links and regular links
    a: ({ node, children, href, ...props }) => {
      const isFileLink = href?.startsWith('file://');
      
      if (isFileLink) {
        const fileName = href.replace('file://', '');
        return (
          <button
            onClick={() => onFileClick && onFileClick(fileName)}
            className="text-blue-600 hover:text-blue-800 underline decoration-blue-600 inline-flex items-center gap-0.5 cursor-pointer font-medium transition-colors"
            type="button"
            {...props}
          >
            {children}
            <ExternalLink size={12} className="opacity-70" />
          </button>
        );
      }
      
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
          {...props}
        >
          {children}
        </a>
      );
    },
    
    // Paragraph with proper spacing
    p: ({ children }) => (
      <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
    ),
    
    // Unordered list
    ul: ({ children }) => (
      <ul className="list-disc ml-5 mb-2 space-y-1">{children}</ul>
    ),
    
    // Ordered list
    ol: ({ children }) => (
      <ol className="list-decimal ml-5 mb-2 space-y-1">{children}</ol>
    ),
    
    // List item
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    
    // Inline code
    code: ({ node, inline, children, ...props }) => {
      if (inline) {
        return (
          <code
            className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono"
            {...props}
          >
            {children}
          </code>
        );
      }
      
      // Code block
      return (
        <pre className="bg-gray-100 text-gray-800 p-3 rounded-lg mb-2 overflow-x-auto">
          <code className="text-xs font-mono" {...props}>
            {children}
          </code>
        </pre>
      );
    },
    
    // Headers
    h1: ({ children }) => (
      <h1 className="text-lg font-bold mb-2 mt-1">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-base font-bold mb-1.5 mt-1">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-bold mb-1 mt-0.5">{children}</h3>
    ),
    
    // Strong/Bold
    strong: ({ children }) => (
      <strong className="font-semibold text-gray-900">{children}</strong>
    ),
    
    // Emphasis/Italic
    em: ({ children }) => <em className="italic">{children}</em>,
    
    // Blockquote
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-700">
        {children}
      </blockquote>
    ),
    
    // Horizontal rule
    hr: () => <hr className="my-3 border-gray-300" />,
    
    // Table
    table: ({ children }) => (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full border-collapse border border-gray-300">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold text-left text-sm">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-gray-300 px-2 py-1 text-sm">{children}</td>
    ),
  };

  const processedContent = processContent(content);

  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MessageRenderer;
