/**
 * Escapes special regex characters in a string to prevent ReDoS attacks.
 * Use this before inserting user input into a MongoDB $regex query.
 */
export const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
