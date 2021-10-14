const Alexa = require('ask-sdk-core');
const launchDocument = require('./documents/launchDocument.json');  //instance for launch document
const birthdayDocument = require('./documents/birthdayDocument.json'); //instance for birthday document
const util = require('./util.js');  //instance for util.js

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to birthday skill. When is your birthday?';
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                document: launchDocument,
                datasources: {
                    text: {
                        type: 'object',
                        start: "Welcome",
                        middle: "to",
                        end: "Cake Time!"
                    },
                    //import images from Amazon S3 bucket
                    assets: {
                        cake: util.getS3PreSignedUrl('Media/birthday_skill/alexaCake_960x960.png'),
                        backgroundURL: getBackgroundURL(handlerInput, "lights") //importing images accoring to viewport profile
                    }
                }
            });
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

function getBackgroundURL(handlerInput, fileNamePrefix) {
    //checking what viewport the user is interacting with
    const viewportProfile = Alexa.getViewportProfile(handlerInput.requestEnvelope);
    //changing resolution according to viewport profile, for example, you need to provide high resolution images to TVs with Amazon Firestick or to an Echo Show 8
    const backgroundKey = viewportProfile === 'TV-LANDSCAPE-XLARGE' ? "Media/birthday_skill/"+fileNamePrefix+"_1920x1080.png" : "Media/birthday_skill/"+fileNamePrefix+"_1280x800.png";
    return util.getS3PreSignedUrl(backgroundKey);
}

const BirthdayIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'BirthdayIntent' ;
    },
    handle(handlerInput) {
        var speakOutput = '';
        const bday = handlerInput.requestEnvelope.request.intent.slots.date.value;  //receiving birthday date
        const bdayMs = Date.parse(bday);  //counting milliseconds lapsed since 1970 till the given birthday
        const today = new Date();
        const todayMs = Date.parse(today);  //counting milliseconds lapsed since 1970 till today
        const oneDay = 24*60*60*1000;  //milliseconds in a day
        const daysLeft = Math.round(Math.abs((todayMs - bdayMs)/oneDay));  //counting number of days left
        //if it's not the user's birthday
        if(daysLeft!==0){
            if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
                handlerInput.responseBuilder.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    document: launchDocument,
                    datasources: {
                        text: {    //altering text in the launch document to number of days left till birthday
                            type: 'object',
                            start: "Your Birthday",
                            middle: "is in",
                            end: daysLeft+" days"
                        },
                        assets: {
                            cake: util.getS3PreSignedUrl('Media/birthday_skill/alexaCake_960x960.png'),
                            backgroundURL: getBackgroundURL(handlerInput, "lights")
                        }
                    }
                });
            }
            speakOutput = "Your birthday is in "+daysLeft+" days"; 
        }
        //if it's the user's birthday
        else if(daysLeft===0||daysLeft===1){
            speakOutput="It's your birthday!";
            if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
                handlerInput.responseBuilder.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    token: 'birthdayToken',   //rendering document with birthdayToken as token and instance named birthdayDocument
                    document: birthdayDocument,
                    datasources: {
                        assets: {
                            video: "https://public-pics-muoio.s3.amazonaws.com/video/Amazon_Cake.mp4",   //link to the video
                            backgroundURL: getBackgroundURL(handlerInput, "confetti")  //switching background image to confetti
                        }
                    }
                }).addDirective({    //chaining ExecuteCommands directive 
                    type: 'Alexa.Presentation.APL.ExecuteCommands',
                    token: 'birthdayToken',
                    commands: [{
                        type: "ControlMedia",
                        componentId: "birthdayVideo",
                        command: "play"
                    }]
                });
            }
        }
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to the Birthday skill! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        BirthdayIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();