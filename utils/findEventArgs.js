const _ = require('lodash');

module.exports = async (transaction, eventName, eventArg) => {
  const receipt = await transaction.wait();
  const creationEventLog = _.find(receipt.events, { event: eventName });
  return creationEventLog.args;
};
