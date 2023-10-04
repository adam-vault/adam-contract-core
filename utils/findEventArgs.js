const _ = require('lodash');

module.exports = async (transaction, eventName, eventArg) => {
    const receipt = await transaction.wait();
    const creationEventLog = _.find(receipt.events, { event: eventName });
    if (!eventArg) {
        return creationEventLog.args;
    }
    return creationEventLog.args[eventArg];
};
