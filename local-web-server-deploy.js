const contentful = require('contentful-management')
const fs = require('fs');
const env = require('dotenv');
const sys = require('sys')
const execSync = require('child_process').execSync;

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

if (!process.env.CONTENTFUL_SPACE_ID) {
  console.log('Please, set the CONTENTFUL_SPACE_ID variable into the file: ' + dotEnvFilePath);
  process.exit(5);
}
const spaceId = process.env.CONTENTFUL_SPACE_ID;

if (!process.env.CONTENTFUL_LOCALE) {
  console.log('Please, set the CONTENTFUL_LOCALE variable into the file: ' + dotEnvFilePath);
  process.exit(6);
}
const locale = process.env.CONTENTFUL_LOCALE;

console.log('Contentful Access Token is set to: ' + accessToken);
console.log('Contentful Space Id is set to: ' + spaceId);
console.log('Contentful Locale is set to: ' + locale);

const client = contentful.createClient({ accessToken: accessToken });

function deploy(buildFolder, webServerFolder) {

  try {
    execSync('rm -Rf ' + webServerFolder + '/*');
  } catch (error) {
      console.log("I'm not able to remove files into the " + webServerFolder + " directory");
      console.log(error);
      process.exit(8);
  }

  if (fs.existsSync(buildFolder + '/post/index.html')) {
    try {
        execSync('mv ' + buildFolder + '/post/index.html ' + buildFolder + '/index.html');
    } catch (error) {
        console.log("I'm not able to move the index.html file");
        console.log(error);
        process.exit(9);
    }
  }

  try {
     execSync('\cp -Rf ' + buildFolder + '/* ' + webServerFolder + '/.');
  } catch (error) {
     console.log("I'm not able to copy the built files into the web server folder directory");
     console.log(error);
     process.exit(10);
  }
}

client.getSpace(spaceId)
.then((space) => {

  space.getEntry('settings')
  .then((settingsEntry) => {

    console.log("I'm retrieving the settings fields:");
    console.log(settingsEntry.fields);
    console.log("\n");

    space.getEntry('deploy')
    .then((deployEntry) => {

      console.log("I'm retrieving the deploy fields:");
      console.log(deployEntry.fields);
      console.log("\n");

      console.log("I'm deploying on local web server");
      const buildFolder = settingsEntry.fields.value[locale].destination;
      const webServerFolder = deployEntry.fields.value[locale].localWebServer.dir;
      deploy(buildFolder, webServerFolder);

    }).catch((error) => { console.log(error); process.exit(11); });

  }).catch((error) => { console.log(error); process.exit(11); });

}).catch((error) => { console.log(error); process.exit(12); });
