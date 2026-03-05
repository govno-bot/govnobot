// src/security/admin-validator.js
// Zero-dependency, Node.js-only admin validator for GovnoBot
// Exports: isAdmin(userId, adminList)

/**
 * Checks if a user is an admin.
 * @param {string|number} userId - The user ID to check.
 * @param {Array<string|number>} adminList - Array of admin user IDs.
 * @returns {boolean} True if userId is in adminList, false otherwise.
 */
function isAdmin(userId, adminList) {
    if (!Array.isArray(adminList)) return false;
    // Use string comparison for robustness
    return adminList.map(String).includes(String(userId));
}

module.exports = {
    isAdmin
};
