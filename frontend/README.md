open the folder in command line and run following command (if it fails you might need to install nodejs):
npm install
it will take some time and generate a folder called node_modules containing all modules you need to build the frontend project

once done you can build the src file by running following command:
npx webpack --progress

it will generate "app.js" file in dist folder, which is where all the functionality of frontend reside.