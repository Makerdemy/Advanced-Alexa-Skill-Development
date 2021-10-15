//requiring ask-sdk-core library
const Alexa = require('ask-sdk-core');
const data = require('./carDataFile.json');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to car recommendation skill. What are you looking for in a car?';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('What kind of car do you want?')
            .getResponse();
    }
};

const StartedCarIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CarIntent'
            && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },handle(handlerInput) {
        //store the CarIntent as current Intent
        const currentIntent = handlerInput.requestEnvelope.request.intent;
        return handlerInput.responseBuilder
            .addDelegateDirective(currentIntent)
            .getResponse();
    }
};


const CompletedCarIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CarIntent'
            && handlerInput.requestEnvelope.request.dialogState === "COMPLETED";
    },
    async handle(handlerInput) {
        const req = handlerInput.requestEnvelope.request.intent
        let fuel_ip = req.slots.fuel.value;
        let size_ip = req.slots.size.value;
        let gear_ip = req.slots.gear.value;
        let layout_ip = req.slots.layout.value;
        let seats_ip = req.slots.seats.value; 
        
        let fuel = resolveEntity(req.slots, "fuel");
        let size = resolveEntity(req.slots, "size");
        let gear = resolveEntity(req.slots, "gear");
        let layout = resolveEntity(req.slots, "layout");
        let seats = resolveEntity(req.slots, "seats");
        
        const key = `${size}-${fuel}-${gear}-${layout}-${seats}`;
        const databaseResponse = data[key];
        
        var speakOutput = `I recommend a ${databaseResponse.name}`; 
       
          return handlerInput.responseBuilder
                 .speak(speakOutput)
                 .reprompt(speakOutput)
                 .getResponse();
     
    }
};

//to get canonical value from given input
const resolveEntity = function(resolvedEntity, slot) {

    let erAuthorityResolution = resolvedEntity[slot].resolutions.resolutionsPerAuthority[0];
    
    let value = null;

    if (erAuthorityResolution.status.code === 'ER_SUCCESS_MATCH') {
        value = erAuthorityResolution.values[0].value.name;
    }

    return value;
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

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        
        return handlerInput.responseBuilder.getResponse();
    }
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
        
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        StartedCarIntentHandler,
        CompletedCarIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, 
    )
    .addErrorHandlers(
        ErrorHandler,
    ) 
    .lambda();