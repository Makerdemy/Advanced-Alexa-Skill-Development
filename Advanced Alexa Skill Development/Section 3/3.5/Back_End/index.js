/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to person profile A. P. I.. skill, you can ask for your voice profile details - name and number. What would you like to do?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .withSimpleCard("Person Profile API Skill")
            .getResponse();
    }
};

const ProfileIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ProfileIntent';
    },
    async handle(handlerInput) {
        const detail = handlerInput.requestEnvelope.request.intent.slots.detail.value; //receiving details asked for in case they only want name or number
        var details_er ; 
        //entity resolution for finding out if they want name or number in case they only want one
        if(detail){
            details_er = handlerInput.requestEnvelope.request.intent.slots.detail.resolutions.resolutionsPerAuthority[0].values[0].value.name; 
        }
        //identifying if the voice profile exists
        const person = handlerInput.requestEnvelope.context.System.person;
        const consentToken = handlerInput.requestEnvelope.context.System.apiAccessToken;

        if (person) {
            const personId = person.personId;
        } else {
            return handlerInput.responseBuilder
                .speak("Sorry, I could not recognize your voice profile. Please set one up in the Alexa app and enable skill personalization.")
                .reprompt("Profile not recognized")
                .getResponse();
        }
        //using try catch method to get name and number of the voice profile

        try {
            const client = handlerInput.serviceClientFactory.getUpsServiceClient();
            const name = await client.getPersonsProfileName();
            const number = await client.getPersonsProfileMobileNumber();
            
            let response;
            
            if(details_er==="full name"){
                if (name === null) {
                    response = handlerInput.responseBuilder.speak("Name has not been provided")
                        .getResponse();
                } else {
                    const speakOutput = `Name provided is : ${name}`;
                    response = handlerInput.responseBuilder.speak(speakOutput).withSimpleCard("Details", "Name: "+name)
                        .getResponse();
                }
            }
            else if(details_er==="number"){
                if (number === null) {
                    response = handlerInput.responseBuilder.speak("Number has not been provided")
                        .getResponse();
                } else {
                    const speakOutput = `Number provided is : <say-as interpret-as="telephone"> ${number.countryCode} ${number.phoneNumber}</say-as>`;
                    response = handlerInput.responseBuilder.speak(speakOutput).withSimpleCard("Details", "Number: "+number.countryCode+" "+number.phoneNumber)
                        .getResponse();
                }
            }
            else if(!details_er){
                if(name === null || number === null){
                    response = handlerInput.responseBuilder.speak("Please provide all details")
                        .getResponse();
                }
                else{
                    const speakOutput = `Name provided is : ${name} `+ `Number provided is : <say-as interpret-as="telephone"> ${number.countryCode} ${number.phoneNumber}</say-as>.`;
                    response = handlerInput.responseBuilder.speak(speakOutput).withSimpleCard("Details", "\r\n Full Name: "+name+"\r\n Number: "+number.countryCode+number.phoneNumber )
                        .getResponse();
                }
            }
            
            return response;
            
        } catch (error) {
            if (error.name !== 'ServiceError') {
                const response = handlerInput.responseBuilder.speak("Uh oh, something went wrong").getResponse();
                return response;
            }
            throw error;
        }
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

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
 //adding permissions card along with error handler
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        if (error.statusCode === 403) {
            return handlerInput.responseBuilder
                .speak("Please provide missing permissions")
                .withAskForPermissionsConsentCard(['alexa::profile:mobile_number:read', 'alexa::profile:name:read'])
                .getResponse();
        }
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    },
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        ProfileIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient()) 
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();