import showdown from 'showdown';

/**
 * Converts markdown text to HTML using the showdown library
 * 
 * @param {string} markdown - The markdown text to convert
 * @returns {string} - The converted HTML string
 * 
 * This function uses the showdown library to convert markdown formatted text
 * to HTML for display in the application. It enables features like tables,
 * auto-linking, strikethrough, task lists, and opening links in new windows.
 */
export const markdownToHtml = (markdown) => {
    // Return empty string if input is falsy (null, undefined, empty string)
    if (!markdown) return '';

    // Create showdown converter instance with enhanced features enabled
    const converter = new showdown.Converter({
        tables: true,              // Enable table syntax
        simplifiedAutoLink: true,  // Automatically convert URLs to links
        strikethrough: true,       // Enable strikethrough syntax
        tasklists: true,           // Enable GitHub-style task lists
        openLinksInNewWindow: true // Make links open in new tabs/windows
    });

    // Convert markdown to HTML and return the result
    return converter.makeHtml(markdown);
};

/**
 * Extracts the dish name from markdown content generated by Gemini AI
 * 
 * @param {string} markdown - The markdown text containing recipe information
 * @returns {string} - The extracted dish name or a default value
 * 
 * This function attempts to extract the dish name from recipe markdown using
 * several strategies in order of preference:
 * 1. Look for "Main Course:" pattern
 * 2. Find the first non-empty line that doesn't start with markdown formatting
 * 3. Return a default name if no suitable title is found
 */
export const extractDishName = (markdown) => {
    // First attempt: Look for "Main Course:" pattern which is common in Gemini's recipe format
    const match = markdown.match(/Main Course:\s*(.+)/i);
    if (match) {
        return match[1].split('\n')[0]; // Get just the first line of the match
    }

    // Second attempt: Try to extract the title from the first non-markdown-formatted line
    const lines = markdown.split('\n');
    for (const line of lines) {
        const trimmedLine = line.trim();
        // Look for a line that might be a title (non-empty, not starting with common markdown elements)
        if (trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('-') && 
            !trimmedLine.startsWith('*') && !trimmedLine.startsWith('>')) {
            return trimmedLine;
        }
    }

    // If all extraction attempts fail, return a default dish name
    return 'Recommended Dish';
};
