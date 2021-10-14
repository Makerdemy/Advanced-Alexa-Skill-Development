const Alexa = require('ask-sdk-core');
const moment = require('moment-timezone'); //instance for moment-timezone npm

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const { permissions } = handlerInput.requestEnvelope.context.System.user;  //checking if the user has provided permissions and directing them to voice permission method if they haven't

    if (!permissions) {

      handlerInput.responseBuilder
        .addDirective({
          type: "Connections.SendRequest",
          name: "AskFor",
          payload: {
            "@type": "AskForPermissionsConsentRequest",
            "@version": "1",
            "permissionScope": "alexa::alerts:reminders:skill:readwrite"
          },
          token: ""
        });

    } else {
      handlerInput.responseBuilder
        .speak("Hello. You can say 'remind me' to set a reminder.")
        .reprompt("Say: 'remind me' to set a reminder.")
    }

    return handlerInput.responseBuilder
      .getResponse();
  }
};

//response from the voice permissions SendRequest
const ConnectionsResponsetHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Connections.Response';
  },
  handle(handlerInput) {
    const { permissions } = handlerInput.requestEnvelope.context.System.user;

    console.log(JSON.stringify(handlerInput.requestEnvelope));
    console.log(handlerInput.requestEnvelope.request.payload.status);

    const status = handlerInput.requestEnvelope.request.payload.status;

    switch (status) {
      case "ACCEPTED":
        handlerInput.responseBuilder
          .speak("Now that you've provided permission - you can say: set a reminder.")
          .reprompt('To set a reminder, say: set a reminder.')
        break;
      case "DENIED":
        handlerInput.responseBuilder
          .speak("Sorry, I can't set a reminder without permissions.");
        break;
      case "NOT_ANSWERED":

        break;
      default:
        handlerInput.responseBuilder
          .speak("Now that you've provided permission - you can say: set a reminder.")
          .reprompt('To set a reminder, say: set a reminder.')
    }

    return handlerInput.responseBuilder
      .getResponse();
  }
};

const CreateReminderIntentHandler = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    return request.type === 'IntentRequest' && request.intent.name === 'CreateReminderIntent';
  },
  async handle(handlerInput) {
    const { requestEnvelope, serviceClientFactory, responseBuilder } = handlerInput;
    
    console.log(JSON.stringify(handlerInput));
    
    const time = handlerInput.requestEnvelope.request.intent.slots.time.value;  //retrieving time from time slot
    const event = handlerInput.requestEnvelope.request.intent.slots.event.value;  //retrieving event to note from event slot
    
    var arr = time.split(":");
    
    //scheduling a reminder for the said event
    try {
      const speechText = "Alright! I've scheduled a reminder for you at "+time+". Event: ."+event;
      const currentDateTime = moment().tz('Asia/Calcutta');

      const reminderManagementServiceClient = serviceClientFactory.getReminderManagementServiceClient();
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
                    freq: 'DAILY'
                }
              },
              alertInfo: {
                spokenInfo: {
                  content: [{
                    locale: 'en-US',
                    text: event,
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
    const speakOutput = 'You can set a reminder by saying - remind me! How can I help?';

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
    ConnectionsResponsetHandler,
    CreateReminderIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers 
  )
  .addErrorHandlers(
    ErrorHandler,
  )
  .withApiClient(new Alexa.DefaultApiClient())
  .lambda();
