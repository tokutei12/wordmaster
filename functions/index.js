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

const beginnerQuestionBank = {
    0: {
        question: 'Which of these words means \'cruel or inhumane treatment\'? A. Antagonist. B. Antonym. C. Aggressive. or D. Abuse.',
        answer: ['d abuse', 'abuse', 'd', 'the fourth word', 'fourth word', 'the fourth one', 'fourth one', 'number four', 'four']
    }
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
        assistant.ask(beginnerQuestionBank[0].question);
    }

    function answerBeginner(assistant) {
        const answer = assistant.getArgument(ANSWER_PARAM);
        const contexts = assistant.getContexts();
        //console.log(contexts);
        const priorQuestion = assistant.getContextArgument(QUESTION_CONTEXT, QUESTION_PARAM).value;
        const correct_answer = beginnerQuestionBank[priorQuestion].answer;
        assistant.ask(`You said: ${answer}. The question number was: ${priorQuestion}`);
    }

});