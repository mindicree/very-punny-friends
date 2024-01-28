A game built for the Global Game Jam 2024. Uses Flask in the backend, uses Tailwind and Alpine on the frontend.

Creating python
python3 -m virtualenv env
source env/bin/activate
pip3 install -r requirements.txt

Creating tailwind
npm init (if not a thing)
npm install

Creating .htpasswd
create the file
go to something like https://www.web2generators.com/apache-tools/htpasswd-generator
make the credentials and add to file

Running things
flask run OR python3 app.py OR gunicorn
npx tailwindcss -i ./static/src/app.css -o ./static/css/app.css (use --watch to watch)