module.exports = (base64String) => {
    const uriResponse = Buffer.from(base64String.split(',')[1], 'base64');
    return JSON.parse(uriResponse);
};
