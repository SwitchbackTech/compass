echo removing old backend service ...
pm2 stop backend
pm2 delete backend

echo cleaning old build ...
rm -rf /compass/build/node

echo extracting backend artifact ...
unzip -q -o -d /compass nodePckgs.zip

echo removing ZIP ...
rm nodePckgs.zip

echo starting backend ...
cd /compass/build/node # same dir as .env
pm2 start packages/backend/src/app.js --name backend --update-env

echo synchronizing pm2 ...
pm2 save

pm2 logs backend
