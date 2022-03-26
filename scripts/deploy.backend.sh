# run on production VM where the build.zip was copied to
# requires root priviledges, so 'sudo su' before running

# remove existing pm2 service
#   not sure if this'll break on the first run,
#   before a backend service has been created
pm2 stop backend
pm2 delete backend

# delete old build
# TODO: save logs first
rm -rf /compass-calendar/build/backend
rm -rf /compass-calendar/build/core
mkdir -p /compass-calendar/build/backend

# creates compass-calendar/build/backend and ../build/core
unzip -n -d /compass-calendar /home/***REMOVED***/backend.zip

# cleanup
rm /home/***REMOVED***/backend.zip

# start
pm2 start yarn --name backend -- start:backend --update-env
pm2 save