# run on production VM where the build.zip was copied to
# requires root priviledges, so 'sudo su' before running

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
#pm2 start backend --update-env