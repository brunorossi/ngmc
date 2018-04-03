const contentful = require('contentful-management')
const fs = require('fs');
const yaml = require('js-yaml');
const env = require('dotenv');
const remove = require('remove');
const argv = require('minimist')(process.argv.slice(2));

let mode = 'env';
let accessToken = '';
let spaceId = '';
let locale = '';

if (
  undefined !== argv.accessToken
  && '' !== argv.accessToken
  && undefined !== argv.spaceId
  && '' !== argv.spaceId
  && undefined !== argv.locale
  && '' !== argv.locale
) {
  console.log("Launching the script via command line arguments mode");
  accessToken = argv.accessToken;
  spaceId = argv.spaceId;
  locale = argv.locale;
  mode = 'argv';
}

if ('env' === mode) {

  console.log("Launching the script via .env file mode \n");

  console.log("To launch the script via command line arguments mode"
  + " you have to specify the following arguments: \n"
  + "--accessToken=<CONTENTFUL_ACCESS_TOKEN> \n"
  + "--spaceId=<CONTENTFUL_SPACE_ID> \n"
  + "--locale=<CONTENTFUL_LOCALE> \n");

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
  accessToken = process.env.CONTENTFUL_ACCESS_TOKEN;

  if (!process.env.CONTENTFUL_SPACE_ID) {
    console.log('Please, set the CONTENTFUL_SPACE_ID variable into the file: ' + dotEnvFilePath);
    process.exit(5);
    spaceId = process.env.CONTENTFUL_SPACE_ID;
  }
  spaceId = process.env.CONTENTFUL_SPACE_ID;

  if (!process.env.CONTENTFUL_LOCALE) {
    console.log('Please, set the CONTENTFUL_LOCALE variable into the file: ' + dotEnvFilePath);
    process.exit(6);
  }
  locale = process.env.CONTENTFUL_LOCALE;

}

console.log('Contentful Access Token is set to: ' + accessToken);
console.log('Contentful Space Id is set to: ' + spaceId);
console.log('Contentful Locale is set to: ' + locale + "\n\n");

const client = contentful.createClient({ accessToken: accessToken });

client.getSpace(spaceId)
.then((space) => {

  space.getEntry('settings')
  .then((settingsEntry) => {

    console.log("I'm reading settings from Contentful");
    console.log("Settings values are the following:");
    console.log(settingsEntry.fields);
    console.log("\n\n");

    const sourceDir = settingsEntry.fields.value[locale].source;
    
    if (fs.existsSync(sourceDir)) {
      console.log("I'm removing the previous source directory: " + sourceDir);
      remove.removeSync(sourceDir);
    }    
    
    console.log("I'm creating the source directory: " + sourceDir);
    fs.mkdirSync(sourceDir);

    space.getEntry('generation')
    .then((generationEntry) => {

        for (configKey in generationEntry.fields.value[locale]) {

          let settings = generationEntry.fields.value[locale][configKey];

          if ('simple' === settings.use.type) {              
            let yamlConfiguration = "---" + "\n" + yaml.safeDump(settings.configuration) + "---";
            let fileName = sourceDir + '/' + settings.file;
            fs.writeFileSync(fileName, yamlConfiguration);
            console.log("I generated the following file with Simple use");
            console.log('Configuration Key: ' + configKey);
            console.log('File Name: ' + fileName);
            console.log('File Content');
            console.log(yamlConfiguration);
            console.log("\n");
          }

          if ('loop' === settings.use.type) {
            space.getEntries({
              'content_type': settings.use.on
            }).then((entries) => {
                entries.items.forEach(function (entry) {
                  settings.configuration.title = entry.fields[settings.use.asTitle][locale];
                  let filterMatchKey = 'fields.'
                                       + settings.use.filter.field
                                       + '.sys.id['
                                       + settings.use.filter.operator
                                       + ']';
                  settings.configuration.contentful.filter = {};
                  settings.configuration.contentful.filter[filterMatchKey] = entry.fields.slug[locale];
                  settings.configuration.contentful.filter.order = settings.use.orderedBy;
                  let yamlConfiguration = "---" + "\n" + yaml.safeDump(settings.configuration) + "---";
                  let dirName = sourceDir + '/' + settings.use.on;
                  let fileName = dirName + '/' + entry.fields.slug[locale] + '.md';
                  if (!fs.existsSync(dirName)) {
                    fs.mkdirSync(dirName);
                  }
                  fs.writeFileSync(fileName, yamlConfiguration);
                  console.log("I generated the following file with Loop use");
                  console.log('Configuration Key: ' + configKey);
                  console.log('File Name: ' + fileName);
                  console.log('File Content');
                  console.log(yamlConfiguration);
                  console.log("\n");
                });
              });
            }
          }

          console.log("\n");

    }).catch((error) => { console.log(error); process.exit(7); });
    
  }).catch((error) => { console.log(error); process.exit(8); });

}).catch((error) => { console.log(error); process.exit(9); });
