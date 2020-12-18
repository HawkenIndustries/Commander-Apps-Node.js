/* globals module */
module.exports = {   
    "env":{
        "es6":true,
        "node": true,
        "amd": true
    },
    "extends":[
        "eslint:recommended",
        "plugin:vue/base"
    ],
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "rules": {
        "no-console":"off",

        // Why are they there?
        "no-unused-vars": "warn",

        // Because ASI will ruin your day some day.
        "semi":["error","always"],

        // Larger breaks should be rare.
        "no-multiple-empty-lines":"warn",

        // The terseness is still readable, and encourages sameness of naming variables when
        // working between objects and creating interfaces that utilize the same names.
        "object-shorthand": ["warn", "always"], 

        // Because we need to encourage good documentation of what a function
        // is used for. 
        "require-jsdoc":["error", {
            "require": {
                "FunctionDeclaration": true
            }
        }],
        "jsdoc/require-description-complete-sentence":1,
        "jsdoc/require-description":1,
        "jsdoc/require-param":1
    },
    "plugins": [
        "jsdoc"
    ]
};