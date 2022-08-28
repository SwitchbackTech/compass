# execute this on VM by running:
# 'bash <filename>' or 'chmod +x <filename> && ./<filename>'
rm -rf /compass/build/scripts
mkdir -p /compass/build/scripts
unzip -n -d /compass scripts.zip
rm scripts.zip
mv package.json /compass/build
cd /compass/build
npm install --production