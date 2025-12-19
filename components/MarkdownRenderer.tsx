import React from 'react';

// A simple markdown renderer to handle bolding, lists, and newlines from Gemini's response.
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const renderLine = (line: string, index: number) => {
        // Handle bold text like **Title:**
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        if (line.trim().startsWith('- ')) {
            return (
                <li key={index} dangerouslySetInnerHTML={{ __html: line.trim().substring(2) }} />
            );
        }
        
        if (line.trim() === '') {
            return <br key={index} />;
        }

        return <p key={index} dangerouslySetInnerHTML={{ __html: line }} />;
    };

    const blocks = content.split('\n\n');

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
            {blocks.map((block, blockIndex) => {
                const lines = block.split('\n');
                const isList = lines.some(line => line.trim().startsWith('- '));
                
                if (isList) {
                    return (
                        <ul key={blockIndex} className="list-disc pl-5 space-y-1">
                            {lines.map(renderLine)}
                        </ul>
                    );
                }
                
                return <div key={blockIndex}>{lines.map(renderLine)}</div>;
            })}
        </div>
    );
};

export default MarkdownRenderer;
