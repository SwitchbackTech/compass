echo removing old web files ...
rm -rf /compass/build/web

echo extracting new web files ...
unzip -o -d /compass web.zip
echo removing zip
rm web.zip

echo updating nginx
systemctl restart nginx
systemctl status nginx

echo done updating web