const Metalsmith  = require('metalsmith');
const contentful = require('contentful-management');
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

    console.log("I'm retrieving the settings fields:")
    console.log(settingsEntry.fields);
    console.log("\n");
    const settings = settingsEntry.fields.value[locale];

    space.getEntry('metadata')
    .then((metadataEntry) => {

      console.log("I'm retrieving the metadata fields:")
      console.log(metadataEntry.fields);
      console.log("\n");
      const metadata = metadataEntry.fields.value[locale];

      space.getEntry('plugins')
      .then((pluginsEntry) => {

        const plugins = pluginsEntry.fields.value[locale];
 
        if (fs.existsSync(settings.destination)) {
          console.log("I'm removing the previous destination directory: " + settings.destination + "\n");
          remove.removeSync(settings.destination);
        }    
        
        console.log("I'm creating the destination directory: " + settings.destination + "\n");
        fs.mkdirSync(settings.destination);
        
        console.log("I'm starting metalsmith with the following settings");
        console.log("The __dirname is: " + __dirname);
        console.log("Source: " + settings.source);
        console.log("Destination: " + settings.destination);
        console.log("\n");
        
        const metalSmith = Metalsmith(__dirname)
                           .metadata(metadata)
                           .source(settings.source)
                           .destination(settings.destination)
                           .clean(settings.clean);

        for (let i = 0; i < plugins.length; i++) {
          let plugin = plugins[i];
          instance = require(plugin.package);

          console.log("I'm adding the following plugin to Metalsmith:")
          console.log(plugin.package);
          console.log("with the following configurations:")
          console.log(plugin.configuration);
          console.log("\n");

          if (plugin.configuration) {
            metalSmith.use(instance(plugin.configuration));
          } else {
            metalSmith.use(instance());
          }
        }

        metalSmith.build(function(error) {
          if (error) {
            console.log(error);
            process.exit(7);
          } else {
            console.log("The web site has been correctly builded!");
            console.log("\n\n")
          }
        });

      }).catch((error) => { console.log(error); process.exit(8); });

    }).catch((error) => { console.log(error); process.exit(9); });

  }).catch((error) => { console.log(error); process.exit(10); });

}).catch((error) => { console.log(error); process.exit(11); });

