/**
 * Retrieves the user's email from localStorage
 * 
 * @returns {string|null} - The user's email address or null if not found
 * 
 * This function attempts to retrieve the user's email from localStorage using
 * two possible sources in order of preference:
 * 1. From the 'google_user' object (for Google OAuth users)
 * 2. From the 'user' object (for users authenticated through other means)
 * 
 * The function handles potential JSON parsing errors and invalid data gracefully.
 */
export const refreshUserEmail = () => {
    // First attempt: Try to get email from google_user (Google OAuth)
    const googleUserItem = localStorage.getItem('google_user');
    try {
        // Parse the JSON, handling 'undefined' string case and null values
        const googleUser = googleUserItem && googleUserItem !== 'undefined' ? JSON.parse(googleUserItem) : null;

        // If email exists in google_user, use it and return
        if (googleUser?.email) {
            console.log('User email refreshed from google_user:', googleUser.email);
            return googleUser.email;
        } 

        // Second attempt: Try to get email from the user object (non-Google auth)
        const userItem = localStorage.getItem('user');
        const user = userItem && userItem !== 'undefined' ? JSON.parse(userItem) : null;

        // If email exists in user object, use it and return
        if (user?.email) {
            console.log('User email refreshed from user object:', user.email);
            return user.email;
        }

        // If no email found in either location, log warning and return null
        console.warn('No user email found during refresh in either google_user or user objects');
        return null;
    } catch (e) {
        // Handle any JSON parsing errors or other exceptions
        console.error('Error refreshing user email:', e);
        return null;
    }
};
