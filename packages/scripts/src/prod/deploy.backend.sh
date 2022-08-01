# run on production VM where the build.zip was copied to
# requires root priviledges, so 'sudo su' before running

# remove existing pm2 service
#   not sure if this'll break on the first run,
#   before a backend service has been created
pm2 stop backend
pm2 delete backend

# cleanup old build files
rm -rf /compass-calendar/build/backend
rm -rf /compass-calendar/build/core

# creates compass-calendar/build/backend and ../build/core
mkdir -p /compass-calendar/build/backend
unzip -n -d /compass-calendar /home/***REMOVED***/backend.zip
cp /compass-calendar/build/.env /compass-calendar/build/backend/

# cleanup build artifact
rm /home/***REMOVED***/backend.zip

# init
cd /compass-calendar/

# start
pm2 start yarn --name backend -- start:backend --update-env
pm2 save

# OLD STUFF 
# that you can delete 
# once sure you don't need

# export DEBUG=app*
# export NODE_ENV=production
# cd /compass-calendar/build
# node src/app.js