const contentful = require('contentful-management')
const fs = require('fs');
const yaml = require('js-yaml');
const env = require('dotenv');

const suffix = Date.now();

if (!process.env.NODE_ENV) {
  console.log('Please, set the NODE_ENV variable');
  process.exit(2);
}

const dotEnvFilePath = 'envs/' + process.env.NODE_ENV + '/.env';

if (!fs.existsSync(dotEnvFilePath)) {
  console.log('The configuration dotenv file (' + dotEnvFilePath + ') based '
  + 'on process.env.NODE_ENV (' + process.env.NODE_ENV  + ') does not exists');
  process.exit(3);
}

env.config({ path: dotEnvFilePath });

if (!process.env.CONTENTFUL_ACCESS_TOKEN) {
  console.log('Please, set the CONTENTFUL_ACCESS_TOKEN variable into the file: ' + dotEnvFilePath);
  process.exit(4);
}
const accessToken = process.env.CONTENTFUL_ACCESS_TOKEN;

if (!process.env.THEME_DIR_NAME) {
  console.log('Please, set the THEME_DIR_NAME variable into the file: ' + dotEnvFilePath);
  process.exit(5);
}
const themeDir = process.env.THEME_DIR_NAME;

if (!process.env.CONTENTFUL_SPACE_ID) {
  console.log('Please, set the CONTENTFUL_SPACE_ID variable into the file: ' + dotEnvFilePath);
  process.exit(6);
}
const spaceId = process.env.CONTENTFUL_SPACE_ID;

if (!process.env.SOURCE_CONFIG_DIR) {
  console.log('Please, set SOURCE_CONFIG_DIR variable into the file: ' + dotEnvFilePath);
  process.exit(7);
}
const configsDir = process.env.SOURCE_CONFIG_DIR;

if (!process.env.CONTENTFUL_API_KEY_ID_PREFIX) {
  console.log('Please, set CONTENTFUL_API_KEY_ID_PREFIX variable into the file: ' + dotEnvFilePath);
  process.exit(8);
}
const apiKeyId = process.env.CONTENTFUL_API_KEY_ID_PREFIX + '-' + suffix;

if (!process.env.CONTENTFUL_API_KEY_NAME_PREFIX) {
  console.log('Please, set CONTENTFUL_API_KEY_NAME_PREFIX variable into the file: ' + dotEnvFilePath);
  process.exit(9);
}
const apiKeyName = process.env.CONTENTFUL_API_KEY_NAME_PREFIX + suffix;

console.log('Contentful Access Token is set to: ' + accessToken);
console.log('Contentful Space Id is set to: ' + spaceId);
console.log('Theme Directory Name is set to: ' + themeDir);
console.log('Source Configuration Directory is set to: ' + configsDir);
console.log('Contentful Api Key ID is set to: ' + apiKeyId);
console.log('Contentful Api Key Name is set to: ' + apiKeyName + "\n\n");

const client = contentful.createClient({ accessToken: accessToken });

client.getSpace(spaceId)
.then((space) => {

  space.createApiKeyWithId(apiKeyId, { name: apiKeyName })
  .then((apiKey) => {

    let files = fs.readdirSync(configsDir);
    let accumulator = [];
    for (let fileName in files) {
      let stringFileContent = fs.readFileSync(configsDir + '/' + files[fileName], 'utf-8');
      let contentObject = yaml.safeLoad(stringFileContent);
      accumulator[contentObject.priority] = {
        type: contentObject.contentType,
        id: contentObject.id,
        content: JSON.stringify({ fields: contentObject.content })
                     .replace(/\{themeDir\}/g, themeDir)
                     .replace(/\{contentfulSpaceId\}/g, spaceId)
                     .replace(/\{contentfulDeliveryToken\}/g, apiKey.accessToken)
      }
    }

    for (let i = 0; i < accumulator.length; i++) {
      let contentConfiguration = accumulator[i];
      space.createEntryWithId(contentConfiguration.type, contentConfiguration.id, contentConfiguration.content)
      .then((entry) => entry.publish())
      .then((entry) => {
        console.log("I created the following entry");
        console.log("ID: " + contentConfiguration.id);
        console.log("Type: " + contentConfiguration.type);
        console.log("Content: " + contentConfiguration.content + "\n");
      })
      .catch((error) => { console.log(error); process.exit(10); });
    }

  }).catch((error) => { console.log(error); process.exit(11); });

}).catch((error) => { console.log(error); process.exit(12); });
