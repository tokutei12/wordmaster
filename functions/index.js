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

// API.AI Intent names
const PLAY_BEGINNER_INTENT = 'playBeginner';
const ANSWER_BEGINNER_INTENT = 'answerBeginner';

// Contexts
const QUESTION_CONTEXT = 'question';

// Context Parameters
const QUESTION_PARAM = 'questionId';
const ANSWER_PARAM = 'answer';

const answerPossibilities = {
    0: ['a', 'the first word', 'first word', 'the first one', 'first one', 'number one', 'one'],
    1: ['b', 'the fourth word', 'fourth word', 'the fourth one', 'fourth one', 'number four', 'four'],
    2: ['c', 'the fourth word', 'fourth word', 'the fourth one', 'fourth one', 'number four', 'four'],
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

exports.assistantcodelab = functions.https.onRequest((request, response) => {

   const assistant = new Assistant({request: request, response: response});

   let actionMap = new Map();
   actionMap.set(PLAY_BEGINNER_INTENT, playBeginner);
   actionMap.set(ANSWER_BEGINNER_INTENT, answerBeginner);
   assistant.handleRequest(actionMap);

    function playBeginner(assistant) {
        //assistant.ask('Hello');
        const parameters = {};
        parameters[QUESTION_PARAM] = '0';
        assistant.setContext(QUESTION_CONTEXT, 2, parameters);

        const answerChoices = formatAnswers(beginnerQuestionBank[0].choices);
        assistant.ask(`${beginnerQuestionBank[0].question} ${answerChoices}`);
    }

    function answerBeginner(assistant) {
        const user_answer = assistant.getArgument(ANSWER_PARAM).toLowerCase();
        const contexts = assistant.getContexts();
        //console.log(contexts);
        const priorQuestion = assistant.getContextArgument(QUESTION_CONTEXT, QUESTION_PARAM).value;
        const correct_answer_position = beginnerQuestionBank[priorQuestion].answerPosition;
        const correct_answer = beginnerQuestionBank[priorQuestion].choices[correct_answer_position].toLowerCase();
        const correct_possibilities = answerPossibilities[correct_answer_position].slice();

        answerPossibilities[correct_answer_position].forEach((word) => {
            correct_possibilities.push(`${word} ${correct_answer}`);
        });
        correct_possibilities.push(correct_answer);

        console.log(correct_possibilities);
        console.log(user_answer);

        if (correct_possibilities.includes(user_answer)) {
            assistant.ask('Great, that\'s correct!');
            //set context
        } else {
            assistant.ask('Sorry, that\'s not quite right');
        }
    }

});