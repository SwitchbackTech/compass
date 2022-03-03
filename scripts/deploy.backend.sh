# run on production VM where the build.zip was copied to
# requires root priviledges, so 'sudo su' before running

rm -rf /compass-calendar/build/backend.bak # remove old backup build
mv /compass-calendar/build/backend /compass-calendar/build/backend.bak # create new backup
mkdir -p /compass-calendar/build/backend
unzip -n -d /compass-calendar /home/***REMOVED***/backend.zip # creates compass-calendar/build/web
rm /home/***REMOVED***/backend.zip # already have a backup now, so delete this one
