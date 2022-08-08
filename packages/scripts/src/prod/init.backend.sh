# temp file until this is built into cli
pm2 install pm2-logrotate  # enable log rotation, using defaults

# init pm2 process called `backend`, which runs the `yarn start:backend` script
cd /compass-calendar
pm2 start yarn --name backend -- start:backend

pm2 save    # save to synchronize
pm2 startup # run it on boot
pm2 logs    # confirm it's working
            # PS these logs are saved in /root/.pm2/logs