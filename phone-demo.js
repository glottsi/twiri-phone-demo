const _DEFAULT_PHONE_SETTINGS_ = {
    // how long to wait before the 'is typing' message appears
    delayAfterSending: 1000,
    // how long to show the 'is typing' message
    timeSpentTyping: 1500,
    // the name that appears on the top of the phone (the person you are 'sending' the messages to)
    phoneName: 'Twiri',
    // array of messages to send/receive. one message set from this array is displayed for each time you press the button
    messages: [{
        S: "hey Twiri",
        R: "Hello, how can I help you?"
    }, {
        S: "im looking for a streamer to watch, can you help me?",
        R: "Absolutely! I will just ask you some questions and match you with the perfect streamer! Are you ready? 😊"
    }, {
        S: "yes, lets do it",
        R: "Okay so, first question: When you watch streams, what languages are they in?"
    }, {
        S: "mostly english, and korean",
        R: "<p>Excellent! 👌</p> Next question: Are you looking for a streamer with a lot of viewers? Give me a range you'd be comfortable with."
    }, {
        S: "hmm, I think between like 1000 and 5000 viewers is good for me.",
        R: "<p>Great, so great. You are doing just so, so, so, great.</p>Okay next question: The stream's content. What kind of stuff do you enjoy watching on a stream?"
    }, {
        S: "uh, I like drinking, science and technology, stocks, and uh, egirls.. and harp music.",
        R: "I see. What about aegyo?"
    }, {
        S: "minimal aegyo.",
        R: "Alright, let me see here... yes... I think I've found a streamer for you!"
    }, {
        S: "great, who is it?",
        R: "🎆✨ITS JINRITV!!!!✨🎆"
    }, {
        S: "amazing, thanks",
        R: "You are welcome! Thank you for using Twiri."
    }]
}

const Directions = {
    SEND: 'send',
    RECEIVE: 'rcv'
}

const Animations = {
    isTypingShow: 'fade-in',
    isTypingHide: 'fade-out',
    [Directions.SEND]: 'scale-in-right',
    [Directions.RECEIVE]: 'scale-in-left'
}

const PhoneElementIds = {
    SCREEN: 'phone-screen',
    ISTYPING: 'is-typing-container',
    ISTYPINGNAME: 'is-typing-label',
    NAME: 'recipient-name-label'
}

var PhoneSettings = {
    ..._DEFAULT_PHONE_SETTINGS_
};

// this is used to help label the html elements, it is incremented after every message (sent or received).
var _CURRENT_MESSAGE_NUM_ = 0;

// this is used to keep track of the index of the messages 'set', it is incremented only after sending a message (not after receiving)
var _MESSAGE_SET_INDEX_ = 0;

// this is true after we have sent a message, but do not have a response yet. used to block the user from sending multiple messages if they spam the button
var _IS_WAITING_FOR_RESPONSE_ = false;

// holds the elements for the phone
var _PHONE_ELEMENTS_ = {};

function getMessageNum() {
    return _CURRENT_MESSAGE_NUM_;
}
function getCurrentMessageSet() {
    return PhoneSettings.messages[_MESSAGE_SET_INDEX_];
}
function getMessageSetIndex() {
    return _MESSAGE_SET_INDEX_;
}
function getPhoneElement(elementName) {
    return _PHONE_ELEMENTS_[elementName];
}
function incrementMessageSet() {
    _MESSAGE_SET_INDEX_ += 1;
}
function incrementMessageNum() {
    _CURRENT_MESSAGE_NUM_ += 1;
}
function setElementRef(elementId) {
    _PHONE_ELEMENTS_[elementId] = $(`#${elementId}`);
}
function resetMessageCounters() {
    _CURRENT_MESSAGE_NUM_ = 0;
    _MESSAGE_SET_INDEX_ = 0;
    _IS_WAITING_FOR_RESPONSE_ = false;
}
function setWaiting(isWaiting) {
    _IS_WAITING_FOR_RESPONSE_ = isWaiting;
}
function isWaitingForResponse() {
    return _IS_WAITING_FOR_RESPONSE_;
}
function setSetting(settingName, settingValue) {
    if (settingValue != undefined) {
        PhoneSettings[settingName] = settingValue;
    }
}
function setElementReferences() {
    Object.values(PhoneElementIds).forEach(elementId => {
        setElementRef(elementId);
    });
}
function applyUserSettings(userSettings) {
    Object.keys(PhoneSettings).forEach(setting => {
        setSetting(setting, userSettings[setting])
    });
}

// sets the name at the top of the phone, and in the is typing message
function setPhoneName() {
    const recipientName = PhoneSettings.phoneName;
    getPhoneElement(PhoneElementIds.ISTYPINGNAME).text(`${recipientName} is typing`);
    getPhoneElement(PhoneElementIds.NAME).text(recipientName);
}

