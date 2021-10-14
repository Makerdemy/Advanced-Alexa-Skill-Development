
const Alexa = require('ask-sdk-core');
const moment = require('moment-timezone');  //instance for moment-timezone npm
const accountSid = 'ACec3a2c1df5700d975945b50e665a1c33';  //twilio account sid
const authToken = '748866cff29329376bb2448e5fbcb081';  //twilio account authentication token
const Tclient = require('twilio')(accountSid, authToken);  //instance for twilio api
var number; //global variable for storing number

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        var speakOutput=" ";
        //checking if the profile exists
    
        const person = handlerInput.requestEnvelope.context.System.person;
        const consentToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
        const reminderApiClient = handlerInput.serviceClientFactory.getReminderManagementServiceClient(); //instance for reminder api client
        const currentDateTime = moment().tz('Asia/Calcutta'); //getting current date and time to ue in reminder Object
        //creating reminder object with SCHEDULED_ABSOLUTE type set to 12 minutes from the start of ordering
        const reminderRequest = {
              requestTime: currentDateTime.format('YYYY-MM-DDTHH:mm:ss'),
              trigger: {
                type: 'SCHEDULED_ABSOLUTE',
                scheduledTime: currentDateTime.add(12,'minutes').format('YYYY-MM-DDTHH:mm:ss'),
                timeZoneId: 'Asia/Calcutta'
              },
              alertInfo: {
                spokenInfo: {
                  content: [{
                    locale: 'en-US',
                    text: 'Coffe is ready',
                  }],
                },
              },
              pushNotification: {
                status: 'ENABLED',
              }
            }
        
        //checking if personId exists
        if (person) {
            
          const personId = person.personId;
         
          speakOutput = " Welcome to barista skill <alexa:name type=\"first\" personId=\""+ personId + "\"/>. Say - barista to get started";
        
        } else {
            speakOutput = "Hey stranger, welcome to barista skill!"
        }
        
         try {
            const client = handlerInput.serviceClientFactory.getUpsServiceClient(); //instance for Ups Service Client
            await reminderApiClient.createReminder(reminderRequest); //creating reminder
            number = await client.getPersonsProfileMobileNumber();  //retrieving number using person profile api
            
            let response;
            //checking if number value is provided and building response
            if (number === null) {
                response = handlerInput.responseBuilder.speak("Number has not been provided").getResponse();
            } 
            else {
                response = handlerInput.responseBuilder.speak(speakOutput).withSimpleCard("Welcome").getResponse();
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



const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        //delegating dialogs to Alexa Conversations with response set to 'welcome'

        return handlerInput.responseBuilder
            .addDirective({
                'type': 'Dialog.DelegateRequest',
                'target': 'AMAZON.Conversations',
                'period': {
                    'until': 'EXPLICIT_RETURN'
                },
                'updatedRequest': {
                    'type': 'Dialog.InputRequest',
                    'input': {
                        'name': 'welcome'
                    }
                }
            })
            .getResponse();
    }
};

//Api handler definition
const GetOrderHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Dialog.API.Invoked' && handlerInput.requestEnvelope.request.apiRequest.name === 'getOrderApi';
    },
    async handle(handlerInput) {
        const apiRequest = handlerInput.requestEnvelope.request.apiRequest;
        //resolving slot values to respective slots
        let warmth = resolveEntity(apiRequest.slots, "warmth");
        let coffee = resolveEntity(apiRequest.slots, "coffee");
        let addon = resolveEntity(apiRequest.slots, "addon");
        
        const orderEntity = {};  //object to send api result
        
        //adding elements to object to be sent back
        
        if(warmth!==null && coffee!==null && addon!==null){
            orderEntity.warmth = apiRequest.arguments.warmth;
            orderEntity.coffee = apiRequest.arguments.coffee;
            if(addon === "no topping"){
                orderEntity.addon = addon;
            }
            else{
                orderEntity.addon = apiRequest.arguments.addon;
            }
        }
        //sending order confirmation message to phone number along with coupons using twilio
        Tclient.messages
            .create({body: 'Order confirmed - '+coffee+ '. Use #makerdemy2021 to avail 15% off on your next order', from: '+12243007704', to: '+91'+number.phoneNumber})
            .then(message => console.log(message.sid))
            .catch((error) => console.log(error));
        
        const response = buildSuccessApiResponse(orderEntity);
        console.log(JSON.stringify(response));
        
        return response;
    }
}

//resolutions function
const resolveEntity = function(resolvedEntity, slot) {

    let erAuthorityResolution = resolvedEntity[slot].resolutions.resolutionsPerAuthority[0];
    let value = null;

    if (erAuthorityResolution.status.code === 'ER_SUCCESS_MATCH') {
        value = erAuthorityResolution.values[0].value.name;
    }

    return value;
};

//response builder function
const buildSuccessApiResponse = (returnEntity) => {
    return { apiResponse: returnEntity };
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
        GetOrderHandler,
        HelloWorldIntentHandler,
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