const { readFileSync, writeFile } = require('fs');
const path = require('path');
const dotenv = require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = (args) => {
  const envConfig = dotenv.parsed;

  const file = path.resolve(__dirname, '../.env');
  const content = readFileSync(file, 'utf8');
  let newContent = content;

  Object.entries(args).map(([key, value]) => {
    if (value !== null && !!envConfig[key]) {
      const regex = new RegExp(`(?<=${key}=).*(?=\n)`);
      newContent = newContent.replace(regex, value);
    }

    return newContent;
  });

  writeFile(file, newContent, () => {});
};