// shows/hides the "person is typing" message
function setIsTyping(isTyping) {
    if (isTyping) {
        getPhoneElement(PhoneElementIds.ISTYPING).removeClass(Animations.isTypingHide);
        getPhoneElement(PhoneElementIds.ISTYPING).addClass(Animations.isTypingShow);
    } else {
        getPhoneElement(PhoneElementIds.ISTYPING).removeClass(Animations.isTypingShow);
        getPhoneElement(PhoneElementIds.ISTYPING).addClass(Animations.isTypingHide);
    }
}

// starts the animation for the message, based off it's send/receive direction
function displayMessage(dir, msgNum) {
    getPhoneElement(`msg${msgNum}`).addClass(Animations[dir])
}

// appends the html to the phone element, sets a reference to the element, and animates the message entrance
function addMessageToScreen(direction, message) {
    let thisMessageNum = getMessageNum();
    getPhoneElement(PhoneElementIds.SCREEN).append(createSMSMessage({ direction, message, num: thisMessageNum }))
    setElementRef(`msg${thisMessageNum}`);
    displayMessage(direction, thisMessageNum);
    getPhoneElement(PhoneElementIds.SCREEN).scrollTop(getPhoneElement(PhoneElementIds.SCREEN).prop("scrollHeight"));
    if (direction == Directions.SEND) {
        incrementMessageSet();
    }
    incrementMessageNum();
}

// 'sends' the message, in either SENT or RECEIVE direction, with a delay in ms, and a callback function to call once the timeout is complete.
function sendMessageAndCallback(msg, direction, delay, callback) {
    addMessageToScreen(direction, msg);
    setTimeout(() => {
        if (callback) callback();
    }, delay);
}

// displays the 'is typing' message for the amount of ms delay, and a callback to call once they are no longer 'typing'
function startTypingAndCallback(delay, callback) {
    setIsTyping(true);
    setTimeout(() => {
        setIsTyping(false);
        if (callback) callback();
    }, delay);
}

// returns true if there are no more messages in the queue
function noMessages() {
    return (getMessageSetIndex() >= PhoneSettings.messages.length);
}

// when user presses the button: sends a message, and then gets a response
function sendMessageAndGetResponse() {
    // if there are no more messages to send, or if the user is waiting for a response, do nothing
    if (noMessages() || isWaitingForResponse()) {
        return
    }
    // blocks the user from sending another message
    setWaiting(true);

    // grab the current sent and received message pair from the array
    let newMessages = getCurrentMessageSet();

    // preparing the callback function for after we send the message, it is not run until after the PhoneSettings.delayAfterSending timeout has elapsed.
    const callbackAfterSending = () => {

        // prepares the callback function for what happens after the 'is typing' message is hidden (once the timeout has completed)
        // we want to send the response message now, so we call the same sendMessageAndCallback() function, but the callback here sets the isWaiting value to false, to unblock the button so we can send another message.
        const afterTypingCallback = () => sendMessageAndCallback(newMessages.R, Directions.RECEIVE, 0, setWaiting(false));

        // starts displaying the 'is typing' message for the amount of ms in PhoneSettings.timeSpentTyping, and runs the afterTypingCallback function on timeout
        startTypingAndCallback(PhoneSettings.timeSpentTyping, afterTypingCallback);
    }

    // sends the message, then runs the callback after the PhoneSettings.delayAfterSending timeout
    sendMessageAndCallback(newMessages.S, Directions.SEND, PhoneSettings.delayAfterSending, callbackAfterSending);
}

function createSMSMessage(sms) {
    return `<div id="msg${sms.num}" class="msg-row row">
                <div class="col">
                    <div class="msg msg-${sms.direction}">
                        ${sms.message}       
                    </div>
                </div>       
            </div>`
}

const BuildPhoneHTML = () => {
    return `<div class="msg-container">
                <div id="chat-screen-header" class="screen-header">
                    <span id="${PhoneElementIds.NAME}"></span>
                </div>
                <div class="holder">  
                    <div id="${PhoneElementIds.SCREEN}" class="msg-content">
                    </div>
                    <div id="${PhoneElementIds.ISTYPING}" class="is-typing-container text-center">
                        <span id="${PhoneElementIds.ISTYPINGNAME}"></span>
                        <div id="fountainG">
                            <div id="fountainG_1" class="fountainG"></div>
                            <div id="fountainG_2" class="fountainG"></div>
                            <div id="fountainG_3" class="fountainG"></div>
                            <div id="fountainG_4" class="fountainG"></div>
                            <div id="fountainG_5" class="fountainG"></div>
                            <div id="fountainG_6" class="fountainG"></div>
                            <div id="fountainG_7" class="fountainG"></div>
                            <div id="fountainG_8" class="fountainG"></div>
                        </div>
                    </div>
                </div>
                <div class="send-message-container">
                    <button class="btn btn-brand" onclick="sendMessageAndGetResponse()">send message</button>
                </div>
            </div>`
}

function SetupPhone(userSettings = {}) {
    applyUserSettings(userSettings);
    setElementReferences();
    setPhoneName();
    resetMessageCounters();
}

$(() => {
    $('#put-phone-here').html(BuildPhoneHTML());
    SetupPhone();
})