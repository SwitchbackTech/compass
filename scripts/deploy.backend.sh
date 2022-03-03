# run on production VM where the build.zip was copied to
# requires root priviledges, so 'sudo su' before running

rm -rf /compass-calendar/build/backend.bak # remove old backup build
mv /compass-calendar/build/backend /compass-calendar/build/backend.bak # create new backup
mkdir -p /compass-calendar/build/backend

# creates compass-calendar/build/backend and ../build/core
unzip -n -d /compass-calendar /home/***REMOVED***/backend.zip 
rm /home/***REMOVED***/backend.zip # already have a backup now, so delete this one

# apply the changes
pm2 restart backend
