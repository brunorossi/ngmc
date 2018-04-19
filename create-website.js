const contentful = require('contentful-management');
const fs = require('fs');
const env = require('dotenv');
const yaml = require('js-yaml');
const request = require('request');

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

if (!process.env.NETLIFY_ACCESS_TOKEN) {
    console.log('Please, set the NETLIFY_ACCESS_TOKEN variable into the file: ' + dotEnvFilePath);
    process.exit(6);
}
const netlifyAccessToken = process.env.NETLIFY_ACCESS_TOKEN;

if (!process.env.CONTENTFUL_LOCALE) {
  console.log('Please, set the CONTENTFUL_LOCALE variable into the file: ' + dotEnvFilePath);
  process.exit(7);
}
const locale = process.env.CONTENTFUL_LOCALE;

console.log('Contentful Access Token is set to: ' + accessToken);
console.log('Contentful Space Id is set to: ' + spaceId);
console.log('The Contentful Locale is set to: ' + locale);
console.log('The Netlify Access Token is set to: ' + netlifyAccessToken);

const client = contentful.createClient({ accessToken: accessToken });

client.getSpace(spaceId)
.then((space) => {

  space.getEntry('deploy')
  .then((deployEntry) => {

    const deploySettings = deployEntry.fields.value[locale];
    const baseUrl = "https://api.netlify.com/api/v1";
    const createWebSiteUrl = baseUrl
                             + "/sites/?access_token="
                             + netlifyAccessToken;
    
    const deployKeyUrl = baseUrl
                         + "/deploy_keys/?access_token="
                         + netlifyAccessToken;
    
    request({
      url: deployKeyUrl,
      method: "POST",
      json: true
    }, function (error, response, deployKeyResponse) {

	console.log("The deploy Key is:");
    	console.log(deployKeyResponse);
	console.log("The content is:");
	console.log(deployKeyResponse.public_key);
	console.log("The key id is:");
	console.log(deployKeyResponse.id);
    	console.log("\n");

 	fs.writeFileSync("deploy-key.tmp", deployKeyResponse.public_key);
		
	deploySettings.netlify.site.repo.deploy_key_id = deployKeyResponse.id;

	console.log("The deploy Netlify Site settings are:");
    	console.log(deploySettings.netlify.site);
    	console.log("\n");

    	request({
      	    url: createWebSiteUrl,
            method: "POST",
            json: true,
            body: deploySettings.netlify.site
    	}, function (error, response, body) {

        console.log("I'm creating the site resource on Netlify");
        console.log("The response body is:");
        console.log(body);
        console.log("\n");

        if (error)  {
          console.log(error);
          process.exit(8);
        }

        const createWebHookRequestBody = {
          site_id: body.site_id,
          branch: deploySettings.netlify.buildHook.branch,
          title: deploySettings.netlify.buildHook.title
        };

        const createWebHookUrl = baseUrl
              		         + "/sites/"
                                 + body.site_id
                                 + "/build_hooks?access_token="
                                 + netlifyAccessToken;

        console.log("The deploy Netlify Build Hook settings are:");
        console.log(createWebHookRequestBody);
        console.log("\n");

        request({
          url: createWebHookUrl,
          method: "POST",
          json: true,
          body: createWebHookRequestBody
        }, function (error, response, body){

          console.log("I'm creating the build hook resource on Netlify");
          console.log("The response body is:");
          console.log(body);
          console.log("\n\n");

          if (error)  {
            console.log(error);
            process.exit(9);
          }

          console.log("I'm creating the Contentful web hook");
          console.log("The Contentful Web Hook Name is: " + deploySettings.contentful.webHook.name);
          console.log("The Contentful Web Hook Id is: " + deploySettings.contentful.webHook.id);

          const options = {
            name: deploySettings.contentful.webHook.name,
            url: body.url,
            topics: [
              '*.publish',
              '*.unpublish'
            ]};

          space.createWebhookWithId(deploySettings.contentful.webHook.id, options)
             .then((webhook) => {
                console.log("The Contentful web hook has been successfully created");
              }).catch((error) => { console.log(error); process.exit(9); });
        });
      });
    });
  }).catch((error) => { console.log(error); process.exit(10); });
}).catch((error) => { console.log(error); process.exit(11); });
