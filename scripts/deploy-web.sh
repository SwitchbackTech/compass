# replaces old builds with new ones
# requires root priviledges, so 'sudo su' before running
# run on production VM where the build.zip was copied to

rm -r /compass-calendar/prod/build.bak # remove old backup build
mv /compass-calendar/prod/build /compass-calendar/prod/build.bak # create new backup
unzip -n -d /compass-calendar/prod/ /home/***REMOVED***/build.zip
rm /home/***REMOVED***/build.zip # already have a backup now, so delete this one