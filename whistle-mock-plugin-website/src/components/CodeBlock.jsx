import React, { useState } from 'react';

const CodeBlock = ({ code, language = 'bash', title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6">
      {title && (
        <div className="bg-gray-800 text-gray-300 px-4 py-2 rounded-t-lg font-medium text-sm flex items-center justify-between">
          <span>{title}</span>
          <span className="text-xs opacity-70">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className={`bg-gray-900 text-gray-100 p-4 overflow-x-auto ${title ? 'rounded-b-lg' : 'rounded-lg'}`}>
          <code className={`language-${language}`}>{code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors duration-200"
        >
          {copied ? '已复制!' : '复制'}
        </button>
      </div>
    </div>
  );
};

export default CodeBlock;
