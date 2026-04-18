import React, { useState } from 'react';

const CodeBlock = ({ code, language = 'bash', title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 code-cyber">
      {title && (
        <div className="code-cyber-header">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-cyber-cyan rounded-full animate-cyber-pulse" />
            {title}
          </span>
          <span className="text-xs opacity-70 font-mono text-cyber-muted">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className={`code-cyber-body ${title ? '' : 'rounded-t-lg'}`}>
          <code>{code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 px-3 py-1.5 bg-cyber-panel border border-cyber-border hover:border-cyber-cyan text-cyber-cyan text-xs font-mono transition-all duration-200 hover:shadow-cyber-glow"
        >
          {copied ? '[已复制]' : '[复制]'}
        </button>
      </div>
    </div>
  );
};

export default CodeBlock;
