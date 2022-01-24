# replaces old builds with new ones
# requires root priviledges
# run from the folder where the build.zip was copied to
rm -r /compass-calendar/prod/build.bak
mv /compass-calendar/prod/build /compass-calendar/prod/build.bak
unzip -n -d /compass-calendar/prod/ build.zip
mv build.zip build.zip.bak