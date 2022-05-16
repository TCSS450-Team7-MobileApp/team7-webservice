/**
 * Checks the parameter to see if it is a a String with a length greater than 0.
 *
 * @param {string} param the value to check
 * @returns true if the parameter is a String with a length greater than 0, false otherwise
 */
let isStringProvided = (param) => param !== undefined && param.length > 0;

// Feel free to add your own validations functions!
// for example: isNumericProvided, isValidPassword, isValidEmail, etc
// don't forget to export any

/**
 * Checks the parameters to see if the input is in a format of an email.
 *
 * @param {string} email the email input.
 * @returns true if the parameter matches the format expressed by the regex, false otherwise.
 */
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Checks the parameter to see if the following conditions are satisfied:
 * 1. Length needs to be at least 7 characters
 * 2. Password needs to have at least 1 special character i.e "@#$%&*!?"
 * 3. No white space anywhere
 * 4. Contains at least 1 digit
 * 5. If the password is mostly lowercase, it should contain at least 1 uppercase character
 *    If the password is mostly uppercase, it should contain at least 1 lowercase character.
 *
 * @param {string} password the password input.
 * @returns true if the password satisfies the requirements, false otherwise.
 */
const validatePassword = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%&*!?])[A-Za-z\d@#$%&*!?]{7,}$/.test(
        password
    );

module.exports = {
    isStringProvided,
    validateEmail,
    validatePassword,
};
