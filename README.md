# A game built for the Global Game Jam 2024. Uses Flask in the backend, uses Tailwind and Alpine on the frontend.

## Building
Creating python
python3 -m virtualenv env
source env/bin/activate
pip3 install -r requirements.txt
modify config.yaml according to your situation (setting host to 0.0.0.0 should make the server open to your whole network)

Creating tailwind and other npm stuff (only tailwind stuff for now I think; alpine was built from source and dropped in static files)
npm init (if not a thing)
npm install

Creating .htpasswd
create the file
go to something like https://www.web2generators.com/apache-tools/htpasswd-generator
make the credentials and add to file (example is user | s3cr3t1!, so change it)

Running things
flask run --debug for dev, python3 app.py for local play over 0.0.0.0, or gunicorn for actually live stuff with nginx probably
npx tailwindcss -i ./static/src/app.css -o ./static/css/app.css (use --watch to watch)

## Playing
GET / | The Player route. For player interaction
GET /controller | The Controller route (requires login credentials based on htpasswd set)
GET /display | The Main Game Board/Screen/Display. For viewing the game actually