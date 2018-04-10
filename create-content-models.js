const contentful = require('contentful-management');
const fs = require('fs');
const yaml = require('js-yaml');
const env = require('dotenv');

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

if (!process.env.CONTENTFUL_SPACE_NAME) {
  console.log('Please, set the CONTENTFUL_SPACE_NAME variable into the file: ' + dotEnvFilePath);
  process.exit(5);
}
const spaceName = process.env.CONTENTFUL_SPACE_NAME;

if (!process.env.SOURCE_MODELS_DIR) {
  console.log('Please, set the SOURCE_MODELS_DIR variable into into the file: ' + dotEnvFilePath);
  process.exit(6);
}
const modelsDir = process.env.SOURCE_MODELS_DIR;

const envFileContent = fs.readFileSync(dotEnvFilePath, 'utf-8');
if (-1 !== envFileContent.indexOf('CONTENTFUL_SPACE_ID')) {
  console.log('The space ID variable has been already set into the .env file (' + dotEnvFilePath + ')');
  console.log('Please, remove the line and relaunch the current command!');
  process.exit(7);
}

console.log('Contentful Access Token is set to: ' + accessToken);
console.log('Contentful Space Name is set to: ' + spaceName);
console.log('The source models directory is set to: ' + modelsDir + "\n\n");
console.log("I'm creating the space: " + spaceName);

const client = contentful.createClient({ accessToken: accessToken });

client.createSpace({ name: spaceName })
.then((space) => {

  console.log('The ID of the successfully created ' + spaceName + ' space is: ' + space.sys.id + "\n\n");
  fs.appendFileSync(dotEnvFilePath, 'CONTENTFUL_SPACE_ID=' + space.sys.id);

  let files = fs.readdirSync(modelsDir);
  let accumulator = [];
  for (let fileName in files) {
    let stringFileContent = fs.readFileSync(modelsDir + '/' + files[fileName], 'utf-8');
    let configurationObject = yaml.safeLoad(stringFileContent);
    accumulator[configurationObject.priority] = {
      id: configurationObject.id,
      model: JSON.stringify(configurationObject.model)
    }
  }

  console.log("I successfully created the following Content Types:");
  for (let i = 0; i < accumulator.length; i++) {
    let contentTypeConfiguration = accumulator[i];
    space.createContentTypeWithId(contentTypeConfiguration.id, contentTypeConfiguration.model)
    .then((contentType) => contentType.publish())
    .then((contentType) => console.log('- ' + contentType.sys.id))
    .catch(console.error);
  }
})
.catch((error) => { console.log(error); process.exit(8); });