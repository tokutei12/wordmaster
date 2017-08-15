/**
* Copyright 2017 Google Inc. All Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*      http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
'use strict';

process.env.DEBUG = 'actions-on-google:*';

const Assistant = require('actions-on-google').ApiAiAssistant;
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

//const dictionary = require('./dictionary');
const beginnerDict = require('./beginnerDict');
const intermediateDict = require('./intermediateDict');
const advancedDict = require('./advancedDict');
const dictionary = {
    'beginner': beginnerDict, 
    'intermediate': intermediateDict, 
    'advanced': advancedDict
};
//const beginner = admin.database().ref('/beginner');

const LEVEL_ENUM = {
    beginner: 'beginner',
    intermediate: 'intermediate',
    advanced: 'advanced'
};

// API.AI Intent names
const PLAY_BEGINNER_INTENT = 'playBeginner';
const PLAY_INTERMEDIATE_INTENT = 'playIntermediate';
const PLAY_ADVANCED_INTENT = 'playAdvanced';
const ANSWER_INTENT = 'answer';
const GIVE_UP_INTENT = 'giveUp';

// Contexts
const QUESTION_CONTEXT = 'question';
const ANSWER_CONTEXT = 'answer-question';
const ANSWER_BEGINNER_CONTEXT = 'answer-beginner';
const ANSWER_INTERMEDIATE_CONTEXT = 'answer-intermediate';
const ANSWER_ADVANCED_CONTEXT = 'answer-advanced';

// Context Parameters
const QUESTION_PARAM = 'questionId';
const ANSWER_PARAM = 'answer';

const answerPossibilities = {
    0: ['a', 'the first word', 'first word', 'the first one', 'first one', 'number one', 'one'],
    1: ['b', 'the second word', 'second word', 'the second one', 'second one', 'number two', 'two'],
    2: ['c', 'the third word', 'third word', 'the third one', 'third one', 'number three', 'three'],
    3: ['d', 'the fourth word', 'fourth word', 'the fourth one', 'fourth one', 'number four', 'four'],
};

const beginnerQuestionBank = {
    0: {
        question: 'Which of these words means \'cruel or inhumane treatment\'?',
        choices: ['Antagonist', 'Antonym', 'Aggressive', 'Abuse'],
        answerPosition: 3,
    }
}

const formatAnswers = (choices) => {
    const prefixes = ['A.', 'B.', 'C.', 'D.'];
    let answerString = '';
    for (let i = 0; i < prefixes.length; i++){
        answerString += `${prefixes[i]} ${choices[i]}. `;
    }
    return answerString;
}

const generatePickWordQuestion = (level) => {
    console.log(dictionary);
    const levelDict = dictionary[level];
    const dictKeys = Object.keys(levelDict);
    const numWords = dictKeys.length;
    const words = [];
    for (let i=0; i < 4; i+=1) {
        const randInt = Math.floor((Math.random() * numWords));
        console.log(randInt);
        words.push({
            word: dictKeys[randInt].toLowerCase(),
            definition: levelDict[dictKeys[randInt]]
        });
    }
    console.log(words);
    const position = Math.floor((Math.random() * 4));
    const correctDefinition = words[position].definition;
    const question = `Which of these words means '${correctDefinition}'?`
    const choices = words.map((obj) => obj.word);

    return {
        'question': question,
        'choices': choices,
        'answerPosition': position,
    }
}

exports.assistantcodelab = functions.https.onRequest((request, response) => {

   const assistant = new Assistant({request: request, response: response});

   let actionMap = new Map();
   actionMap.set(PLAY_BEGINNER_INTENT, playBeginner);
   actionMap.set(PLAY_INTERMEDIATE_INTENT, playIntermediate);
   actionMap.set(PLAY_ADVANCED_INTENT, playAdvanced);
   actionMap.set(ANSWER_INTENT, answerQuestion);
   actionMap.set(GIVE_UP_INTENT, giveUpQuestion);
   assistant.handleRequest(actionMap);

    function askQuestionHelper(level) {
        const parameters = {};
        const generatedQuestion = generatePickWordQuestion(level);

        parameters[QUESTION_PARAM] = generatedQuestion;
        assistant.setContext(QUESTION_CONTEXT, 1, parameters);
        assistant.setContext(ANSWER_CONTEXT, 1);

        switch(level) {
            case LEVEL_ENUM.beginner:
                assistant.setContext(ANSWER_BEGINNER_CONTEXT, 1);
                break;
            case LEVEL_ENUM.intermediate:
                assistant.setContext(ANSWER_INTERMEDIATE_CONTEXT, 1);
                break;
            default:
                assistant.setContext(ANSWER_ADVANCED_CONTEXT, 1);
        }


        const answerChoices = formatAnswers(generatedQuestion.choices);
        return `${generatedQuestion.question} ${answerChoices}`;
    }
    
    function playBeginner(assistant) {
        const question = askQuestionHelper(LEVEL_ENUM.beginner);
        assistant.ask(question);
    }

    function playIntermediate(assistant) {
        const question = askQuestionHelper(LEVEL_ENUM.intermediate);
        assistant.ask(question);
    }

    function playAdvanced(assistant) {
        const question = askQuestionHelper(LEVEL_ENUM.advanced);
        assistant.ask(question);
    }

    function askQuestionFromContextLevel(contexts) {
        const contextNames = contexts.map((contextObject) => contextObject.name);
        let newQuestion = null;

        if (contextNames.includes(ANSWER_BEGINNER_CONTEXT)) {
            newQuestion = askQuestionHelper(LEVEL_ENUM.beginner);
        } else if (contextNames.includes(ANSWER_INTERMEDIATE_CONTEXT)) {
            newQuestion = askQuestionHelper(LEVEL_ENUM.intermediate);
        } else {
            newQuestion = askQuestionHelper(LEVEL_ENUM.advanced);
        }
        return newQuestion;
    }

    function answerQuestion(assistant) {
        const user_answer = assistant.getArgument(ANSWER_PARAM).toLowerCase();
        const contexts = assistant.getContexts();

        const generatedQuestion = assistant.getContextArgument(QUESTION_CONTEXT, QUESTION_PARAM).value;

        const correct_answer_position = generatedQuestion.answerPosition;
        const correct_answer = generatedQuestion.choices[correct_answer_position].toLowerCase();
        const correct_possibilities = answerPossibilities[correct_answer_position].slice();

        // Add more choices for correct answers by adding correct word to each valid response.
        answerPossibilities[correct_answer_position].forEach((word) => {
            correct_possibilities.push(`${word} ${correct_answer}`);
        });
        correct_possibilities.push(correct_answer);

        const newQuestion = askQuestionFromContextLevel(contexts);

        if (correct_possibilities.includes(user_answer)) {
            assistant.ask(`Great, that's correct! Let's try a new question: ${newQuestion}`);
            //set context
        } else {
            assistant.ask(`Sorry, that's not quite right. The answer to that was ${correct_answer}. Here's a new question: ${newQuestion}`);
        }
    }

    function giveUpQuestion(assistant) {
        const contexts = assistant.getContexts();
        //console.log(contexts);
        const generatedQuestion = assistant.getContextArgument(QUESTION_CONTEXT, QUESTION_PARAM).value;
        const correct_answer_position = generatedQuestion.answerPosition;
        const correct_answer = generatedQuestion.choices[correct_answer_position].toLowerCase();

        const newQuestion = askQuestionFromContextLevel(contexts);
        assistant.ask(`Ok then. The answer to that was ${correct_answer}. Try this one: ${newQuestion}`);
    }

});