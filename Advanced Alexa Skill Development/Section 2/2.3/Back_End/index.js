const Alexa = require('ask-sdk-core');
const moment = require('moment-timezone');  //creating an instance for moment-timezone npm 

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const { permissions } = handlerInput.requestEnvelope.context.System.user;
//checking if skill has required permissions to function
    if (!permissions) {

      return handlerInput.responseBuilder
        .speak("In order to work, this skill needs permission to access your reminders, please check your Alexa app.")
        .reprompt("This skill needs permission to access your reminders.")
        .withAskForPermissionsConsentCard(['alexa::alerts:reminders:skill:readwrite'])
        .getResponse();

    } else {    //if the user has granted the required permissions, we prompt them to set reminder
      return handlerInput.responseBuilder
        .speak("Hello. You can say 'remind me' to set a reminder for checking temperature and O2 levels daily") 
        .reprompt("Say: 'remind me' to set a reminder.")
        .getResponse();
    }

  }
};

//intent to handle reminders
const CreateReminderIntentHandler = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    return request.type === 'IntentRequest' && request.intent.name === 'CreateReminderIntent';
  },
  async handle(handlerInput) {
    const { requestEnvelope, serviceClientFactory, responseBuilder } = handlerInput;
    
    const consentToken = requestEnvelope.context.System.user.permissions.consentToken; //taking consent token from the request
    const time = handlerInput.requestEnvelope.request.intent.slots.time.value;  //storing the value of time in time constant
    
    var arr = time.split(":");  //since it is stored as YYYY-MM-DDTHH:mm:ss, we split the string with : as separation
    //we prompt them for permissions in case they haven't provided permissions yet
    if (!consentToken) {
      return responseBuilder
        .speak('Please enable reminders permission in the Amazon Alexa app.')
        .withAskForPermissionsConsentCard(['alexa::alerts:reminders:skill:readwrite'])
        .getResponse();
    }
    //scheduling a reminder using try catch method
    try {
      const speechText = "Alright! I've scheduled a reminder for you at "+time;
      const currentDateTime = moment().tz('Asia/Calcutta');  //setting timezone
      //we will call reminderManagementServiceClient now
      const reminderManagementServiceClient = serviceClientFactory.getReminderManagementServiceClient();  
      //creating a reminder object to request
      const reminderRequest = {
              requestTime: currentDateTime.format('YYYY-MM-DDTHH:mm:ss'), 
              trigger: {
                type: 'SCHEDULED_ABSOLUTE',
                scheduledTime: currentDateTime.set({
                    hour: arr[0],
                    minute: arr[1],
                    second: '00'
                }).format('YYYY-MM-DDTHH:mm:ss'),
                timeZoneId: 'Asia/Calcutta',
                recurrence: {
                    freq: 'DAILY'  //frequency for the reminder
                }
              },
              alertInfo: {
                spokenInfo: {
                  content: [{
                    locale: 'en-US',
                    text: 'Please check your temperature and O2 levels.', //the text to read and display
                  }],
                },
              },
              pushNotification: {
                status: 'ENABLED',
              }
            }

      await reminderManagementServiceClient.createReminder(reminderRequest);
      return responseBuilder
        .speak(speechText)
        .getResponse();

    } catch (error) {
      console.error(error);
      return responseBuilder
        .speak('Uh oh, something went wrong.')
        .getResponse();
    }
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

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = 'You can say - remind me, to set a reminder! How can I help?';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
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
      //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
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
    CreateReminderIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
  )
  .addErrorHandlers(
    ErrorHandler,
  )
  .withApiClient(new Alexa.DefaultApiClient())  //including api client
  .lambda();
