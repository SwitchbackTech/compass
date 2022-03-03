# run on production VM where the build.zip was copied to
# requires root priviledges, so 'sudo su' before running

rm -rf /compass-calendar/build/web.bak # remove old backup build
mv /compass-calendar/build/web /compass-calendar/build/web.bak # create new backup
mkdir -p /compass-calendar/build/web
unzip -n -d /compass-calendar /home/***REMOVED***/web.zip # creates compass-calendar/build/web
rm /home/***REMOVED***/web.zip # already have a backup now, so delete this one

# restart web server to apply changes
systemctl restart nginx