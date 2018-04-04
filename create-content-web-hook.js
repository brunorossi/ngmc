const contentful = require('contentful-management')
const fs = require('fs');
const yaml = require('js-yaml');
const env = require('dotenv');

if (!process.env.NODE_ENV) {
  console.log('Please, set the NODE_ENV variable');
  process.exit(1);
}

const dotEnvFilePath = 'envs/' + process.env.NODE_ENV + '/.env';

if (!fs.existsSync(dotEnvFilePath)) {
  console.log('The configuration dotenv file (' + dotEnvFilePath + ') based '
  + 'on process.env.NODE_ENV (' + process.env.NODE_ENV  + ') does not exists');
  process.exit(2);
}

env.config({ path: dotEnvFilePath });

if (!process.env.CONTENTFUL_ACCESS_TOKEN) {
  console.log('Please, set the CONTENTFUL_ACCESS_TOKEN variable into the file: ' + dotEnvFilePath);
  process.exit(3);
}
accessToken = process.env.CONTENTFUL_ACCESS_TOKEN;

if (!process.env.CONTENTFUL_SPACE_ID) {
  console.log('Please, set the CONTENTFUL_SPACE_ID variable into the file: ' + dotEnvFilePath);
  process.exit(4);
}
spaceId = process.env.CONTENTFUL_SPACE_ID;

if (!process.env.NETLIFY_BUILD_HOOK_URL) {
  console.log('Please, set the NETLIFY_BUILD_HOOK_URL variable into the file: ' + dotEnvFilePath);
  process.exit(5);
}
netlifyBuildHookUrl = process.env.NETLIFY_BUILD_HOOK_URL;

if (!process.env.CONTENTFUL_WEB_HOOK_NAME) {
  console.log('Please, set the CONTENTFUL_WEB_HOOK_NAME variable into the file: ' + dotEnvFilePath);
  process.exit(5);
}
webHookName = process.env.CONTENTFUL_WEB_HOOK_NAME;

if (!process.env.CONTENTFUL_WEB_HOOK_ID) {
  console.log('Please, set the CONTENTFUL_WEB_HOOK_ID variable into the file: ' + dotEnvFilePath);
  process.exit(6);
}
webHookId = process.env.CONTENTFUL_WEB_HOOK_ID;

console.log('Contentful Access Token is set to: ' + accessToken);
console.log('Contentful Space Id is set to: ' + spaceId);
console.log('Contentful Web Hook Name is set to: ' + webHookName);
console.log('Contentful Web Hook ID is set to: ' + webHookId);
console.log('The Netlify Build Hook URL is: ' + netlifyBuildHookUrl + "\n\n");

const client = contentful.createClient({ accessToken: accessToken });

client.getSpace(spaceId)
.then((space) => {

    console.log("I'm creating the web hook");

    const options = {
        name: webHookName,
        url: netlifyBuildHookUrl,
        topics: [
            '*.publish',
            '*.unpublish'
        ]
    };
    
    space.createWebhookWithId(webHookId, options)
    .then((webhook) => {
        console.log("The web hook has been successfully created");
    })
    .catch((error) => { console.log(error); process.exit(7); });

}).catch((error) => { console.log(error); process.exit(8); });